import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApi, parseBody, requireAdmin } from "@/server/http";
import { transitionPayout } from "@/server/services/payoutService";

const patchSchema = z.object({
  toStatus: z.enum(["PROCESSING", "PAID", "FAILED", "CANCELLED"]),
  reference: z.string().max(120).optional(),
});

export const PATCH = handleApi(
  async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
    const session = await requireAdmin(request);
    const { id } = await ctx.params;
    const body = parseBody(patchSchema, await request.json());
    const payout = await transitionPayout({ payoutId: id, ...body, session });
    return NextResponse.json({ payout });
  },
);
