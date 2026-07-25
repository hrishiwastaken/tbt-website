import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createPayout, transitionPayout } from "../services/payoutService";
import { consultantBalance } from "../services/ledgerService";
import type { Session } from "../http";

// Payout concurrency regression suite.
//
// Consultant settlement moves real money, so both halves of the payout
// lifecycle have to be safe against concurrent admins:
//   1. createPayout reserves balance — a read-then-create without a lock let
//      every racing caller observe the same payable balance and pass the
//      guard, over-drawing the consultant.
//   2. transitionPayout → PAID posts to the append-only ledger — a
//      read-then-update without a CAS let every racing caller post its own
//      PAYOUT_PAID entry, permanently corrupting the balance.
//
// Both are exercised here against a real Postgres (skipped without
// DATABASE_URL), on an isolated consultant that owns no bookings.

const hasDb = !!process.env.DATABASE_URL;
const suite = hasDb ? describe : describe.skip;

const STAMP = `payout-concurrency-${Date.now()}`;
const EARNED = 500000; // ₹5,000 payable

let therapistId: string;
let adminSession: Session;

suite("payout concurrency", () => {
  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `${STAMP}.admin@example.com`,
        passwordHash: "x",
        role: "ADMIN",
      },
    });
    adminSession = { userId: user.id, email: user.email, role: "ADMIN" };

    const therapist = await prisma.therapist.create({
      data: {
        name: "Payout Concurrency Consultant",
        slug: STAMP,
        bio: "test",
        feeMinor: 100000,
        status: "APPROVED",
        commissionBps: 3500,
      },
    });
    therapistId = therapist.id;

    await prisma.ledgerEntry.create({
      data: {
        entryType: "COMMISSION_ACCRUED",
        amountMinor: EARNED,
        description: "seed earnings for payout concurrency suite",
        therapistId,
      },
    });
  });

  afterAll(async () => {
    await prisma.ledgerEntry.deleteMany({ where: { therapistId } });
    await prisma.payout.deleteMany({ where: { therapistId } });
    await prisma.therapist.delete({ where: { id: therapistId } });
    await prisma.user.deleteMany({ where: { email: { contains: STAMP } } });
    await prisma.$disconnect();
  });

  it("concurrent payout creation never over-draws the payable balance", async () => {
    const results = await Promise.allSettled([
      createPayout({ therapistId, session: adminSession }),
      createPayout({ therapistId, session: adminSession }),
      createPayout({ therapistId, session: adminSession }),
    ]);

    // Exactly one full-balance payout may be reserved; the losers must be
    // rejected rather than stacking reservations on the same earnings.
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled).toHaveLength(1);

    const reserved = await prisma.payout.aggregate({
      _sum: { amountMinor: true },
      where: { therapistId, status: { in: ["PENDING", "PROCESSING"] } },
    });
    expect(reserved._sum.amountMinor).toBe(EARNED);

    const balance = await consultantBalance(therapistId);
    expect(balance.payableMinor).toBe(0);
    expect(balance.reservedMinor).toBe(EARNED);
  });

  it("concurrent settlement posts the payout to the ledger exactly once", async () => {
    await prisma.payout.deleteMany({ where: { therapistId } });
    const payout = await createPayout({
      therapistId,
      amountMinor: 100000,
      session: adminSession,
    });

    const results = await Promise.allSettled([
      transitionPayout({
        payoutId: payout.id,
        toStatus: "PAID",
        reference: "REF-A",
        session: adminSession,
      }),
      transitionPayout({
        payoutId: payout.id,
        toStatus: "PAID",
        reference: "REF-B",
        session: adminSession,
      }),
      transitionPayout({
        payoutId: payout.id,
        toStatus: "PAID",
        reference: "REF-C",
        session: adminSession,
      }),
    ]);

    // Settling an already-PAID payout is idempotent, so racing callers all
    // succeed — but only the CAS winner may touch the ledger.
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);

    const posts = await prisma.ledgerEntry.count({
      where: { payoutId: payout.id },
    });
    expect(posts).toBe(1);

    const balance = await consultantBalance(therapistId);
    expect(balance.paidMinor).toBe(100000);
  });

  it("rejects an illegal transition out of a terminal payout", async () => {
    const settled = await prisma.payout.findFirst({
      where: { therapistId, status: "PAID" },
    });
    expect(settled).not.toBeNull();

    await expect(
      transitionPayout({
        payoutId: settled!.id,
        toStatus: "PROCESSING",
        session: adminSession,
      }),
    ).rejects.toThrow(/Illegal payout transition/);
  });
});
