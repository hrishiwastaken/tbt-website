import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApi, parseBody, requireTherapist } from "@/server/http";
import { recordAudit } from "@/server/audit";

export const GET = handleApi(async (request: Request) => {
  const { therapistId } = await requireTherapist(request);
  const [weekly, blocks] = await Promise.all([
    prisma.therapistAvailability.findMany({
      where: { therapistId },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
    prisma.slotBlock.findMany({
      where: { therapistId, endAt: { gte: new Date() } },
      orderBy: { startAt: "asc" },
    }),
  ]);
  return NextResponse.json({ weekly, blocks });
});

const putSchema = z.object({
  weekly: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      startTime: z.string().regex(/^\d{2}:\d{2}$/),
      endTime: z.string().regex(/^\d{2}:\d{2}$/),
    }),
  ),
});

// Replaces the full weekly template — the consultant owns their own schedule.
export const PUT = handleApi(async (request: Request) => {
  const { session, therapistId } = await requireTherapist(request);
  const { weekly } = parseBody(putSchema, await request.json());

  await prisma.$transaction(async (tx) => {
    await tx.therapistAvailability.deleteMany({ where: { therapistId } });
    if (weekly.length > 0) {
      await tx.therapistAvailability.createMany({
        data: weekly.map((slot) => ({ therapistId, ...slot })),
      });
    }
    await recordAudit(
      {
        session,
        action: "consultant.update_own_availability",
        entityType: "Therapist",
        entityId: therapistId,
      },
      tx,
    );
  });

  const updated = await prisma.therapistAvailability.findMany({
    where: { therapistId },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
  return NextResponse.json({ weekly: updated });
});
