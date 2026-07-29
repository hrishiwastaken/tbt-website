import { type PaymentRecord } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getPaymentProvider } from "../payments/registry";
import { conflict, notFound } from "../http";
import { recordAudit } from "../audit";
import { releaseExpiredReservations } from "./bookingService";
import {
  chargeIdempotencyKey,
  createCharge,
  recordChargeFailure,
  recordChargeSuccess,
  recordRefundFailure,
  recordRefundSuccess,
} from "./paymentService";

// Client-facing payment state resolution, payment retry, and the
// reconciliation sweep. All three lean on the CAS-gated finalizers in
// paymentService — they can race webhooks (and each other) freely.

export interface BookingPaymentState {
  state:
    | "PAID"
    | "PENDING"
    | "FAILED"
    | "EXPIRED"
    | "REFUND_PENDING"
    | "REFUNDED"
    | "NO_PAYMENT_REQUIRED"
    | "RETRY";
  canRetry?: boolean;
  expiresAt?: string | null;
  checkoutUrl?: string | null;
}

function checkoutUrlFrom(record: PaymentRecord | null): string | null {
  if (!record?.metadata) return null;
  try {
    const meta = JSON.parse(record.metadata) as Record<string, unknown>;
    return typeof meta.checkoutUrl === "string" ? meta.checkoutUrl : null;
  } catch {
    return null;
  }
}

async function latestCharge(bookingId: string) {
  return prisma.paymentRecord.findFirst({
    where: { bookingId, kind: "CHARGE" },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Poll-path amount guard, mirroring the webhook one: a provider-reported
 * settled amount that disagrees with the record must never confirm.
 */
async function amountMismatch(
  record: PaymentRecord,
  reportedMinor: number | undefined,
): Promise<boolean> {
  if (reportedMinor == null || reportedMinor === record.amountMinor) {
    return false;
  }
  await recordAudit({
    session: null,
    action: "payment.amount_mismatch",
    entityType: "PaymentRecord",
    entityId: record.id,
    detail: {
      expectedMinor: record.amountMinor,
      reportedMinor,
      source: "status_poll",
    },
  });
  return true;
}

/** DB-terminal states need no provider round-trip. */
function terminalState(booking: {
  status: string;
  paymentStatus: string;
}): BookingPaymentState | null {
  if (booking.status === "REFUND_PENDING") return { state: "REFUND_PENDING" };
  if (booking.status === "REFUNDED" || booking.paymentStatus === "REFUNDED") {
    return { state: "REFUNDED" };
  }
  if (booking.paymentStatus === "PAID") return { state: "PAID" };
  if (booking.status === "CANCELLED") return { state: "EXPIRED" };
  return null;
}

/**
 * Resolve what the payer should see for a booking's payment right now.
 * The client redirect back from checkout lands here: if the webhook already
 * confirmed, the DB answers; otherwise the provider is asked directly and
 * the authoritative result is recorded server-side before responding.
 */
export async function resolveBookingPaymentStatus(
  bookingId: string,
): Promise<BookingPaymentState> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, status: true, paymentStatus: true, expiresAt: true },
  });
  if (!booking) throw notFound("Booking not found");

  const settled = terminalState(booking);
  if (settled) return settled;

  const record = await latestCharge(bookingId);
  const expiresAt = booking.expiresAt?.toISOString() ?? null;
  const withinTtl =
    booking.status === "AWAITING_PAYMENT" &&
    !!booking.expiresAt &&
    booking.expiresAt.getTime() > Date.now();

  if (!record) {
    // CONFIRMED unpaid = pay-at-clinic; AWAITING_PAYMENT with no charge =
    // checkout creation failed — offer a retry while the hold lives.
    if (booking.status === "AWAITING_PAYMENT") {
      return { state: "FAILED", canRetry: withinTtl, expiresAt };
    }
    return { state: "NO_PAYMENT_REQUIRED" };
  }

  if (record.status === "FAILED" || record.status === "CANCELLED") {
    return { state: "FAILED", canRetry: withinTtl, expiresAt };
  }

  if (record.status === "SUCCEEDED") {
    // Record settled but booking rollup lagging (mid-transaction elsewhere);
    // report pending — the next poll will see the committed state.
    return { state: "PENDING", expiresAt };
  }

  // CREATED / PROCESSING → ask the provider for the truth, and record it.
  const provider = getPaymentProvider(record.provider);
  const polled = await provider.fetchPaymentStatus({
    kind: "CHARGE",
    providerOrderId: record.providerOrderId,
    providerPaymentId: record.providerPaymentId,
  });

  if (polled.status === "SUCCEEDED") {
    if (await amountMismatch(record, polled.amountMinor)) {
      return { state: "PENDING", expiresAt };
    }
    await recordChargeSuccess({
      paymentRecordId: record.id,
      providerPaymentId:
        polled.providerPaymentId ?? record.providerOrderId ?? record.id,
    });
    const after = await prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      select: { status: true, paymentStatus: true },
    });
    return terminalState(after) ?? { state: "PAID" };
  }

  if (polled.status === "FAILED") {
    await recordChargeFailure({
      paymentRecordId: record.id,
      reason: "Provider reported failure on status poll",
    });
    return { state: "FAILED", canRetry: withinTtl, expiresAt };
  }

  // PENDING / UNKNOWN — keep waiting. Sweep lapsed holds only AFTER the
  // provider check: checking first guarantees a just-completed payment
  // confirms rather than getting cancelled by this very request.
  await releaseExpiredReservations();
  const after = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    select: { status: true, paymentStatus: true },
  });
  const nowSettled = terminalState(after);
  if (nowSettled) return nowSettled;

  return {
    state: "PENDING",
    expiresAt,
    checkoutUrl: checkoutUrlFrom(record),
  };
}

