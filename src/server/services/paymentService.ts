import crypto from "crypto";
import { Prisma, type PaymentRecord } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertTransition } from "../domain/bookingStatus";
import {
  paymentSuccessPostings,
  refundPostings,
  type LedgerPosting,
} from "../domain/postings";
import { getPaymentProvider } from "../payments/registry";
import type { PaymentIntentResult } from "../payments/types";
import { badRequest, conflict, notFound, type Session } from "../http";
import { recordAudit } from "../audit";

// Payment orchestration. Depends on the PaymentProvider interface only —
// never on a concrete gateway SDK.
//
// Concurrency model: every status transition is a compare-and-swap
// (`updateMany` conditioned on the expected current status, acting only when
// count === 1), and the ledger postings authorized by a CAS happen inside the
// same transaction as that CAS. Confirmation can arrive from three racing
// sources — gateway webhook, client status poll, reconciliation sweep — and
// all of them funnel into recordChargeSuccess / recordRefundSuccess, where
// the gates guarantee exactly-once financial effects.

export function insertPostings(
  tx: Prisma.TransactionClient,
  postings: LedgerPosting[],
): Promise<unknown> {
  // createMany keeps the postings a single statement inside the enclosing tx
  return tx.ledgerEntry.createMany({
    data: postings.map((p) => ({
      entryType: p.entryType,
      amountMinor: p.amountMinor,
      description: p.description,
      bookingId: p.bookingId ?? null,
      paymentRecordId: p.paymentRecordId ?? null,
      therapistId: p.therapistId ?? null,
      payoutId: p.payoutId ?? null,
    })),
  });
}

export function invoiceNumberFor(bookingId: string): string {
  return `INV-${new Date().getFullYear()}-${bookingId.slice(0, 6).toUpperCase()}`;
}

/**
 * Idempotency key for the Nth charge attempt on a booking. Each retry gets
 * its own key (and therefore its own provider-side order), while concurrent
 * requests for the same attempt converge on one PaymentRecord.
 */
export function chargeIdempotencyKey(bookingId: string, attempt = 1): string {
  return `charge:${bookingId}:${attempt}`;
}

/** Provider-safe correlation id (alphanumeric) derived from an idempotency key. */
function correlationId(prefix: string, idempotencyKey: string): string {
  return (
    prefix +
    crypto
      .createHash("sha256")
      .update(idempotencyKey)
      .digest("hex")
      .slice(0, 32)
  );
}

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
}

