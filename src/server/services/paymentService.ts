import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertTransition } from "../domain/bookingStatus";
import {
  paymentSuccessPostings,
  refundPostings,
  type LedgerPosting,
} from "../domain/postings";
import { getPaymentProvider } from "../payments/registry";
import { badRequest, conflict, notFound, type Session } from "../http";
import { recordAudit } from "../audit";

// Payment orchestration. Depends on the PaymentProvider interface only —
// never on a concrete gateway SDK. All financial writes happen inside a
// single transaction with the payment/booking state change, and every entry
// point is idempotent so retries and webhook replays cannot double-post.

export async function insertPostings(
  tx: Prisma.TransactionClient,
  postings: LedgerPosting[],
): Promise<void> {
  // createMany keeps the postings a single statement inside the enclosing tx
  await tx.ledgerEntry.createMany({
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
 * Create a charge attempt (payment intent) for a booking through the
 * configured provider. Idempotent on idempotencyKey: retrying returns the
 * existing record instead of creating a duplicate.
 */
export async function createCharge(input: {
  bookingId: string;
  idempotencyKey: string;
  providerName?: string;
  tx?: Prisma.TransactionClient;
}) {
  const db = input.tx ?? prisma;
  const existing = await db.paymentRecord.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) return existing;

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
  });

  return db.paymentRecord.create({
    data: {
      bookingId: booking.id,
      provider: provider.name,
      kind: "CHARGE",
      amountMinor: booking.amountMinor - booking.discountMinor,
      currency: booking.currency,
      status: "CREATED",
      providerOrderId: intent.providerOrderId,
      idempotencyKey: input.idempotencyKey,
    },
  });
}

/**
 * Record a successful charge: marks the PaymentRecord SUCCEEDED, posts the
 * revenue/commission ledger entries, rolls the booking to CONFIRMED and
 * stamps an invoice number — all in one transaction.
 *
 * Idempotent: a record that is already SUCCEEDED (or a ledger that already
 * has postings for it) is returned untouched.
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

    if (record.status === "SUCCEEDED") return record; // idempotent replay

    const alreadyPosted = await tx.ledgerEntry.findFirst({
      where: { paymentRecordId: record.id, entryType: "GROSS_REVENUE" },
    });
    if (alreadyPosted) return record;

    const booking = record.booking;
    const invoiceNumber = booking.invoiceNumber ?? invoiceNumberFor(booking.id);

    const updated = await tx.paymentRecord.update({
      where: { id: record.id },
      data: {
        status: "SUCCEEDED",
        providerPaymentId: input.providerPaymentId,
        providerRef: input.providerRef ?? null,
      },
    });

    await insertPostings(
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

    const bookingUpdate: Prisma.BookingUpdateInput = {
      paymentStatus: "PAID",
      invoiceNumber,
      expiresAt: null,
    };
    if (booking.status === "PENDING" || booking.status === "AWAITING_PAYMENT") {
      assertTransition(booking.status, "CONFIRMED");
      bookingUpdate.status = "CONFIRMED";
      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          fromStatus: booking.status,
          toStatus: "CONFIRMED",
          actorType: input.actor ? input.actor.role : "SYSTEM",
          actorId: input.actor?.userId ?? null,
          reason: "Payment collected",
        },
      });
    }
    await tx.booking.update({ where: { id: booking.id }, data: bookingUpdate });

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

    return updated;
  });
}

/**
 * Execute a refund for a booking sitting in REFUND_PENDING. Posts reversal
 * entries (originals stay immutable), creates a REFUND PaymentRecord and
 * rolls the booking to REFUNDED. Idempotent on the refund idempotency key.
 */
