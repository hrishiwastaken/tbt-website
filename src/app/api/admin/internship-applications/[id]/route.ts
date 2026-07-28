import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApi, notFound, parseBody, requireAdmin } from "@/server/http";

const statusSchema = z.object({
  status: z.enum(["SUBMITTED", "REVIEWED", "ACCEPTED", "REJECTED"]),
});

export const PATCH = handleApi(
  async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
    await requireAdmin(request);
    const { id } = await ctx.params;
    const body = parseBody(statusSchema, await request.json());

    const existing = await prisma.internshipApplication.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw notFound("Application not found");

    const updated = await prisma.internshipApplication.update({
      where: { id },
      data: { status: body.status },
      select: {
        id: true,
        fullName: true,
        email: true,
        status: true,
      },
    });

    return NextResponse.json({ application: updated });
  },
);