function parseRecordMetadata(
  record: PaymentRecord,
): Record<string, unknown> | null {
  if (!record.metadata) return null;
  try {
    return JSON.parse(record.metadata) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Reconstruct the client's next step from a persisted PaymentRecord. */
export function clientActionForRecord(
  record: PaymentRecord,
): PaymentIntentResult["clientAction"] {
  const meta = parseRecordMetadata(record);
  if (meta && typeof meta.checkoutUrl === "string" && meta.checkoutUrl) {
    return {
      type: "checkout",
      payload: { checkoutUrl: meta.checkoutUrl, expireAt: meta.expireAt },
    };
  }
  return { type: "none" };
}

export interface CreateChargeResult {
  record: PaymentRecord;
  clientAction: PaymentIntentResult["clientAction"];
}

/**
 * Create a charge attempt (payment intent) for a booking through the
 * configured provider. Idempotent on idempotencyKey: retrying returns the
 * existing record (with its clientAction reconstructed from persisted
 * metadata) instead of creating a duplicate — including when two concurrent
 * callers race past the existence check (the unique constraint decides, the
 * loser converges on the winner's row).
 */
export async function createCharge(input: {
  bookingId: string;
  idempotencyKey: string;
  providerName?: string;
  tx?: Prisma.TransactionClient;
}): Promise<CreateChargeResult> {
  const db = input.tx ?? prisma;
  const existing = await db.paymentRecord.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) {
    return { record: existing, clientAction: clientActionForRecord(existing) };
  }

  const booking = await db.booking.findUnique({
    where: { id: input.bookingId },
    include: { client: true },
  });
  if (!booking) throw notFound("Booking not found");

  const provider = getPaymentProvider(input.providerName);
  const intent = await provider.createIntent({
    bookingId: booking.id,
    amountMinor: booking.amountMinor - booking.discountMinor,
    currency: booking.currency,
    customer: {
      name: booking.client.name,
      email: booking.client.email,
      phone: booking.client.phone,
    },
    idempotencyKey: input.idempotencyKey,
    metadata: {
      bookingId: booking.id,
      bookingExpiresAt: booking.expiresAt?.toISOString() ?? "",
    },
  });

  try {
    const record = await db.paymentRecord.create({
      data: {
        bookingId: booking.id,
        provider: provider.name,
        kind: "CHARGE",
        amountMinor: booking.amountMinor - booking.discountMinor,
        currency: booking.currency,
        status: "CREATED",
        providerOrderId: intent.providerOrderId,
        idempotencyKey: input.idempotencyKey,
        metadata: intent.metadata ? JSON.stringify(intent.metadata) : null,
      },
    });
    return { record, clientAction: intent.clientAction };
  } catch (err) {
    // Concurrent caller won the unique(idempotencyKey) race after both
    // passed the existence check — converge on their row. (Deterministic
    // provider order ids mean both createIntent calls referenced the same
    // provider-side order, so nothing was double-created there either.)
    if (isUniqueViolation(err)) {
      const winner = await db.paymentRecord.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (winner) {
        return { record: winner, clientAction: clientActionForRecord(winner) };
      }
    }
    throw err;
  }
}

/**
 * Record a successful charge: marks the PaymentRecord SUCCEEDED, posts the
 * revenue/commission ledger entries, rolls the booking forward and stamps an
 * invoice number — all in one transaction.
 *
 * This is THE single confirmation path; webhooks, status polls and the
 * reconciliation sweep all call it, possibly concurrently:
 *  - A CAS on the PaymentRecord row (CREATED/PROCESSING/FAILED → SUCCEEDED)
 *    picks exactly one winner; losers return without side effects. FAILED is
 *    deliberately included — a provider-confirmed success outranks an
 *    earlier local failure mark.
 *  - The booking transition is a CAS too (PENDING/AWAITING_PAYMENT →
 *    CONFIRMED). When it misses, the authoritative state is re-read and the
 *    late-success / duplicate-payment branches apply — a paid booking is
 *    never clobbered and money is never dropped on the floor.
 */
export async function recordChargeSuccess(input: {
  paymentRecordId: string;
  providerPaymentId: string;
  providerRef?: string;
  actor?: Session | null;
}) {
  return prisma.$transaction(async (tx) => {
    const record = await tx.paymentRecord.findUnique({
      where: { id: input.paymentRecordId },
      include: { booking: true },
    });
    if (!record) throw notFound("Payment record not found");
    if (record.kind !== "CHARGE") throw badRequest("Not a charge record");

    // CAS gate: exactly one confirmer proceeds past this line.
    const gate = await tx.paymentRecord.updateMany({
      where: {
        id: record.id,
        status: { in: ["CREATED", "PROCESSING", "FAILED"] },
      },
      data: {
        status: "SUCCEEDED",
        providerPaymentId: input.providerPaymentId,
        // undefined leaves the column untouched (gateway order refs live here)
        providerRef: input.providerRef ?? undefined,
      },
    });
    if (gate.count === 0) return record; // replay / lost the race — no-op

    // Defense in depth: never double-post even if a record were reset.
    const alreadyPosted = await tx.ledgerEntry.findFirst({
      where: { paymentRecordId: record.id, entryType: "GROSS_REVENUE" },
    });
    if (alreadyPosted) return record;

    const booking = record.booking;
    const invoiceNumber = booking.invoiceNumber ?? invoiceNumberFor(booking.id);
    const actorType = input.actor ? input.actor.role : "SYSTEM";

    const postSuccessLedger = () =>
      insertPostings(
        tx,
        paymentSuccessPostings({
          bookingId: booking.id,
          paymentRecordId: record.id,
          therapistId: booking.therapistId,
          grossMinor: booking.amountMinor,
          discountMinor: booking.discountMinor,
          taxMinor: booking.taxMinor,
          commissionBps: booking.commissionBps,
          invoiceNumber,
        }),
      );

    // Normal path: CAS the booking into CONFIRMED.
    const confirmed = await tx.booking.updateMany({
      where: {
        id: booking.id,
        status: { in: ["PENDING", "AWAITING_PAYMENT"] },
      },
      data: {
        status: "CONFIRMED",
        paymentStatus: "PAID",
        invoiceNumber,
        expiresAt: null,
      },
    });

    if (confirmed.count === 1) {
      await postSuccessLedger();
      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          fromStatus: booking.status,
          toStatus: "CONFIRMED",
          actorType,
          actorId: input.actor?.userId ?? null,
          reason: "Payment collected",
        },
      });
    } else {
      // CAS missed — read what actually happened and branch.
      const current = await tx.booking.findUniqueOrThrow({
        where: { id: booking.id },
      });

      if (current.paymentStatus === "PAID") {
        // Duplicate payment: the booking was already paid through another
        // charge. Keep this record SUCCEEDED (money really moved) but post
        // nothing — flag it for an out-of-band gateway refund instead.
        const meta = parseRecordMetadata(record) ?? {};
        await tx.paymentRecord.update({
          where: { id: record.id },
          data: {
            metadata: JSON.stringify({ ...meta, duplicatePayment: true }),
          },
        });
        await recordAudit(
          {
            session: input.actor ?? null,
            action: "payment.duplicate_charge",
            entityType: "PaymentRecord",
            entityId: record.id,
            detail: {
              bookingId: booking.id,
              providerPaymentId: input.providerPaymentId,
            },
          },
          tx,
        );
        return tx.paymentRecord.findUniqueOrThrow({
          where: { id: record.id },
        });
      }

      if (current.status === "CANCELLED") {
        // Late success: the reservation TTL expired (slot already released)
        // and the payment landed afterwards. Post the ledger — the money
        // genuinely arrived — and route the booking to REFUND_PENDING so an
        // admin refunds it. The slot is NOT re-held.
        assertTransition(current.status, "REFUND_PENDING");
        await postSuccessLedger();
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: "REFUND_PENDING",
            paymentStatus: "PAID",
            invoiceNumber,
          },
        });
        await tx.bookingStatusHistory.create({
          data: {
            bookingId: booking.id,
            fromStatus: current.status,
            toStatus: "REFUND_PENDING",
            actorType: "SYSTEM",
            reason:
              "Payment succeeded after the reservation expired — refund required",
          },
        });
        await recordAudit(
          {
            session: input.actor ?? null,
            action: "payment.late_success",
            entityType: "Booking",
            entityId: booking.id,
            detail: {
              paymentRecordId: record.id,
              providerPaymentId: input.providerPaymentId,
            },
          },
          tx,
        );
        return tx.paymentRecord.findUniqueOrThrow({
          where: { id: record.id },
        });
      }

      // Already CONFIRMED/COMPLETED/NO_SHOW but unpaid (e.g. pay-at-clinic
      // settled online later): post revenue and mark paid, no status change.
      await postSuccessLedger();
      await tx.booking.update({
        where: { id: booking.id },
        data: { paymentStatus: "PAID", invoiceNumber, expiresAt: null },
      });
    }

    await recordAudit(
      {
        session: input.actor ?? null,
        action: "payment.charge_succeeded",
        entityType: "PaymentRecord",
        entityId: record.id,
        detail: {
          bookingId: booking.id,
          providerPaymentId: input.providerPaymentId,
        },
      },
      tx,
    );

    return tx.paymentRecord.findUniqueOrThrow({ where: { id: record.id } });
  });
}

