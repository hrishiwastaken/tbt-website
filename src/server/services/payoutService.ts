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
  const therapist = await prisma.therapist.findUnique({
    where: { id: input.therapistId },
  });
  if (!therapist) throw notFound("Consultant not found");

  const balance = await consultantBalance(input.therapistId);
  const amountMinor = input.amountMinor ?? balance.payableMinor;
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw badRequest(
      "Payout amount must be a positive integer amount in paise",
    );
  }
  if (amountMinor > balance.payableMinor) {
    throw conflict(
      `Payout exceeds payable balance (${balance.payableMinor} paise available)`,
    );
  }

  const payout = await prisma.payout.create({
    data: {
      therapistId: input.therapistId,
      amountMinor,
      status: "PENDING",
      method: input.method ?? "BANK_TRANSFER",
      note: input.note ?? null,
      initiatedById: input.session.userId,
    },
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

    const updated = await tx.payout.update({
      where: { id: payout.id },
      data: {
        status: input.toStatus,
        reference: input.reference ?? payout.reference,
        paidAt: input.toStatus === "PAID" ? new Date() : payout.paidAt,
      },
    });

    if (input.toStatus === "PAID") {
      // Settlement hits the ledger exactly once — guarded by the status
      // transition above (PAID is terminal and idempotent-checked).
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