export async function executeRefund(input: {
  bookingId: string;
  amountMinor?: number; // defaults to full collected amount
  reason?: string;
  session: Session;
}) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: input.bookingId },
      include: { slot: true },
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

    // Original economics from the immutable ledger, not recomputed rates.
    const [grossEntry, commissionEntry] = await Promise.all([
      tx.ledgerEntry.findFirst({
        where: { paymentRecordId: charge.id, entryType: "GROSS_REVENUE" },
      }),
      tx.ledgerEntry.findFirst({
        where: { paymentRecordId: charge.id, entryType: "COMMISSION_ACCRUED" },
      }),
    ]);
    if (!grossEntry || !commissionEntry)
      throw conflict("Ledger entries for the original payment are missing");

    const originalNetMinor =
      booking.amountMinor - booking.discountMinor - booking.taxMinor;
    const refundMinor = input.amountMinor ?? originalNetMinor;
    if (refundMinor <= 0 || refundMinor > originalNetMinor) {
      throw badRequest(
        "Refund amount must be positive and within the collected amount",
      );
    }

    const idempotencyKey = `refund:${booking.id}:${refundMinor}`;
    const existing = await tx.paymentRecord.findUnique({
      where: { idempotencyKey },
    });
    if (existing && existing.status === "SUCCEEDED") return existing; // replay

    const provider = getPaymentProvider(charge.provider);
    const result = await provider.refund({
      providerPaymentId: charge.providerPaymentId,
      amountMinor: refundMinor,
      idempotencyKey,
      reason: input.reason,
    });
    if (result.ok === false) throw conflict(`Refund failed: ${result.reason}`);

    const refundRecord =
      existing ??
      (await tx.paymentRecord.create({
        data: {
          bookingId: booking.id,
          provider: charge.provider,
          kind: "REFUND",
          amountMinor: refundMinor,
          currency: booking.currency,
          status: "SUCCEEDED",
          providerPaymentId: result.providerRefundId,
          idempotencyKey,
          metadata: input.reason
            ? JSON.stringify({ reason: input.reason })
            : null,
        },
      }));

    await insertPostings(
      tx,
      refundPostings({
        bookingId: booking.id,
        paymentRecordId: refundRecord.id,
        therapistId: booking.therapistId,
        refundMinor,
        originalNetMinor,
        originalCommissionMinor: commissionEntry.amountMinor,
        reason: input.reason,
      }),
    );

    assertTransition(booking.status, "REFUNDED");
    await tx.booking.update({
      where: { id: booking.id },
      data: { status: "REFUNDED", paymentStatus: "REFUNDED" },
    });
    await tx.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        fromStatus: booking.status,
        toStatus: "REFUNDED",
        actorType: input.session.role,
        actorId: input.session.userId,
        reason: input.reason ?? "Refund executed",
      },
    });
    // A refunded session frees the calendar slot.
    if (booking.slot) {
      await tx.bookingSlot.delete({ where: { id: booking.slot.id } });
    }

    await recordAudit(
      {
        session: input.session,
        action: "payment.refund_executed",
        entityType: "Booking",
        entityId: booking.id,
        detail: { refundMinor, reason: input.reason },
      },
      tx,
    );

    return refundRecord;
  });
}

/**
 * Webhook ingestion for future gateway adapters. Deduplicates on the
 * provider's event id, so replays are recorded but never re-processed.
 */
export async function processWebhook(
  providerName: string,
  rawBody: string,
  headers: Record<string, string>,
) {
  const provider = getPaymentProvider(providerName);
  const parsed = await provider.parseWebhook(rawBody, headers); // throws on bad signature

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
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { status: "SKIPPED" as const, reason: "duplicate event" };
    }
    throw err;
  }

  try {
    if (parsed.status === "SUCCEEDED" && parsed.providerOrderId) {
      const record = await prisma.paymentRecord.findFirst({
        where: {
          provider: provider.name,
          providerOrderId: parsed.providerOrderId,
          kind: "CHARGE",
        },
      });
      if (record && parsed.providerPaymentId) {
        await recordChargeSuccess({
          paymentRecordId: record.id,
          providerPaymentId: parsed.providerPaymentId,
        });
      }
    }
    await prisma.webhookEvent.update({
      where: {
        provider_externalId: {
          provider: provider.name,
          externalId: parsed.externalId,
        },
      },
      data: { status: "PROCESSED", processedAt: new Date() },
    });
    return { status: "PROCESSED" as const };
  } catch (err) {
    await prisma.webhookEvent.update({
      where: {
        provider_externalId: {
          provider: provider.name,
          externalId: parsed.externalId,
        },
      },
      data: {
        status: "FAILED",
        error: err instanceof Error ? err.message : String(err),
      },
    });
    throw err;
  }
}