/**
 * Record a failed/aborted charge attempt. The booking is deliberately left
 * untouched: an AWAITING_PAYMENT reservation stays alive for a retry until
 * its TTL lapses (releaseExpiredReservations then frees the slot).
 * CAS-gated, so a failure mark can never overwrite a success.
 */
export async function recordChargeFailure(input: {
  paymentRecordId: string;
  reason?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const record = await tx.paymentRecord.findUnique({
      where: { id: input.paymentRecordId },
    });
    if (!record) throw notFound("Payment record not found");
    if (record.kind !== "CHARGE") throw badRequest("Not a charge record");

    const gate = await tx.paymentRecord.updateMany({
      where: { id: record.id, status: { in: ["CREATED", "PROCESSING"] } },
      data: {
        status: "FAILED",
        failureReason: input.reason ?? "Payment failed",
      },
    });
    if (gate.count === 0) return record;

    await recordAudit(
      {
        session: null,
        action: "payment.charge_failed",
        entityType: "PaymentRecord",
        entityId: record.id,
        detail: { bookingId: record.bookingId, reason: input.reason },
      },
      tx,
    );
    return tx.paymentRecord.findUniqueOrThrow({ where: { id: record.id } });
  });
}

/**
 * Record a fee collected off-platform (cash / UPI / card machine at the
 * clinic) against an existing unpaid booking — the front desk's counterpart
 * to the `paymentReceived` flag on staff scheduling.
 *
 * The payment is booked through the `manual` provider, pinned explicitly so
 * an in-person collection never opens an order at the real gateway, and
 * finalised through recordChargeSuccess — so GROSS_REVENUE / commission /
 * platform postings, the invoice number and the paymentStatus rollup all
 * follow the exact same, idempotent path as a gateway payment.
 *
 * Concurrency: the attempt number is derived from the existing charge count,
 * so two desks recording the same fee simultaneously either converge on one
 * idempotency key (no duplicate record) or land in recordChargeSuccess's
 * duplicate-payment branch, which posts nothing twice and audits the anomaly.
 */
