import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApi, paginated, parseBody, parsePagination, requireAdmin } from "@/server/http";
import { createPayout } from "@/server/services/payoutService";
import { consultantBalances } from "@/server/services/ledgerService";

export const GET = handleApi(async (request: Request) => {
  await requireAdmin(request);
  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);

  const where: Record<string, unknown> = {};
  const status = searchParams.get("status");
  if (status) where.status = status;
  const therapistId = searchParams.get("therapistId");
  if (therapistId) where.therapistId = therapistId;

  const [payouts, total, balances, therapists] = await Promise.all([
    prisma.payout.findMany({
      where,
      include: { therapist: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.payout.count({ where }),
    consultantBalances(),
    prisma.therapist.findMany({ select: { id: true, name: true } }),
  ]);

  const nameMap = new Map(therapists.map((t) => [t.id, t.name]));
  return NextResponse.json({
    ...paginated(payouts, total, pagination),
    balances: balances
      .map((b) => ({ ...b, name: nameMap.get(b.therapistId) ?? "Unknown" }))
      .sort((a, b) => b.payableMinor - a.payableMinor),
  });
});

const createSchema = z.object({
  therapistId: z.string().min(1),
  amountMinor: z.number().int().positive().optional(),
  method: z.string().max(60).optional(),
  note: z.string().max(500).optional(),
});

export const POST = handleApi(async (request: Request) => {
  const session = await requireAdmin(request);
  const body = parseBody(createSchema, await request.json());
  const payout = await createPayout({ ...body, session });
  return NextResponse.json({ payout }, { status: 201 });
});
