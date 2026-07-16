import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  createBooking,
  rescheduleBooking,
  scheduleAdminBooking,
  transitionBooking,
} from "../services/bookingService";
import { executeRefund, recordChargeSuccess } from "../services/paymentService";
import { registerPaymentProvider } from "../payments/registry";
import type { PaymentProvider } from "../payments/types";
import { createPayout, transitionPayout } from "../services/payoutService";
import { consultantBalance } from "../services/ledgerService";
import type { Session } from "../http";

// Integration tests against the real Postgres schema: double-booking
// concurrency, financial idempotency, refund reversals and payout guards.
// They create an isolated consultant/service/client fixture and clean up
// after themselves. Requires DATABASE_URL (skipped otherwise).

const hasDb = !!process.env.DATABASE_URL;
const suite = hasDb ? describe : describe.skip;

const STAMP = Date.now();
const SLUG = `test-consultant-${STAMP}`;
const SERVICE_SLUG = `test-service-${STAMP}`;

let therapistId: string;
let serviceId: string;
let adminSession: Session;

// A weekday slot far in the future, aligned to the seeded 10:00 template.
function futureSlot(daysAhead: number, hour = 10): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  return d;
}

const clientInput = (n: number) => ({
  name: `Test Client ${n}`,
  email: `test.client.${STAMP}.${n}@example.com`,
  phone: "+919812345678",
  dob: "1990-01-01",
  emergencyContact: "Test EC (+919812345679)",
  gdprConsent: true as const,
});

// Minimal checkout-capable gateway so PAY_NOW bookings mint a redirectable
// charge; success is then recorded the way a webhook would. Sync refunds keep
// the admin refund lifecycle observable end-to-end in this suite.
const testGateway: PaymentProvider = {
  name: "test-gw",
  async createIntent(input) {
    return {
      providerOrderId: `tgw_${input.idempotencyKey.replace(/[^a-zA-Z0-9]/g, "")}`,
      clientAction: {
        type: "checkout",
        payload: { checkoutUrl: `https://gw.test/pay/${input.bookingId}` },
      },
      metadata: { checkoutUrl: `https://gw.test/pay/${input.bookingId}` },
    };
  },
  async verifyPayment() {
    return { ok: false, reason: "unused" };
  },
  async parseWebhook() {
    throw new Error("unused");
  },
  async refund(input) {
    return {
      ok: true,
      providerRefundId: `tgw_rf_${input.idempotencyKey.length}`,
      status: "SUCCEEDED",
      merchantRefundId: input.merchantRefundId,
    };
  },
  async fetchPaymentStatus() {
    return { status: "UNKNOWN" };
  },
};

let previousProviderEnv: string | undefined;