export async function recordManualPayment(input: {
  bookingId: string;
  reference?: string;
  session: Session;
  ip?: string;
}) {
  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    select: { id: true, status: true, paymentStatus: true },
  });
  if (!booking) throw notFound("Booking not found");
  if (booking.paymentStatus === "PAID") {
    throw conflict("This appointment is already marked paid");
  }
  if (booking.paymentStatus === "REFUNDED") {
    throw conflict("This appointment has been refunded");
  }
  if (["CANCELLED", "REFUND_PENDING", "REFUNDED"].includes(booking.status)) {
    throw conflict(
      `A ${booking.status.toLowerCase().replace(/_/g, " ")} appointment cannot take a desk payment`,
    );
  }

  const attempts = await prisma.paymentRecord.count({
    where: { bookingId: booking.id, kind: "CHARGE" },
  });
  const { record } = await createCharge({
    bookingId: booking.id,
    idempotencyKey: chargeIdempotencyKey(booking.id, attempts + 1),
    providerName: "manual",
  });

  const providerRef = input.reference?.trim() || undefined;
  const settled = await recordChargeSuccess({
    paymentRecordId: record.id,
    providerPaymentId: providerRef ?? `manual-${booking.id.slice(0, 12)}`,
    providerRef,
    actor: input.session,
  });

  await recordAudit({
    session: input.session,
    action: "payment.recorded_at_desk",
    entityType: "Booking",
    entityId: booking.id,
    detail: { paymentRecordId: record.id, reference: providerRef ?? null },
    ip: input.ip,
  });

  return settled;
}

/**
 * Initiate a refund for a booking sitting in REFUND_PENDING.
 *
 * Two-phase, async-gateway-correct:
 *  1. Inside a transaction that takes a row lock on the booking (FOR UPDATE
 *     serializes concurrent admins — even with different amounts), validate
 *     and create the REFUND PaymentRecord as CREATED, with its provider
 *     correlation id (merchantRefundId) persisted BEFORE any network call so
 *     a crash mid-call is always reconcilable.
 *  2. Call the provider. Synchronous providers (manual) complete immediately
 *     via recordRefundSuccess; async gateways (PhonePe) leave the record
 *     PROCESSING and the booking REFUND_PENDING until the refund webhook or
 *     a reconciliation poll finalizes it. Ledger reversal is posted only on
 *     confirmed completion — never on initiation.
 */
