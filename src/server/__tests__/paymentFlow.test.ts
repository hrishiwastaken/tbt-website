import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  createBooking,
  releaseExpiredReservations,
  transitionBooking,
} from "../services/bookingService";
import {
  executeRefund,
  processWebhook,
  recordChargeSuccess,
} from "../services/paymentService";
import {
  reconcilePayments,
  resolveBookingPaymentStatus,
  retryCharge,
} from "../services/paymentStatusService";
import { registerPaymentProvider } from "../payments/registry";
import type {
  FetchPaymentStatusResult,
  PaymentProvider,
  RefundResult,
  WebhookParseResult,
} from "../payments/types";
import type { Session } from "../http";

// Async-gateway payment lifecycle against the real Postgres schema: webhook
// confirmation, replay dedupe, failure + retry, late success after TTL
// expiry, amount mismatch, async refunds — and the race conditions between
// webhooks, status polls, expiry sweeps, admin transitions and retries.
// Requires DATABASE_URL (skipped otherwise).

const hasDb = !!process.env.DATABASE_URL;
const suite = hasDb ? describe : describe.skip;

const STAMP = Date.now();
const SLUG = `pf-consultant-${STAMP}`;
const SERVICE_SLUG = `pf-service-${STAMP}`;

let therapistId: string;
let serviceId: string;
let adminSession: Session;
let previousProviderEnv: string | undefined;

// Scriptable fake gateway. Tests set `gw.statusResult` / `gw.refundResult`
// to control what the provider reports; webhooks are injected by passing a
// WebhookParseResult as the raw body (parseWebhook echoes it back).
const gw = {
  statusResult: { status: "UNKNOWN" } as FetchPaymentStatusResult,
  refundResult: {
    ok: true,
    providerRefundId: "RFD_default",
    status: "PROCESSING",
  } as RefundResult,
};

const fakeGateway: PaymentProvider = {
  name: "fake-gw",
  async createIntent(input) {
    return {
      providerOrderId: `fgw_${input.idempotencyKey.replace(/[^a-zA-Z0-9]/g, "")}`,
      clientAction: {
        type: "checkout",
        payload: { checkoutUrl: `https://fake-gw.test/pay/${input.bookingId}` },
      },
      metadata: {
        checkoutUrl: `https://fake-gw.test/pay/${input.bookingId}`,
      },
    };
  },
  async verifyPayment() {
    return { ok: false, reason: "unused" };
  },
  async parseWebhook(rawBody) {
    return JSON.parse(rawBody) as WebhookParseResult;
  },
  async refund(input) {
    const result = gw.refundResult;
    if (result.ok) {
      return { ...result, merchantRefundId: input.merchantRefundId };
    }
    return result;
  },
  async fetchPaymentStatus() {
    return gw.statusResult;
  },
};

function futureSlot(daysAhead: number, hour = 10): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  return d;
}

const clientInput = (n: number) => ({
  name: `PF Client ${n}`,
  email: `pf.client.${STAMP}.${n}@example.com`,
  phone: "+919812345678",
  dob: "1990-01-01",
  emergencyContact: "Test EC (+919812345679)",
  gdprConsent: true as const,
});

async function bookPayNow(n: number, daysAhead: number, hour: number) {
  const { booking, payment } = await createBooking({
    therapistSlug: SLUG,
    serviceSlug: SERVICE_SLUG,
    dateTime: futureSlot(daysAhead, hour),
    client: clientInput(n),
    paymentOption: "PAY_NOW",
  });
  const charge = await prisma.paymentRecord.findFirstOrThrow({
    where: { bookingId: booking.id, kind: "CHARGE" },
  });
  return { booking, payment, charge };
}

function successEvent(
  charge: { providerOrderId: string | null; amountMinor: number },
  overrides: Partial<WebhookParseResult> = {},
): string {
  return JSON.stringify({
    externalId: `evt:completed:${charge.providerOrderId}`,
    eventType: "checkout.order.completed",
    providerOrderId: charge.providerOrderId,
    providerPaymentId: "TXN_WEBHOOK",
    status: "SUCCEEDED",
    amountMinor: charge.amountMinor,
    ...overrides,
  } satisfies WebhookParseResult);
}

async function grossCount(bookingId: string): Promise<number> {
  return prisma.ledgerEntry.count({
    where: { bookingId, entryType: "GROSS_REVENUE" },
  });
}

async function forceExpiry(bookingId: string): Promise<void> {
  await prisma.booking.update({
    where: { id: bookingId },
    data: { expiresAt: new Date(Date.now() - 60000) },
  });
}

