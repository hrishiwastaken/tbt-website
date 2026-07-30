import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApi, requireReception } from "@/server/http";

// Consultant roster for front-desk filters and scheduling. Deliberately a
// narrower projection than /api/admin/consultants: no commission rates, no
// ledger balances, no payout figures — the desk only needs to know who can
// be booked and at what fee.

export const GET = handleApi(async (request: Request) => {
  await requireReception(request);

  const consultants = await prisma.therapist.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      photo: true,
      status: true,
      isActive: true,
      feeMinor: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ consultants });
});
