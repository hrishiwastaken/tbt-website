import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApi, parseBody, requireAdmin } from "@/server/http";
import {
  getDefaultCommissionBps,
  setDefaultCommissionBps,
} from "@/server/services/commissionService";

export const GET = handleApi(async (request: Request) => {
  await requireAdmin(request);
  const [defaultBps, history] = await Promise.all([
    getDefaultCommissionBps(),
    prisma.commissionSetting.findMany({
      where: { scope: "DEFAULT" },
      orderBy: { effectiveFrom: "desc" },
      take: 20,
    }),
  ]);
  return NextResponse.json({ defaultCommissionBps: defaultBps, history });
});

const putSchema = z.object({
  // Business rule: consultants earn 30–35%; wider bounds are rejected here
  // (the domain layer allows 0–10000 for adjustments via overrides).
  commissionBps: z.number().int().min(3000).max(3500),
});

export const PUT = handleApi(async (request: Request) => {
  const session = await requireAdmin(request);
  const { commissionBps } = parseBody(putSchema, await request.json());
  await setDefaultCommissionBps(commissionBps, session);
  return NextResponse.json({ defaultCommissionBps: commissionBps });
});
