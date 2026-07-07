import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DEFAULT_COMMISSION_BPS, isValidCommissionBps, resolveCommissionBps } from "../domain/commission";
import { recordAudit } from "../audit";
import { badRequest, notFound, type Session } from "../http";

// Commission configuration. The default rate is an append-only history of
// CommissionSetting rows; per-consultant overrides live on Therapist and are
// journalled for audit. Bookings freeze the resolved bps at creation time.

export async function getDefaultCommissionBps(
  tx: Prisma.TransactionClient = prisma,
  at: Date = new Date()
): Promise<number> {
  const setting = await tx.commissionSetting.findFirst({
    where: { scope: "DEFAULT", effectiveFrom: { lte: at } },
    orderBy: { effectiveFrom: "desc" },
  });
  return setting?.commissionBps ?? DEFAULT_COMMISSION_BPS;
}

export async function setDefaultCommissionBps(bps: number, session: Session): Promise<void> {
  if (!isValidCommissionBps(bps)) throw badRequest("Commission must be an integer between 0 and 10000 bps");
  await prisma.$transaction(async (tx) => {
    await tx.commissionSetting.create({
      data: { scope: "DEFAULT", commissionBps: bps, createdById: session.userId },
    });
    await recordAudit(
      {
        session,
        action: "commission.set_default",
        entityType: "CommissionSetting",
        detail: { commissionBps: bps },
      },
      tx
    );
  });
}

export async function setTherapistCommission(
  therapistId: string,
  bps: number | null,
  session: Session
): Promise<void> {
  if (bps !== null && !isValidCommissionBps(bps)) {
    throw badRequest("Commission must be an integer between 0 and 10000 bps");
  }
  await prisma.$transaction(async (tx) => {
    const therapist = await tx.therapist.findUnique({ where: { id: therapistId } });
    if (!therapist) throw notFound("Consultant not found");
    await tx.therapist.update({ where: { id: therapistId }, data: { commissionBps: bps } });
    if (bps !== null) {
      await tx.commissionSetting.create({
        data: { scope: "THERAPIST", therapistId, commissionBps: bps, createdById: session.userId },
      });
    }
    await recordAudit(
      {
        session,
        action: "commission.set_override",
        entityType: "Therapist",
        entityId: therapistId,
        detail: { commissionBps: bps },
      },
      tx
    );
  });
}

/** Resolve the bps a new booking for this therapist should snapshot. */
export async function resolveBookingCommissionBps(
  therapist: { commissionBps: number | null },
  tx: Prisma.TransactionClient = prisma
): Promise<number> {
  const defaultBps = await getDefaultCommissionBps(tx);
  return resolveCommissionBps(therapist.commissionBps, defaultBps);
}
