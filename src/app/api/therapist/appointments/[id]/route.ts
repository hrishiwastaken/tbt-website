import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { decryptText, encryptText } from "@/lib/encryption";
import {
  badRequest,
  clientIp,
  handleApi,
  notFound,
  parseBody,
  requireTherapist,
} from "@/server/http";
import { isBookingStatus } from "@/server/domain/bookingStatus";
import { transitionBooking } from "@/server/services/bookingService";
import { recordAudit } from "@/server/audit";

// Own-scoped booking detail + limited actions. A consultant can mark their
// own sessions complete/no-show/cancelled, request a refund, and keep
// clinical notes — but cannot reschedule, execute refunds, or touch a
// booking that isn't theirs (ownership is checked before every mutation).

const THERAPIST_ALLOWED_TRANSITIONS = new Set([
  "COMPLETED",
  "NO_SHOW",
  "CANCELLED",
  "REFUND_PENDING",
]);

async function loadOwnBooking(id: string, therapistId: string) {
  const booking = await prisma.booking.findFirst({
    where: { id, therapistId },
  });
  if (!booking) throw notFound("Appointment not found");
  return booking;
}

export const GET = handleApi(
  async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
    const { therapistId } = await requireTherapist(request);
    const { id } = await ctx.params;

    const booking = await prisma.booking.findFirst({
      where: { id, therapistId },
      include: {
        client: true,
        service: true,
        payments: { orderBy: { createdAt: "desc" } },
        statusHistory: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!booking) throw notFound("Appointment not found");

    return NextResponse.json({
      booking: {
        ...booking,
        notes: booking.notes ? decryptText(booking.notes) : "",
      },
    });
  },
);

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("transition"),
    toStatus: z.string(),
    reason: z.string().max(500).optional(),
  }),
  z.object({ action: z.literal("notes"), notes: z.string().max(10000) }),
]);

export const PATCH = handleApi(
  async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
    const { session, therapistId } = await requireTherapist(request);
    const { id } = await ctx.params;
    const body = parseBody(patchSchema, await request.json());
    const ip = clientIp(request);

    await loadOwnBooking(id, therapistId);

    if (body.action === "transition") {
      if (
        !isBookingStatus(body.toStatus) ||
        !THERAPIST_ALLOWED_TRANSITIONS.has(body.toStatus)
      ) {
        throw badRequest(
          "Consultants may only mark sessions completed, no-show, cancelled, or request a refund",
        );
      }
      const booking = await transitionBooking({
        bookingId: id,
        toStatus: body.toStatus,
        session,
        actorType: "THERAPIST",
        reason: body.reason,
        ip,
      });
      return NextResponse.json({ booking });
    }

    // notes
    const booking = await prisma.booking.update({
      where: { id },
      data: { notes: body.notes ? encryptText(body.notes) : null },
    });
    await recordAudit({
      session,
      action: "booking.update_notes",
      entityType: "Booking",
      entityId: id,
      ip,
    });
    return NextResponse.json({ booking: { ...booking, notes: body.notes } });
  },
);
