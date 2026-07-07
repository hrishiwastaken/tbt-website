import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { LedgerEntryType } from "../domain/postings";

// Read-side of the ledger: balances and financial summaries are always sums
// over immutable entries — no stored counters to drift out of sync.

export interface DateWindow {
  from?: Date;
  to?: Date;
}

export async function sumEntries(
  types: LedgerEntryType[],
  window: DateWindow = {},
  therapistId?: string,
  tx: Prisma.TransactionClient = prisma
): Promise<number> {
  const result = await tx.ledgerEntry.aggregate({
    _sum: { amountMinor: true },
    where: {
      entryType: { in: types },
      ...(therapistId ? { therapistId } : {}),
      ...(window.from || window.to
        ? { createdAt: { ...(window.from ? { gte: window.from } : {}), ...(window.to ? { lte: window.to } : {}) } }
        : {}),
    },
  });
  return result._sum.amountMinor ?? 0;
}

export interface FinancialSummary {
  grossRevenueMinor: number;
  refundsMinor: number; // positive number (magnitude of refunds)
  netRevenueMinor: number;
  platformRevenueMinor: number; // net of reversals
  consultantEarnedMinor: number; // commission accrued net of reversals
  consultantPaidMinor: number; // settled payouts (magnitude)
  taxCollectedMinor: number;
  discountsMinor: number; // magnitude
}

export async function financialSummary(window: DateWindow = {}): Promise<FinancialSummary> {
  const grouped = await prisma.ledgerEntry.groupBy({
    by: ["entryType"],
    _sum: { amountMinor: true },
    where:
      window.from || window.to
        ? { createdAt: { ...(window.from ? { gte: window.from } : {}), ...(window.to ? { lte: window.to } : {}) } }
        : undefined,
  });
  const sums = new Map<string, number>(grouped.map((g) => [g.entryType, g._sum.amountMinor ?? 0]));
  const get = (t: LedgerEntryType): number => sums.get(t) ?? 0;

  const gross = get("GROSS_REVENUE");
  const refunds = -get("REFUND");
  return {
    grossRevenueMinor: gross,
    refundsMinor: refunds,
    netRevenueMinor: gross + get("DISCOUNT") + get("REFUND"), // DISCOUNT/REFUND entries are negative
    platformRevenueMinor: get("PLATFORM_REVENUE") + get("PLATFORM_REVENUE_REVERSED"),
    consultantEarnedMinor: get("COMMISSION_ACCRUED") + get("COMMISSION_REVERSED"),
    consultantPaidMinor: -get("PAYOUT_PAID"),
    taxCollectedMinor: get("TAX_COLLECTED"),
    discountsMinor: -get("DISCOUNT"),
  };
}

export interface ConsultantBalance {
  therapistId: string;
  earnedMinor: number; // lifetime commission net of reversals
  paidMinor: number; // settled payouts
  reservedMinor: number; // pending/processing payout amounts
  payableMinor: number; // earned - paid - reserved
}

/** Lifetime payable balance per consultant, derived entirely from the ledger. */
export async function consultantBalances(therapistId?: string): Promise<ConsultantBalance[]> {
  const [entries, reservations] = await Promise.all([
    prisma.ledgerEntry.groupBy({
      by: ["therapistId", "entryType"],
      _sum: { amountMinor: true },
      where: {
        therapistId: therapistId ? therapistId : { not: null },
        entryType: { in: ["COMMISSION_ACCRUED", "COMMISSION_REVERSED", "PAYOUT_PAID"] },
      },
    }),
    prisma.payout.groupBy({
      by: ["therapistId"],
      _sum: { amountMinor: true },
      where: {
        status: { in: ["PENDING", "PROCESSING"] },
        ...(therapistId ? { therapistId } : {}),
      },
    }),
  ]);

  const byTherapist = new Map<string, ConsultantBalance>();
  const ensure = (id: string): ConsultantBalance => {
    let bal = byTherapist.get(id);
    if (!bal) {
      bal = { therapistId: id, earnedMinor: 0, paidMinor: 0, reservedMinor: 0, payableMinor: 0 };
      byTherapist.set(id, bal);
    }
    return bal;
  };

  for (const row of entries) {
    if (!row.therapistId) continue;
    const bal = ensure(row.therapistId);
    const amount = row._sum.amountMinor ?? 0;
    if (row.entryType === "PAYOUT_PAID") bal.paidMinor += -amount;
    else bal.earnedMinor += amount;
  }
  for (const row of reservations) {
    ensure(row.therapistId).reservedMinor += row._sum.amountMinor ?? 0;
  }
  for (const bal of byTherapist.values()) {
    bal.payableMinor = bal.earnedMinor - bal.paidMinor - bal.reservedMinor;
  }
  return [...byTherapist.values()];
}

export async function consultantBalance(therapistId: string): Promise<ConsultantBalance> {
  const [balance] = await consultantBalances(therapistId);
  return (
    balance ?? { therapistId, earnedMinor: 0, paidMinor: 0, reservedMinor: 0, payableMinor: 0 }
  );
}