/**
 * Mint (or resume) a checkout for an AWAITING_PAYMENT booking after a failed
 * attempt. Never creates a second live order: a provider-PENDING attempt is
 * returned as-is, and concurrent retriers converge on the same attempt via
 * the idempotency key.
 */
export async function retryCharge(
  bookingId: string,
): Promise<BookingPaymentState> {
  await releaseExpiredReservations();

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, status: true, paymentStatus: true, expiresAt: true },
  });
  if (!booking) throw notFound("Booking not found");
  if (booking.paymentStatus === "PAID") {
    return terminalState(booking) ?? { state: "PAID" };
  }
  if (booking.status !== "AWAITING_PAYMENT") {
    throw conflict(
      "This reservation is no longer awaiting payment. Please book again.",
      "RESERVATION_EXPIRED",
    );
  }

  const expiresAt = booking.expiresAt?.toISOString() ?? null;
  const record = await latestCharge(bookingId);

  if (
    record &&
    (record.status === "CREATED" || record.status === "PROCESSING")
  ) {
    const provider = getPaymentProvider(record.provider);
    const polled = await provider.fetchPaymentStatus({
      kind: "CHARGE",
      providerOrderId: record.providerOrderId,
      providerPaymentId: record.providerPaymentId,
    });
    if (polled.status === "SUCCEEDED") {
      if (!(await amountMismatch(record, polled.amountMinor))) {
        await recordChargeSuccess({
          paymentRecordId: record.id,
          providerPaymentId:
            polled.providerPaymentId ?? record.providerOrderId ?? record.id,
        });
        return { state: "PAID" };
      }
      return { state: "PENDING", expiresAt };
    }
    if (polled.status === "PENDING") {
      const checkoutUrl = checkoutUrlFrom(record);
      if (checkoutUrl) return { state: "PENDING", expiresAt, checkoutUrl };
    }
    // FAILED or UNKNOWN (no live order at the provider): close this attempt
    // and mint the next one.
    await recordChargeFailure({
      paymentRecordId: record.id,
      reason:
        polled.status === "FAILED"
          ? "Provider reported failure on retry"
          : "Attempt unresolved at provider; superseded by retry",
    });
  }

  const attempts = await prisma.paymentRecord.count({
    where: { bookingId, kind: "CHARGE" },
  });
  const { clientAction } = await createCharge({
    bookingId,
    idempotencyKey: chargeIdempotencyKey(bookingId, attempts + 1),
  });
  if (
    clientAction.type !== "checkout" ||
    typeof clientAction.payload.checkoutUrl !== "string"
  ) {
    throw conflict(
      "Online payment is temporarily unavailable. Please try again later.",
      "ONLINE_PAYMENT_UNAVAILABLE",
    );
  }
  return {
    state: "RETRY",
    expiresAt,
    checkoutUrl: clientAction.payload.checkoutUrl,
  };
}

export interface ReconcileSummary {
  releasedReservations: number;
  chargesChecked: number;
  chargesConfirmed: number;
  chargesFailed: number;
  chargesExpired: number;
  refundsChecked: number;
  refundsCompleted: number;
  refundsFailed: number;
  errors: string[];
}