suite("booking & finance integration", () => {
  beforeAll(async () => {
    registerPaymentProvider(testGateway);
    previousProviderEnv = process.env.PAYMENT_PROVIDER;
    process.env.PAYMENT_PROVIDER = "test-gw";

    const user = await prisma.user.create({
      data: {
        email: `test.admin.${STAMP}@example.com`,
        passwordHash: "x",
        role: "ADMIN",
      },
    });
    adminSession = { userId: user.id, email: user.email, role: "ADMIN" };

    const therapist = await prisma.therapist.create({
      data: {
        name: "Test Consultant",
        slug: SLUG,
        bio: "test",
        feeMinor: 100000,
        status: "APPROVED",
        commissionBps: 3500,
      },
    });
    therapistId = therapist.id;
    await prisma.therapistAvailability.createMany({
      data: [1, 2, 3, 4, 5].flatMap((day) =>
        [9, 10, 11, 13, 14].map((h) => ({
          therapistId: therapist.id,
          dayOfWeek: day,
          startTime: `${String(h).padStart(2, "0")}:00`,
          endTime: `${String(h + 1).padStart(2, "0")}:00`,
        })),
      ),
    });
    const service = await prisma.service.create({
      data: {
        name: "Test Session",
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

    await prisma.ledgerEntry.deleteMany({ where: { therapistId } });
    await prisma.payout.deleteMany({ where: { therapistId } });
    await prisma.booking.deleteMany({ where: { therapistId } });
    await prisma.therapist.delete({ where: { id: therapistId } });
    await prisma.service.delete({ where: { id: serviceId } });
    // Canonical services upserted by scheduleAdminBooking — but only when no
    // other bookings reference them (a shared dev database may have some).
    await prisma.service.deleteMany({
      where: {
        slug: { in: ["individual-counselling", "couple-family-counselling"] },
        bookings: { none: {} },
      },
    });
    await prisma.client.deleteMany({
      where: { email: { contains: `${STAMP}` } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: `${STAMP}` } },
    });
    await prisma.$disconnect();
  });

  it("prevents double-booking under concurrency: exactly one of two parallel requests wins", async () => {
    const slot = futureSlot(7);
    const results = await Promise.allSettled([
      createBooking({
        therapistSlug: SLUG,
        serviceSlug: SERVICE_SLUG,
        dateTime: slot,
        client: clientInput(1),
        paymentOption: "PAY_LATER",
      }),
      createBooking({
        therapistSlug: SLUG,
        serviceSlug: SERVICE_SLUG,
        dateTime: slot,
        client: clientInput(2),
        paymentOption: "PAY_LATER",
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const holds = await prisma.bookingSlot.count({
      where: { therapistId, startAt: slot },
    });
    expect(holds).toBe(1);
  });

  it("rejects bookings outside working hours", async () => {
    const slot = futureSlot(8);
    slot.setHours(6, 0, 0, 0); // before opening
    await expect(
      createBooking({
        therapistSlug: SLUG,
        serviceSlug: SERVICE_SLUG,
        dateTime: slot,
        client: clientInput(3),
        paymentOption: "PAY_LATER",
      }),
    ).rejects.toThrow(/working hours/);
  });

  it("holds PAY_NOW as AWAITING_PAYMENT, confirms on gateway success exactly once (replay-safe)", async () => {
    const { booking, payment } = await createBooking({
      therapistSlug: SLUG,
      serviceSlug: SERVICE_SLUG,
      dateTime: futureSlot(9, 11),
      client: clientInput(4),
      paymentOption: "PAY_NOW",
    });
    // Booking must NOT confirm before the gateway does.
    expect(booking.status).toBe("AWAITING_PAYMENT");
    expect(booking.paymentStatus).toBe("UNPAID");
    expect(booking.expiresAt).toBeTruthy();
    expect(payment?.checkoutUrl).toContain(booking.id);

    const charge = await prisma.paymentRecord.findFirstOrThrow({
      where: { bookingId: booking.id, kind: "CHARGE" },
    });
    expect(charge.status).toBe("CREATED");

    // Success lands (as the webhook would deliver it) — twice.
    await recordChargeSuccess({
      paymentRecordId: charge.id,
      providerPaymentId: "TXN123",
    });
    await recordChargeSuccess({
      paymentRecordId: charge.id,
      providerPaymentId: "TXN123",
    });

    const after = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(after.status).toBe("CONFIRMED");
    expect(after.paymentStatus).toBe("PAID");
    expect(after.invoiceNumber).toBeTruthy();
    expect(after.expiresAt).toBeNull();

    const grossEntries = await prisma.ledgerEntry.count({
      where: { bookingId: booking.id, entryType: "GROSS_REVENUE" },
    });
    expect(grossEntries).toBe(1);

    // 35% of ₹1000 = ₹350 commission, ₹650 platform
    const commission = await prisma.ledgerEntry.findFirstOrThrow({
      where: { bookingId: booking.id, entryType: "COMMISSION_ACCRUED" },
    });
    expect(commission.amountMinor).toBe(35000);
  });

  it("executes a refund with full ledger reversal, exactly once", async () => {
    const { booking } = await createBooking({
      therapistSlug: SLUG,
      serviceSlug: SERVICE_SLUG,
      dateTime: futureSlot(10, 13),
      client: clientInput(5),
      paymentOption: "PAY_NOW",
    });
    const paidCharge = await prisma.paymentRecord.findFirstOrThrow({
      where: { bookingId: booking.id, kind: "CHARGE" },
    });
    await recordChargeSuccess({
      paymentRecordId: paidCharge.id,
      providerPaymentId: "TXN456",
    });

    // Refunds require the REFUND_PENDING gate
    await expect(
      executeRefund({ bookingId: booking.id, session: adminSession }),
    ).rejects.toThrow(/REFUND_PENDING/);

    await transitionBooking({
      bookingId: booking.id,
      toStatus: "REFUND_PENDING",
      session: adminSession,
    });
    await executeRefund({
      bookingId: booking.id,
      reason: "test refund",
      session: adminSession,
    });

    const after = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(after.status).toBe("REFUNDED");
    expect(after.paymentStatus).toBe("REFUNDED");

    // Slot is released after refund
    const holds = await prisma.bookingSlot.count({
      where: { bookingId: booking.id },
    });
    expect(holds).toBe(0);

    // Net financial effect of the booking is zero
    const entries = await prisma.ledgerEntry.findMany({
      where: { bookingId: booking.id },
    });
    const commissionNet = entries
      .filter((e) =>
        ["COMMISSION_ACCRUED", "COMMISSION_REVERSED"].includes(e.entryType),
      )
      .reduce((sum, e) => sum + e.amountMinor, 0);
    const platformNet = entries
      .filter((e) =>
        ["PLATFORM_REVENUE", "PLATFORM_REVENUE_REVERSED"].includes(e.entryType),
      )
      .reduce((sum, e) => sum + e.amountMinor, 0);
    expect(commissionNet).toBe(0);
    expect(platformNet).toBe(0);
  });

  it("frees the slot on cancellation and allows rebooking", async () => {
    const slot = futureSlot(11, 14);
    const { booking } = await createBooking({
      therapistSlug: SLUG,
      serviceSlug: SERVICE_SLUG,
      dateTime: slot,
      client: clientInput(6),
      paymentOption: "PAY_LATER",
    });
    await transitionBooking({
      bookingId: booking.id,
      toStatus: "CANCELLED",
      session: adminSession,
      reason: "test",
    });
    const { booking: rebooked } = await createBooking({
      therapistSlug: SLUG,
      serviceSlug: SERVICE_SLUG,
      dateTime: slot,
      client: clientInput(7),
      paymentOption: "PAY_LATER",
    });
    expect(rebooked.dateTime.getTime()).toBe(slot.getTime());
  });

  it("reschedules atomically and blocks the vacated-to-occupied race", async () => {
    const slotA = futureSlot(12, 9);
    const slotB = futureSlot(12, 10);
    const { booking: a } = await createBooking({
      therapistSlug: SLUG,
      serviceSlug: SERVICE_SLUG,
      dateTime: slotA,
      client: clientInput(8),
      paymentOption: "PAY_LATER",
    });
    const { booking: b } = await createBooking({
      therapistSlug: SLUG,
      serviceSlug: SERVICE_SLUG,
      dateTime: slotB,
      client: clientInput(9),
      paymentOption: "PAY_LATER",
    });
    // Moving A onto B's slot must fail
    await expect(
      rescheduleBooking({
        bookingId: a.id,
        newDateTime: slotB,
        session: adminSession,
      }),
    ).rejects.toThrow(/no longer available/);
    // Moving B to a free slot succeeds
    const slotC = futureSlot(12, 11);
    const moved = await rescheduleBooking({
      bookingId: b.id,
      newDateTime: slotC,
      session: adminSession,
    });
    expect(moved.dateTime.getTime()).toBe(slotC.getTime());
  });

  it("schedules an admin appointment: confirmed, typed, slot-held, and prepaid revenue posted", async () => {
    const slot = futureSlot(20, 16);
    const booking = await scheduleAdminBooking({
      therapistId,
      counselingType: "COUPLE_FAMILY",
      dateTime: slot,
      feeMinor: 200000,
      paymentReceived: true,
      paymentRef: "112233445566",
      client: { new: clientInput(20) },
      session: adminSession,
    });

    expect(booking.status).toBe("CONFIRMED");
    expect(booking.paymentStatus).toBe("PAID");
    expect(booking.counselingType).toBe("COUPLE_FAMILY");
    expect(booking.amountMinor).toBe(200000);
    expect(booking.invoiceNumber).toBeTruthy();

    const holds = await prisma.bookingSlot.count({
      where: { therapistId, startAt: slot },
    });
    expect(holds).toBe(1);

    // Prepaid fee posts gross revenue once and commission at 35% of ₹2000.
    const gross = await prisma.ledgerEntry.count({
      where: { bookingId: booking.id, entryType: "GROSS_REVENUE" },
    });
    expect(gross).toBe(1);
    const commission = await prisma.ledgerEntry.findFirstOrThrow({
      where: { bookingId: booking.id, entryType: "COMMISSION_ACCRUED" },
    });
    expect(commission.amountMinor).toBe(70000);

    // Double-booking the same consultant/time is rejected by the slot guard.
    await expect(
      scheduleAdminBooking({
        therapistId,
        counselingType: "INDIVIDUAL",
        dateTime: slot,
        feeMinor: 150000,
        paymentReceived: false,
        client: { new: clientInput(21) },
        session: adminSession,
      }),
    ).rejects.toThrow(/already has an appointment|no longer available/i);
  });

  it("payouts respect the payable balance and settle exactly once", async () => {
    const before = await consultantBalance(therapistId);
    expect(before.payableMinor).toBeGreaterThan(0);

    // Over-drawing is rejected
    await expect(
      createPayout({
        therapistId,
        amountMinor: before.payableMinor + 1,
        session: adminSession,
      }),
    ).rejects.toThrow(/exceeds payable/);

    const payout = await createPayout({ therapistId, session: adminSession });
    expect(payout.amountMinor).toBe(before.payableMinor);

    // Pending payout reserves the balance — a second full payout is blocked
    await expect(
      createPayout({ therapistId, session: adminSession }),
    ).rejects.toThrow();

    await transitionPayout({
      payoutId: payout.id,
      toStatus: "PAID",
      reference: "TEST1",
      session: adminSession,
    });
    // Marking PAID twice is a no-op, not a double ledger post
    await transitionPayout({
      payoutId: payout.id,
      toStatus: "PAID",
      reference: "TEST1",
      session: adminSession,
    });

    const settledEntries = await prisma.ledgerEntry.count({
      where: { payoutId: payout.id },
    });
    expect(settledEntries).toBe(1);

    const after = await consultantBalance(therapistId);
    expect(after.payableMinor).toBe(0);
    expect(after.paidMinor).toBe(before.payableMinor);
  });
});
