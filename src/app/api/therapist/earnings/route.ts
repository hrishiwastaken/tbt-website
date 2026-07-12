import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApi, requireTherapist } from "@/server/http";
import { consultantBalance } from "@/server/services/ledgerService";

// Read-only earnings view. Payouts are created and settled by admin staff —
// a consultant can see their balance and history but never mutate it here.

export const GET = handleApi(async (request: Request) => {
  const { therapistId } = await requireTherapist(request);

  const [balance, payouts, entries] = await Promise.all([
    consultantBalance(therapistId),
    prisma.payout.findMany({
      where: { therapistId },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.ledgerEntry.findMany({
      where: {
        therapistId,
        entryType: {
          in: ["COMMISSION_ACCRUED", "COMMISSION_REVERSED", "PAYOUT_PAID"],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return NextResponse.json({ balance, payouts, entries });
});