/**
 * Reconciliation sweep — the backstop that makes webhook delivery
 * non-load-bearing. Resolves stale gateway charges via the provider's
 * status API, expires unresolvable ones, and finalizes in-flight refunds
 * (including CREATED records orphaned by a crash mid-initiation, which are
 * recoverable because their merchantRefundId was persisted up front).
 */
export async function reconcilePayments({
  limit = 50,
}: { limit?: number } = {}): Promise<ReconcileSummary> {
  const summary: ReconcileSummary = {
    releasedReservations: 0,
    chargesChecked: 0,
    chargesConfirmed: 0,
    chargesFailed: 0,
    chargesExpired: 0,
    refundsChecked: 0,
    refundsCompleted: 0,
    refundsFailed: 0,
    errors: [],
  };

  summary.releasedReservations = await releaseExpiredReservations();

  const now = Date.now();
  const fiveMinAgo = new Date(now - 5 * 60000);
  const fortyEightHoursAgo = new Date(now - 48 * 3600000);
  const fifteenMinAgo = new Date(now - 15 * 60000);

  // Gateway charges that should have resolved by now.
  const staleCharges = await prisma.paymentRecord.findMany({
    where: {
      kind: "CHARGE",
      provider: { not: "manual" },
      status: { in: ["CREATED", "PROCESSING"] },
      createdAt: { lt: fiveMinAgo, gt: fortyEightHoursAgo },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  for (const record of staleCharges) {
    summary.chargesChecked++;
    try {
      const provider = getPaymentProvider(record.provider);
      const polled = await provider.fetchPaymentStatus({
        kind: "CHARGE",
        providerOrderId: record.providerOrderId,
        providerPaymentId: record.providerPaymentId,
      });
      if (polled.status === "SUCCEEDED") {
        if (await amountMismatch(record, polled.amountMinor)) continue;
        await recordChargeSuccess({
          paymentRecordId: record.id,
          providerPaymentId:
            polled.providerPaymentId ?? record.providerOrderId ?? record.id,
        });
        summary.chargesConfirmed++;
      } else if (polled.status === "FAILED") {
        await recordChargeFailure({
          paymentRecordId: record.id,
          reason: "Provider reported failure during reconciliation",
        });
        summary.chargesFailed++;
      }
      // PENDING / UNKNOWN: leave for the next sweep.
    } catch (err) {
      summary.errors.push(
        `charge ${record.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // Anything unresolved for 48h is dead — close it out.
  const expired = await prisma.paymentRecord.updateMany({
    where: {
      kind: "CHARGE",
      provider: { not: "manual" },
      status: { in: ["CREATED", "PROCESSING"] },
      createdAt: { lte: fortyEightHoursAgo },
    },
    data: {
      status: "CANCELLED",
      failureReason: "Unresolved after 48h; closed by reconciliation",
    },
  });
  summary.chargesExpired = expired.count;

  // In-flight refunds: PROCESSING (awaiting the gateway), plus CREATED
  // records older than 15 minutes (initiation crashed mid-call).
  const pendingRefunds = await prisma.paymentRecord.findMany({
    where: {
      kind: "REFUND",
      provider: { not: "manual" },
      OR: [
        { status: "PROCESSING" },
        { status: "CREATED", createdAt: { lt: fifteenMinAgo } },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  for (const record of pendingRefunds) {
    summary.refundsChecked++;
    try {
      const provider = getPaymentProvider(record.provider);
      const polled = await provider.fetchPaymentStatus({
        kind: "REFUND",
        providerOrderId: record.providerOrderId,
        providerPaymentId: record.providerPaymentId,
      });
      if (polled.status === "SUCCEEDED") {
        await recordRefundSuccess({
          paymentRecordId: record.id,
          providerRefundId: polled.providerPaymentId,
        });
        summary.refundsCompleted++;
      } else if (polled.status === "FAILED") {
        await recordRefundFailure({
          paymentRecordId: record.id,
          reason: "Provider reported refund failure during reconciliation",
        });
        summary.refundsFailed++;
      } else if (polled.status === "UNKNOWN" && record.status === "CREATED") {
        // The provider never saw this merchantRefundId — the initiation
        // crashed before reaching the gateway. Safe to fail and re-execute.
        await recordRefundFailure({
          paymentRecordId: record.id,
          reason: "Refund initiation never reached the provider",
        });
        summary.refundsFailed++;
      }
      // PENDING (or UNKNOWN on PROCESSING): leave for the next sweep.
    } catch (err) {
      summary.errors.push(
        `refund ${record.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return summary;
}