suite("async payment flow & races", () => {
  beforeAll(async () => {
    registerPaymentProvider(fakeGateway);
    previousProviderEnv = process.env.PAYMENT_PROVIDER;
    process.env.PAYMENT_PROVIDER = "fake-gw";

    const user = await prisma.user.create({
      data: {
        email: `pf.admin.${STAMP}@example.com`,
        passwordHash: "x",
        role: "ADMIN",
      },
    });
    adminSession = { userId: user.id, email: user.email, role: "ADMIN" };

    const therapist = await prisma.therapist.create({
      data: {
        name: "PF Consultant",
        slug: SLUG,
        bio: "test",
        feeMinor: 100000,
        status: "APPROVED",
        commissionBps: 3000,
      },
    });
    therapistId = therapist.id;
    await prisma.therapistAvailability.createMany({
      data: [1, 2, 3, 4, 5].flatMap((day) =>
        [9, 10, 11, 13, 14, 15, 16].map((h) => ({
          therapistId: therapist.id,
          dayOfWeek: day,
          startTime: `${String(h).padStart(2, "0")}:00`,
          endTime: `${String(h + 1).padStart(2, "0")}:00`,
        })),
      ),
    });
    const service = await prisma.service.create({
      data: {
        name: "PF Session",
        description: "test",
        durationMinutes: 50,
        priceMinor: 100000,
        slug: SERVICE_SLUG,
      },
    });
    serviceId = service.id;
  });

  afterAll(async () => {
    if (previousProviderEnv === undefined) delete process.env.PAYMENT_PROVIDER;
    else process.env.PAYMENT_PROVIDER = previousProviderEnv;

    await prisma.webhookEvent.deleteMany({ where: { provider: "fake-gw" } });
    await prisma.ledgerEntry.deleteMany({ where: { therapistId } });
    await prisma.ledgerEntry.deleteMany({
      where: { booking: { therapistId } },
    });
    await prisma.booking.deleteMany({ where: { therapistId } });
    await prisma.therapist.delete({ where: { id: therapistId } });
    await prisma.service.delete({ where: { id: serviceId } });
    await prisma.client.deleteMany({
      where: { email: { contains: `pf.client.${STAMP}` } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: `pf.admin.${STAMP}` } },
    });
    await prisma.$disconnect();
  });

  it("confirms on the success webhook exactly once; replays are SKIPPED", async () => {
    const { booking, charge } = await bookPayNow(1, 14, 9);

    const first = await processWebhook("fake-gw", successEvent(charge), {});
    expect(first.status).toBe("PROCESSED");

    const replay = await processWebhook("fake-gw", successEvent(charge), {});
    expect(replay.status).toBe("SKIPPED");

    const after = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(after.status).toBe("CONFIRMED");
    expect(after.paymentStatus).toBe("PAID");
    expect(await grossCount(booking.id)).toBe(1);
  });

  it("failure webhook marks the attempt FAILED, keeps the hold; retry mints attempt 2 which can succeed", async () => {
    const { booking, charge } = await bookPayNow(2, 14, 10);

    await processWebhook(
      "fake-gw",
      JSON.stringify({
        externalId: `evt:failed:${charge.providerOrderId}`,
        eventType: "checkout.order.failed",
        providerOrderId: charge.providerOrderId,
        status: "FAILED",
      } satisfies WebhookParseResult),
      {},
    );

    const failedCharge = await prisma.paymentRecord.findUniqueOrThrow({
      where: { id: charge.id },
    });
    expect(failedCharge.status).toBe("FAILED");
    const held = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(held.status).toBe("AWAITING_PAYMENT"); // reservation survives for retry
    expect(
      await prisma.bookingSlot.count({ where: { bookingId: booking.id } }),
    ).toBe(1);

    const status = await resolveBookingPaymentStatus(booking.id);
    expect(status.state).toBe("FAILED");
    expect(status.canRetry).toBe(true);

    const retry = await retryCharge(booking.id);
    expect(retry.state).toBe("RETRY");
    expect(retry.checkoutUrl).toContain(booking.id);
    const attempts = await prisma.paymentRecord.findMany({
      where: { bookingId: booking.id, kind: "CHARGE" },
      orderBy: { createdAt: "asc" },
    });
    expect(attempts).toHaveLength(2);

    await processWebhook("fake-gw", successEvent(attempts[1]), {});
    const after = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(after.status).toBe("CONFIRMED");
    expect(after.paymentStatus).toBe("PAID");
    expect(await grossCount(booking.id)).toBe(1);
  });

  it("late success after TTL expiry: money ledgered, booking flagged REFUND_PENDING, slot stays free", async () => {
    const { booking, charge } = await bookPayNow(3, 14, 11);

    await forceExpiry(booking.id);
    expect(await releaseExpiredReservations()).toBeGreaterThanOrEqual(1);
    const cancelled = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(cancelled.status).toBe("CANCELLED");
    expect(
      await prisma.bookingSlot.count({ where: { bookingId: booking.id } }),
    ).toBe(0);

    // The payment lands anyway.
    await processWebhook("fake-gw", successEvent(charge), {});

    const after = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(after.status).toBe("REFUND_PENDING");
    expect(after.paymentStatus).toBe("PAID");
    expect(await grossCount(booking.id)).toBe(1);
    expect(
      await prisma.bookingSlot.count({ where: { bookingId: booking.id } }),
    ).toBe(0); // slot NOT re-held

    const state = await resolveBookingPaymentStatus(booking.id);
    expect(state.state).toBe("REFUND_PENDING");
  });

  it("amount-mismatch webhook never confirms", async () => {
    const { booking, charge } = await bookPayNow(4, 14, 13);

    const result = await processWebhook(
      "fake-gw",
      successEvent(charge, {
        amountMinor: charge.amountMinor - 5000,
        externalId: `evt:mismatch:${charge.providerOrderId}`,
      }),
      {},
    );
    expect(result.status).toBe("FAILED");

    const after = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(after.status).toBe("AWAITING_PAYMENT");
    expect(after.paymentStatus).toBe("UNPAID");
    expect(await grossCount(booking.id)).toBe(0);

    const event = await prisma.webhookEvent.findUniqueOrThrow({
      where: {
        provider_externalId: {
          provider: "fake-gw",
          externalId: `evt:mismatch:${charge.providerOrderId}`,
        },
      },
    });
    expect(event.status).toBe("FAILED");
    expect(event.error).toContain("AMOUNT_MISMATCH");
  });

  it("RACE: concurrent confirmations post the ledger exactly once", async () => {
    const { booking, charge } = await bookPayNow(5, 14, 14);

    const results = await Promise.allSettled([
      recordChargeSuccess({
        paymentRecordId: charge.id,
        providerPaymentId: "TXN_A",
      }),
      recordChargeSuccess({
        paymentRecordId: charge.id,
        providerPaymentId: "TXN_B",
      }),
    ]);
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
    expect(await grossCount(booking.id)).toBe(1);
    const after = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(after.status).toBe("CONFIRMED");
    expect(after.paymentStatus).toBe("PAID");
  });

  it("RACE: confirmation vs expiry sweep never yields a cancelled paid booking", async () => {
    const { booking, charge } = await bookPayNow(6, 15, 9);
    await forceExpiry(booking.id);

    const results = await Promise.allSettled([
      recordChargeSuccess({
        paymentRecordId: charge.id,
        providerPaymentId: "TXN_RACE",
      }),
      releaseExpiredReservations(),
    ]);
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);

    const after = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    // Either the confirm won (CONFIRMED, slot held) or the sweep won and the
    // late-success branch flagged the paid booking for refund (slot free).
    expect(after.paymentStatus).toBe("PAID");
    expect(["CONFIRMED", "REFUND_PENDING"]).toContain(after.status);
    const slots = await prisma.bookingSlot.count({
      where: { bookingId: booking.id },
    });
    expect(slots).toBe(after.status === "CONFIRMED" ? 1 : 0);
    expect(await grossCount(booking.id)).toBe(1);
  });

  it("RACE: admin cancel vs payment confirmation cannot clobber a paid booking", async () => {
    const { booking, charge } = await bookPayNow(7, 15, 10);

    await Promise.allSettled([
      recordChargeSuccess({
        paymentRecordId: charge.id,
        providerPaymentId: "TXN_C",
      }),
      transitionBooking({
        bookingId: booking.id,
        toStatus: "CANCELLED",
        session: adminSession,
        reason: "race test",
      }),
    ]);

    const after = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(await grossCount(booking.id)).toBe(1);
    expect(after.paymentStatus).toBe("PAID");
    // Cancel-first → late-success flags REFUND_PENDING; confirm-first → the
    // stale cancel 409s and the booking stays CONFIRMED. A paid booking
    // sitting in CANCELLED (money silently kept) must be impossible.
    expect(["CONFIRMED", "REFUND_PENDING"]).toContain(after.status);
  });

  it("RACE: concurrent retries converge on a single new attempt", async () => {
    const { booking, charge } = await bookPayNow(8, 15, 11);
    // Terminal-fail attempt 1 so retries mint attempt 2.
    await processWebhook(
      "fake-gw",
      JSON.stringify({
        externalId: `evt:failed:${charge.providerOrderId}`,
        eventType: "checkout.order.failed",
        providerOrderId: charge.providerOrderId,
        status: "FAILED",
      } satisfies WebhookParseResult),
      {},
    );

    const results = await Promise.allSettled([
      retryCharge(booking.id),
      retryCharge(booking.id),
    ]);
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);

    const attempts = await prisma.paymentRecord.count({
      where: { bookingId: booking.id, kind: "CHARGE" },
    });
    expect(attempts).toBe(2); // attempt 1 (failed) + exactly one retry
  });

  it("async refund: no reversal until the refund webhook lands; replay-safe; failure keeps REFUND_PENDING", async () => {
    const { booking, charge } = await bookPayNow(9, 15, 13);
    await processWebhook("fake-gw", successEvent(charge), {});
    await transitionBooking({
      bookingId: booking.id,
      toStatus: "REFUND_PENDING",
      session: adminSession,
      reason: "client asked",
    });

    // 1st attempt: gateway rejects it outright.
    gw.refundResult = { ok: false, reason: "gateway says no" };
    await expect(
      executeRefund({ bookingId: booking.id, session: adminSession }),
    ).rejects.toThrow(/gateway says no/);
    let refunds = await prisma.paymentRecord.findMany({
      where: { bookingId: booking.id, kind: "REFUND" },
      orderBy: { createdAt: "asc" },
    });
    expect(refunds).toHaveLength(1);
    expect(refunds[0].status).toBe("FAILED");
    expect(
      (await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } }))
        .status,
    ).toBe("REFUND_PENDING");

    // 2nd attempt: accepted, processing asynchronously.
    gw.refundResult = {
      ok: true,
      providerRefundId: "RFD_2",
      status: "PROCESSING",
    };
    await executeRefund({ bookingId: booking.id, session: adminSession });
    refunds = await prisma.paymentRecord.findMany({
      where: { bookingId: booking.id, kind: "REFUND" },
      orderBy: { createdAt: "asc" },
    });
    expect(refunds).toHaveLength(2);
    const processing = refunds[1];
    expect(processing.status).toBe("PROCESSING");
    expect(processing.providerOrderId).toMatch(/^RF[0-9a-f]{32}$/);

    // No reversal yet, booking still REFUND_PENDING, and while processing a
    // reject-back-to-confirmed is blocked.
    expect(
      await prisma.ledgerEntry.count({
        where: { bookingId: booking.id, entryType: "REFUND" },
      }),
    ).toBe(0);
    await expect(
      transitionBooking({
        bookingId: booking.id,
        toStatus: "CONFIRMED",
        session: adminSession,
      }),
    ).rejects.toThrow(/refund is currently being processed/);

    // Refund completion webhook (delivered twice).
    const refundEvent = JSON.stringify({
      externalId: `evt:refund:${processing.providerOrderId}`,
      eventType: "pg.refund.completed",
      providerOrderId: processing.providerOrderId,
      providerPaymentId: "RFD_2",
      status: "REFUNDED",
    } satisfies WebhookParseResult);
    expect((await processWebhook("fake-gw", refundEvent, {})).status).toBe(
      "PROCESSED",
    );
    expect((await processWebhook("fake-gw", refundEvent, {})).status).toBe(
      "SKIPPED",
    );

    const after = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(after.status).toBe("REFUNDED");
    expect(after.paymentStatus).toBe("REFUNDED");
    expect(
      await prisma.ledgerEntry.count({
        where: { bookingId: booking.id, entryType: "REFUND" },
      }),
    ).toBe(1);
    // Net commission + platform effect is zero after reversal.
    const entries = await prisma.ledgerEntry.findMany({
      where: { bookingId: booking.id },
    });
    const net = (types: string[]) =>
      entries
        .filter((e) => types.includes(e.entryType))
        .reduce((sum, e) => sum + e.amountMinor, 0);
    expect(net(["COMMISSION_ACCRUED", "COMMISSION_REVERSED"])).toBe(0);
    expect(net(["PLATFORM_REVENUE", "PLATFORM_REVENUE_REVERSED"])).toBe(0);
  });

  it("RACE: concurrent refund executions create exactly one in-flight refund", async () => {
    const { booking, charge } = await bookPayNow(10, 15, 14);
    await processWebhook("fake-gw", successEvent(charge), {});
    await transitionBooking({
      bookingId: booking.id,
      toStatus: "REFUND_PENDING",
      session: adminSession,
    });

    gw.refundResult = {
      ok: true,
      providerRefundId: "RFD_RACE",
      status: "PROCESSING",
    };
    const results = await Promise.allSettled([
      executeRefund({ bookingId: booking.id, session: adminSession }),
      executeRefund({ bookingId: booking.id, session: adminSession }),
    ]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const refunds = await prisma.paymentRecord.count({
      where: { bookingId: booking.id, kind: "REFUND" },
    });
    expect(refunds).toBe(1);
  });

  it("status poll confirms server-side when the webhook was missed", async () => {
    const { booking } = await bookPayNow(11, 16, 9);

    gw.statusResult = {
      status: "SUCCEEDED",
      providerPaymentId: "TXN_POLL",
      amountMinor: 100000,
    };
    const state = await resolveBookingPaymentStatus(booking.id);
    expect(state.state).toBe("PAID");

    const after = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(after.status).toBe("CONFIRMED");
    expect(after.paymentStatus).toBe("PAID");
    expect(await grossCount(booking.id)).toBe(1);
    gw.statusResult = { status: "UNKNOWN" };
  });

  it("reconciliation resolves stale charges and in-flight refunds", async () => {
    // Stale charge that actually succeeded at the gateway.
    const { booking, charge } = await bookPayNow(12, 16, 10);
    await prisma.paymentRecord.update({
      where: { id: charge.id },
      data: { createdAt: new Date(Date.now() - 10 * 60000) },
    });

    // In-flight refund on a second, paid booking.
    const second = await bookPayNow(13, 16, 11);
    await processWebhook("fake-gw", successEvent(second.charge), {});
    await transitionBooking({
      bookingId: second.booking.id,
      toStatus: "REFUND_PENDING",
      session: adminSession,
    });
    gw.refundResult = {
      ok: true,
      providerRefundId: "RFD_RECON",
      status: "PROCESSING",
    };
    await executeRefund({ bookingId: second.booking.id, session: adminSession });

    gw.statusResult = {
      status: "SUCCEEDED",
      providerPaymentId: "TXN_RECON",
      amountMinor: 100000,
    };
    const summary = await reconcilePayments();
    gw.statusResult = { status: "UNKNOWN" };

    expect(summary.chargesConfirmed).toBeGreaterThanOrEqual(1);
    expect(summary.refundsCompleted).toBeGreaterThanOrEqual(1);
    expect(summary.errors).toEqual([]);

    const confirmed = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(confirmed.status).toBe("CONFIRMED");
    expect(confirmed.paymentStatus).toBe("PAID");

    const refunded = await prisma.booking.findUniqueOrThrow({
      where: { id: second.booking.id },
    });
    expect(refunded.status).toBe("REFUNDED");
  });

  it("duplicate payment on a second attempt never double-posts revenue", async () => {
    const { booking, charge } = await bookPayNow(14, 16, 13);
    // Attempt 1 stalls; user retries after it's marked failed; attempt 2 pays.
    await processWebhook(
      "fake-gw",
      JSON.stringify({
        externalId: `evt:failed:${charge.providerOrderId}`,
        eventType: "checkout.order.failed",
        providerOrderId: charge.providerOrderId,
        status: "FAILED",
      } satisfies WebhookParseResult),
      {},
    );
    const retry = await retryCharge(booking.id);
    expect(retry.state).toBe("RETRY");
    const attempt2 = await prisma.paymentRecord.findFirstOrThrow({
      where: { bookingId: booking.id, kind: "CHARGE", status: "CREATED" },
    });
    await processWebhook("fake-gw", successEvent(attempt2), {});
    expect(await grossCount(booking.id)).toBe(1);

    // ...and then the "failed" attempt 1 turns out to have gone through too.
    await recordChargeSuccess({
      paymentRecordId: charge.id,
      providerPaymentId: "TXN_DUP",
    });

    expect(await grossCount(booking.id)).toBe(1); // still exactly one
    const dupRecord = await prisma.paymentRecord.findUniqueOrThrow({
      where: { id: charge.id },
    });
    expect(dupRecord.status).toBe("SUCCEEDED");
    expect(dupRecord.metadata).toContain("duplicatePayment");
    const after = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(after.status).toBe("CONFIRMED"); // untouched by the duplicate
  });
});
