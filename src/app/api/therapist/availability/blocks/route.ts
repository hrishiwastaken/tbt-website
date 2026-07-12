import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  badRequest,
  handleApi,
  parseBody,
  requireTherapist,
} from "@/server/http";
import { recordAudit } from "@/server/audit";

const createSchema = z.object({
  startAt: z
    .string()
    .datetime()
    .or(z.string().datetime({ local: true })),
  endAt: z
    .string()
    .datetime()
    .or(z.string().datetime({ local: true })),
  reason: z.string().max(200).optional(),
});

// One-off unavailability (leave, appointments elsewhere) layered on top of
// the weekly template — blocks the affected slots without touching it.
export const POST = handleApi(async (request: Request) => {
  const { session, therapistId } = await requireTherapist(request);
  const body = parseBody(createSchema, await request.json());

  const startAt = new Date(body.startAt);
  const endAt = new Date(body.endAt);
  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime()) || startAt >= endAt) {
    throw badRequest("Invalid date range");
  }

  const block = await prisma.slotBlock.create({
    data: { therapistId, startAt, endAt, reason: body.reason ?? null },
  });
  await recordAudit({
    session,
    action: "consultant.add_slot_block",
    entityType: "SlotBlock",
    entityId: block.id,
    detail: { startAt: startAt.toISOString(), endAt: endAt.toISOString() },
  });
  return NextResponse.json({ block }, { status: 201 });
});
