import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApi, notFound, requireTherapist } from "@/server/http";
import { recordAudit } from "@/server/audit";

export const DELETE = handleApi(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { session, therapistId } = await requireTherapist(request);
  const { id } = await ctx.params;

  const block = await prisma.slotBlock.findFirst({ where: { id, therapistId } });
  if (!block) throw notFound("Block not found");

  await prisma.slotBlock.delete({ where: { id } });
  await recordAudit({ session, action: "consultant.remove_slot_block", entityType: "SlotBlock", entityId: id });
  return NextResponse.json({ message: "Availability block removed" });
});
