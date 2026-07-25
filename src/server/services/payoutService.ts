import { prisma } from "@/lib/db";
import { payoutPaidPosting } from "../domain/postings";
import { insertPostings } from "./paymentService";
import { consultantBalance } from "./ledgerService";
import { badRequest, conflict, notFound, type Session } from "../http";
import { recordAudit } from "../audit";

// Payout lifecycle: PENDING → PROCESSING → PAID (or FAILED/CANCELLED).
// Creating a payout reserves balance (pending payouts subtract from
// payable); marking it PAID posts the immutable PAYOUT_PAID ledger entry.

export async function createPayout(input: {
  therapistId: string;
  amountMinor?: number; // defaults to the full payable balance
  method?: string;
  note?: string;
  session: Session;
}) {
  // The balance check and the reservation must be atomic: read-then-create
  // without a lock lets concurrent admins each see the same payable balance
  // and every one of them pass the guard, over-drawing the consultant.
  // The FOR UPDATE lock on the consultant row serializes payout creation.
  const { payout, amountMinor } = await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<
      { id: string }[]
    >`SELECT id FROM "Therapist" WHERE id = ${input.therapistId} FOR UPDATE`;
    if (locked.length === 0) throw notFound("Consultant not found");

    const balance = await consultantBalance(input.therapistId, tx);
    const amount = input.amountMinor ?? balance.payableMinor;
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw badRequest(
        "Payout amount must be a positive integer amount in paise",
      );
    }
    if (amount > balance.payableMinor) {
      throw conflict(
        `Payout exceeds payable balance (${balance.payableMinor} paise available)`,
      );
    }

    const created = await tx.payout.create({
      data: {
        therapistId: input.therapistId,
        amountMinor: amount,
        status: "PENDING",
        method: input.method ?? "BANK_TRANSFER",
        note: input.note ?? null,
        initiatedById: input.session.userId,
      },
    });
    return { payout: created, amountMinor: amount };
  });

  await recordAudit({
    session: input.session,
    action: "payout.create",
    entityType: "Payout",
    entityId: payout.id,
    detail: { therapistId: input.therapistId, amountMinor },
  });
  return payout;
}

const PAYOUT_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["PROCESSING", "PAID", "CANCELLED"],
  PROCESSING: ["PAID", "FAILED", "CANCELLED"],
  FAILED: ["PROCESSING", "CANCELLED"],
  PAID: [],
  CANCELLED: [],
};

export async function transitionPayout(input: {
  payoutId: string;
  toStatus: "PROCESSING" | "PAID" | "FAILED" | "CANCELLED";
  reference?: string;
  session: Session;
}) {
  return prisma.$transaction(async (tx) => {
    const payout = await tx.payout.findUnique({
      where: { id: input.payoutId },
    });
    if (!payout) throw notFound("Payout not found");
    if (payout.status === input.toStatus) return payout; // idempotent
    if (!PAYOUT_TRANSITIONS[payout.status]?.includes(input.toStatus)) {
      throw conflict(
        `Illegal payout transition ${payout.status} → ${input.toStatus}`,
      );
    }

    // Compare-and-swap on the status we validated against. A plain update
    // would let concurrent PAID transitions each pass the guard above and
    // each post a PAYOUT_PAID entry, permanently corrupting the append-only
    // ledger. Only the caller whose CAS wins (count === 1) may post.
    const gate = await tx.payout.updateMany({
      where: { id: payout.id, status: payout.status },
      data: {
        status: input.toStatus,
        reference: input.reference ?? payout.reference,
        paidAt: input.toStatus === "PAID" ? new Date() : payout.paidAt,
      },
    });
    if (gate.count !== 1) {
      // Someone else moved this payout while we were validating.
      const current = await tx.payout.findUniqueOrThrow({
        where: { id: payout.id },
      });
      if (current.status === input.toStatus) return current; // idempotent
      throw conflict(
        `Illegal payout transition ${current.status} → ${input.toStatus}`,
      );
    }
    const updated = await tx.payout.findUniqueOrThrow({
      where: { id: payout.id },
    });

    if (input.toStatus === "PAID") {
      // Settlement hits the ledger exactly once — authorized by the CAS above
      // and posted inside the same transaction as that CAS.
      await insertPostings(tx, [
        payoutPaidPosting({
          payoutId: payout.id,
          therapistId: payout.therapistId,
          amountMinor: payout.amountMinor,
          reference: input.reference,
        }),
      ]);
    }

    await recordAudit(
      {
        session: input.session,
        action: `payout.${input.toStatus.toLowerCase()}`,
        entityType: "Payout",
        entityId: payout.id,
        detail: {
          from: payout.status,
          to: input.toStatus,
          reference: input.reference,
        },
      },
      tx,
    );
    return updated;
  });
}