export async function executeRefund(input: {
  bookingId: string;
  amountMinor?: number; // defaults to full collected amount
  reason?: string;
  session: Session;
}) {
  const staleCutoff = new Date(Date.now() - 15 * 60000);

  const prepared = await prisma.$transaction(async (tx) => {
    // Serialize concurrent refund executions on this booking.
    await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${input.bookingId} FOR UPDATE`;

    const booking = await tx.booking.findUnique({
      where: { id: input.bookingId },
    });
    if (!booking) throw notFound("Booking not found");
    if (booking.status !== "REFUND_PENDING") {
      throw conflict(
        "Booking must be in REFUND_PENDING before a refund can be executed",
      );
    }

    const charge = await tx.paymentRecord.findFirst({
      where: { bookingId: booking.id, kind: "CHARGE", status: "SUCCEEDED" },
      orderBy: { createdAt: "desc" },
    });
    if (!charge || !charge.providerPaymentId) {
      throw conflict("No successful payment exists for this booking");
    }

    // Original economics must exist in the immutable ledger.
    const commissionEntry = await tx.ledgerEntry.findFirst({
      where: { paymentRecordId: charge.id, entryType: "COMMISSION_ACCRUED" },
    });
    if (!commissionEntry) {
      throw conflict("Ledger entries for the original payment are missing");
    }

    const originalNetMinor =
      booking.amountMinor - booking.discountMinor - booking.taxMinor;
    const refundMinor = input.amountMinor ?? originalNetMinor;
    if (refundMinor <= 0 || refundMinor > originalNetMinor) {
      throw badRequest(
        "Refund amount must be positive and within the collected amount",
      );
    }

    // Abandoned CREATED records (crash before the provider call was
    // recorded) are resolvable via their persisted merchantRefundId — the
    // reconciliation sweep polls them. Only genuinely fresh in-flight
    // records block a new execution.
    const inflight = await tx.paymentRecord.findFirst({
      where: {
        bookingId: booking.id,
        kind: "REFUND",
        OR: [
          { status: "PROCESSING" },
          { status: "CREATED", createdAt: { gte: staleCutoff } },
        ],
      },
    });
    if (inflight) {
      throw conflict(
        "A refund is already in progress for this booking. Wait for it to settle (or for reconciliation to resolve it) before retrying.",
      );
    }

    const failedAttempts = await tx.paymentRecord.count({
      where: { bookingId: booking.id, kind: "REFUND", status: "FAILED" },
    });
    const staleAttempts = await tx.paymentRecord.count({
      where: {
        bookingId: booking.id,
        kind: "REFUND",
        status: "CREATED",
        createdAt: { lt: staleCutoff },
      },
    });
    const attempt = 1 + failedAttempts + staleAttempts;
    const idempotencyKey = `refund:${booking.id}:${refundMinor}:${attempt}`;
    const merchantRefundId = correlationId("RF", idempotencyKey);

    const refundRecord = await tx.paymentRecord.create({
      data: {
        bookingId: booking.id,
        provider: charge.provider,
        kind: "REFUND",
        amountMinor: refundMinor,
        currency: booking.currency,
        status: "CREATED",
        providerOrderId: merchantRefundId,
        idempotencyKey,
        metadata: input.reason
          ? JSON.stringify({ reason: input.reason })
          : null,
      },
    });

    return { refundRecord, charge, refundMinor };
  });

  const { refundRecord, charge, refundMinor } = prepared;
  const provider = getPaymentProvider(charge.provider);
  const result = await provider.refund({
    providerPaymentId: charge.providerPaymentId!,
    providerOrderId: charge.providerOrderId ?? undefined,
    merchantRefundId: refundRecord.providerOrderId ?? undefined,
    amountMinor: refundMinor,
    idempotencyKey: refundRecord.idempotencyKey!,
    reason: input.reason,
  });

  if (result.ok === false) {
    await recordRefundFailure({
      paymentRecordId: refundRecord.id,
      reason: result.reason,
    });
    throw conflict(`Refund failed: ${result.reason}`);
  }

  if (result.status === "SUCCEEDED") {
    return recordRefundSuccess({
      paymentRecordId: refundRecord.id,
      providerRefundId: result.providerRefundId,
      actor: input.session,
    });
  }

  // Async gateway: refund accepted, completion arrives via webhook/poll.
  await prisma.paymentRecord.updateMany({
    where: { id: refundRecord.id, status: "CREATED" },
    data: {
      status: "PROCESSING",
      providerPaymentId: result.providerRefundId,
      providerOrderId: result.merchantRefundId ?? refundRecord.providerOrderId,
    },
  });
  await recordAudit({
    session: input.session,
    action: "payment.refund_initiated",
    entityType: "Booking",
    entityId: input.bookingId,
    detail: { refundMinor, reason: input.reason },
  });
  return prisma.paymentRecord.findUniqueOrThrow({
    where: { id: refundRecord.id },
  });
}

/**
 * Finalize a confirmed refund: reversal ledger postings (originals stay
 * immutable), booking → REFUNDED, slot freed. Called by the sync provider
 * path, the refund webhook and the reconciliation sweep — the CAS gate makes
 * concurrent finalizers post the reversal exactly once.
 */
export async function recordRefundSuccess(input: {
  paymentRecordId: string;
  providerRefundId?: string;
  actor?: Session | null;
}) {
  return prisma.$transaction(async (tx) => {
    const record = await tx.paymentRecord.findUnique({
      where: { id: input.paymentRecordId },
      include: { booking: true },
    });
    if (!record) throw notFound("Refund record not found");
    if (record.kind !== "REFUND") throw badRequest("Not a refund record");

    const gate = await tx.paymentRecord.updateMany({
      where: { id: record.id, status: { in: ["CREATED", "PROCESSING"] } },
      data: {
        status: "SUCCEEDED",
        providerPaymentId: input.providerRefundId ?? undefined,
      },
    });
    if (gate.count === 0) return record; // replay — reversal already posted

    const booking = record.booking;
    const charge = await tx.paymentRecord.findFirst({
      where: { bookingId: booking.id, kind: "CHARGE", status: "SUCCEEDED" },
      orderBy: { createdAt: "desc" },
    });
    const commissionEntry = charge
      ? await tx.ledgerEntry.findFirst({
          where: {
            paymentRecordId: charge.id,
            entryType: "COMMISSION_ACCRUED",
          },
        })
      : null;
    if (!charge || !commissionEntry) {
      throw conflict("Ledger entries for the original payment are missing");
    }

    const originalNetMinor =
      booking.amountMinor - booking.discountMinor - booking.taxMinor;
    const meta = parseRecordMetadata(record);
    const reason = typeof meta?.reason === "string" ? meta.reason : undefined;

    await insertPostings(
      tx,
      refundPostings({
        bookingId: booking.id,
        paymentRecordId: record.id,
        therapistId: booking.therapistId,
        refundMinor: record.amountMinor,
        originalNetMinor,
        originalCommissionMinor: commissionEntry.amountMinor,
        reason,
      }),
    );

    // CAS the booking to REFUNDED. A miss means someone moved it off
    // REFUND_PENDING while the refund processed (transitionBooking guards
    // against this, so it's a belt-and-braces path) — the money left
    // regardless, so paymentStatus must still flip and the anomaly is
    // audited for staff follow-up.
    const moved = await tx.booking.updateMany({
      where: { id: booking.id, status: "REFUND_PENDING" },
      data: { status: "REFUNDED", paymentStatus: "REFUNDED" },
    });
    if (moved.count === 1) {
      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          fromStatus: "REFUND_PENDING",
          toStatus: "REFUNDED",
          actorType: input.actor ? input.actor.role : "SYSTEM",
          actorId: input.actor?.userId ?? null,
          reason: reason ?? "Refund completed",
        },
      });
      // A refunded session frees the calendar slot.
      await tx.bookingSlot.deleteMany({ where: { bookingId: booking.id } });
    } else {
      await tx.booking.update({
        where: { id: booking.id },
        data: { paymentStatus: "REFUNDED" },
      });
      await recordAudit(
        {
          session: input.actor ?? null,
          action: "payment.refund_completed_after_reject",
          entityType: "Booking",
          entityId: booking.id,
          detail: { paymentRecordId: record.id },
        },
        tx,
      );
    }

    await recordAudit(
      {
        session: input.actor ?? null,
        action: "payment.refund_executed",
        entityType: "Booking",
        entityId: booking.id,
        detail: { refundMinor: record.amountMinor, reason },
      },
      tx,
    );

    return tx.paymentRecord.findUniqueOrThrow({ where: { id: record.id } });
  });
}

/**
 * Record a provider-confirmed refund failure. The booking stays
 * REFUND_PENDING (no reversal was posted) so an admin can re-execute; the
 * FAILED record with its failureReason is the admin-facing signal.
 */
export async function recordRefundFailure(input: {
  paymentRecordId: string;
  reason?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const record = await tx.paymentRecord.findUnique({
      where: { id: input.paymentRecordId },
    });
    if (!record) throw notFound("Refund record not found");
    if (record.kind !== "REFUND") throw badRequest("Not a refund record");

    const gate = await tx.paymentRecord.updateMany({
      where: { id: record.id, status: { in: ["CREATED", "PROCESSING"] } },
      data: {
        status: "FAILED",
        failureReason: input.reason ?? "Refund failed",
      },
    });
    if (gate.count === 0) return record;

    await recordAudit(
      {
        session: null,
        action: "payment.refund_failed",
        entityType: "PaymentRecord",
        entityId: record.id,
        detail: { bookingId: record.bookingId, reason: input.reason },
      },
      tx,
    );
    return tx.paymentRecord.findUniqueOrThrow({ where: { id: record.id } });
  });
}

/**
 * Webhook ingestion. Deduplicates on the provider's event id so replays are
 * recorded but never re-processed — with one refinement: an event whose
 * previous processing FAILED is re-armed and processed again on redelivery
 * (gateway retries are then genuinely useful, not just journaled).
 *
 * Handler outcomes that reflect provider-vs-ledger disagreement (missing
 * record, amount mismatch) return 200 with the event marked FAILED, so the
 * gateway doesn't retry-storm something a retry cannot fix; genuine
 * infrastructure errors rethrow → non-2xx → the gateway retries.
 */
export async function processWebhook(
  providerName: string,
  rawBody: string,
  headers: Record<string, string>,
) {
  const provider = getPaymentProvider(providerName);
  const parsed = await provider.parseWebhook(rawBody, headers); // throws on bad signature

  const eventWhere = {
    provider_externalId: {
      provider: provider.name,
      externalId: parsed.externalId,
    },
  };

  try {
    await prisma.webhookEvent.create({
      data: {
        provider: provider.name,
        externalId: parsed.externalId,
        eventType: parsed.eventType,
        payload: rawBody,
      },
    });
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    // Redelivery. Re-arm only if the previous attempt failed.
    const rearmed = await prisma.webhookEvent.updateMany({
      where: {
        provider: provider.name,
        externalId: parsed.externalId,
        status: "FAILED",
      },
      data: { status: "RECEIVED", error: null },
    });
    if (rearmed.count === 0) {
      return { status: "SKIPPED" as const, reason: "duplicate event" };
    }
  }

  const failEvent = async (error: string) => {
    await prisma.webhookEvent.update({
      where: eventWhere,
      data: { status: "FAILED", error },
    });
    return { status: "FAILED" as const, reason: error };
  };

  try {
    if (parsed.status === "SUCCEEDED" && parsed.providerOrderId) {
      const record = await prisma.paymentRecord.findFirst({
        where: {
          provider: provider.name,
          providerOrderId: parsed.providerOrderId,
          kind: "CHARGE",
        },
      });
      if (!record) return await failEvent("No matching charge record");
      if (!parsed.providerPaymentId) {
        return await failEvent("Success event carried no payment id");
      }
      if (
        parsed.amountMinor != null &&
        parsed.amountMinor !== record.amountMinor
      ) {
        await recordAudit({
          session: null,
          action: "payment.amount_mismatch",
          entityType: "PaymentRecord",
          entityId: record.id,
          detail: {
            expectedMinor: record.amountMinor,
            reportedMinor: parsed.amountMinor,
            externalId: parsed.externalId,
          },
        });
        return await failEvent(
          `AMOUNT_MISMATCH: expected ${record.amountMinor}, provider reported ${parsed.amountMinor}`,
        );
      }
      await recordChargeSuccess({
        paymentRecordId: record.id,
        providerPaymentId: parsed.providerPaymentId,
      });
    } else if (parsed.status === "FAILED" && parsed.providerOrderId) {
      const record = await prisma.paymentRecord.findFirst({
        where: {
          provider: provider.name,
          providerOrderId: parsed.providerOrderId,
          kind: "CHARGE",
        },
      });
      if (record) {
        await recordChargeFailure({
          paymentRecordId: record.id,
          reason: `Provider reported failure (${parsed.eventType})`,
        });
      }
    } else if (parsed.status === "REFUNDED" && parsed.providerOrderId) {
      const record = await prisma.paymentRecord.findFirst({
        where: {
          provider: provider.name,
          providerOrderId: parsed.providerOrderId,
          kind: "REFUND",
        },
      });
      if (!record) return await failEvent("No matching refund record");
      await recordRefundSuccess({
        paymentRecordId: record.id,
        providerRefundId: parsed.providerPaymentId,
      });
    } else if (parsed.status === "REFUND_FAILED" && parsed.providerOrderId) {
      const record = await prisma.paymentRecord.findFirst({
        where: {
          provider: provider.name,
          providerOrderId: parsed.providerOrderId,
          kind: "REFUND",
        },
      });
      if (record) {
        await recordRefundFailure({
          paymentRecordId: record.id,
          reason: `Provider reported refund failure (${parsed.eventType})`,
        });
      }
    }
    // PENDING / IGNORED: journal only.

    await prisma.webhookEvent.update({
      where: eventWhere,
      data: { status: "PROCESSED", processedAt: new Date() },
    });
    return { status: "PROCESSED" as const };
  } catch (err) {
    await prisma.webhookEvent.update({
      where: eventWhere,
      data: {
        status: "FAILED",
        error: err instanceof Error ? err.message : String(err),
      },
    });
    throw err; // non-2xx → gateway retries → re-armed above
  }
}
