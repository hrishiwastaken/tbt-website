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
  requireAdmin,
} from "@/server/http";
import { isBookingStatus } from "@/server/domain/bookingStatus";
import {
  rescheduleBooking,
  transitionBooking,
} from "@/server/services/bookingService";
import { executeRefund } from "@/server/services/paymentService";
import { recordAudit } from "@/server/audit";

// Booking detail + admin actions. PATCH carries a discriminated action:
//   { action: "transition", toStatus, reason? }
//   { action: "reschedule", dateTime }
//   { action: "refund", amountMinor?, reason? }   (executes a REFUND_PENDING refund)
//   { action: "notes", notes }

export const GET = handleApi(
  async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
    await requireAdmin(request);
    const { id } = await ctx.params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        client: true,
        therapist: {
          select: { id: true, name: true, slug: true, commissionBps: true },
        },
        service: true,
        payments: { orderBy: { createdAt: "desc" } },
        ledgerEntries: { orderBy: { createdAt: "asc" } },
        statusHistory: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!booking) throw notFound("Booking not found");

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
  z.object({
    action: z.literal("reschedule"),
    dateTime: z.string().datetime({ local: true }).or(z.string().datetime()),
    reason: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal("refund"),
    amountMinor: z.number().int().positive().optional(),
    reason: z.string().max(500).optional(),
  }),
  z.object({ action: z.literal("notes"), notes: z.string().max(10000) }),
]);

export const PATCH = handleApi(
  async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;
    const body = parseBody(patchSchema, await request.json());
    const ip = clientIp(request);

    switch (body.action) {
      case "transition": {
        const session = await requireAdmin(request);
        if (!isBookingStatus(body.toStatus))
          throw badRequest("Unknown booking status");
        const booking = await transitionBooking({
          bookingId: id,
          toStatus: body.toStatus,
          session,
          reason: body.reason,
          ip,
        });
        return NextResponse.json({ booking });
      }
      case "reschedule": {
        const session = await requireAdmin(request);
        const newDateTime = new Date(body.dateTime);
        if (isNaN(newDateTime.getTime())) throw badRequest("Invalid date");
        const booking = await rescheduleBooking({
          bookingId: id,
          newDateTime,
          session,
          reason: body.reason,
          ip,
        });
        return NextResponse.json({ booking });
      }
      case "refund": {
        // Money leaves the platform — admins only.
        const session = await requireAdmin(request);
        await executeRefund({
          bookingId: id,
          amountMinor: body.amountMinor,
          reason: body.reason,
          session,
        });
        const booking = await prisma.booking.findUnique({ where: { id } });
        return NextResponse.json({ booking });
      }
      case "notes": {
        const session = await requireAdmin(request);
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
        return NextResponse.json({
          booking: { ...booking, notes: body.notes },
        });
      }
    }
  },
);
