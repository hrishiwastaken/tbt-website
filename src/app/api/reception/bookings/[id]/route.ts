import { NextResponse } from "next/server";
import { z } from "zod";
import { paymentReferenceSchema } from "@/server/validation";
import { prisma } from "@/lib/db";
import {
  badRequest,
  clientIp,
  forbidden,
  handleApi,
  notFound,
  parseBody,
  requireReception,
} from "@/server/http";
import { isBookingStatus } from "@/server/domain/bookingStatus";
import {
  receptionCanReschedule,
  receptionCanTransition,
} from "@/server/domain/receptionScope";
import {
  rescheduleBooking,
  transitionBooking,
} from "@/server/services/bookingService";
import { recordManualPayment } from "@/server/services/paymentService";

// Appointment detail and front-desk actions. PATCH carries a discriminated
// action:
//   { action: "transition", toStatus, reason? }   confirm / complete / cancel…
//   { action: "reschedule", dateTime, reason? }
//   { action: "record-payment", reference? }      fee collected at the desk
//
// Refund execution is absent by design — money leaving the platform stays an
// admin action (/api/admin/bookings/[id]). Clinical notes are never read or
// written here.

export const GET = handleApi(
  async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
    await requireReception(request);
    const { id } = await ctx.params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        id: true,
        dateTime: true,
        durationMinutes: true,
        amountMinor: true,
        discountMinor: true,
        taxMinor: true,
        currency: true,
        status: true,
        paymentStatus: true,
        counselingType: true,
        invoiceNumber: true,
        cancellationReason: true,
        expiresAt: true,
        createdAt: true,
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            age: true,
            emergencyContact: true,
          },
        },
        therapist: { select: { id: true, name: true, slug: true } },
        service: {
          select: { id: true, name: true, durationMinutes: true },
        },
        payments: {
          select: {
            id: true,
            kind: true,
            provider: true,
            amountMinor: true,
            status: true,
            providerPaymentId: true,
            providerRef: true,
            failureReason: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        statusHistory: {
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            reason: true,
            actorType: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!booking) throw notFound("Booking not found");

    return NextResponse.json({ booking });
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
    action: z.literal("record-payment"),
    reference: paymentReferenceSchema.optional(),
  }),
]);

export const PATCH = handleApi(
  async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
    const session = await requireReception(request);
    const { id } = await ctx.params;
    const body = parseBody(patchSchema, await request.json());
    const ip = clientIp(request);

    switch (body.action) {
      case "transition": {
        if (!isBookingStatus(body.toStatus)) {
          throw badRequest("Unknown booking status");
        }
        const current = await prisma.booking.findUnique({
          where: { id },
          select: { status: true },
        });
        if (!current) throw notFound("Booking not found");
        if (!receptionCanTransition(current.status, body.toStatus)) {
          throw forbidden(
            `The reception desk cannot move an appointment from ${current.status} to ${body.toStatus}. Ask an admin to action this.`,
          );
        }
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
        const current = await prisma.booking.findUnique({
          where: { id },
          select: { status: true },
        });
        if (!current) throw notFound("Booking not found");
        if (!receptionCanReschedule(current.status)) {
          throw forbidden(
            `A ${current.status.toLowerCase()} appointment cannot be rescheduled from the front desk`,
          );
        }
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
      case "record-payment": {
        // Cash / UPI / card collected in person. Posted through the manual
        // provider so revenue, commission and the invoice number all follow
        // the same idempotent path as a gateway payment.
        await recordManualPayment({
          bookingId: id,
          reference: body.reference,
          session,
          ip,
        });
        const booking = await prisma.booking.findUnique({
          where: { id },
          select: {
            id: true,
            status: true,
            paymentStatus: true,
            invoiceNumber: true,
          },
        });
        return NextResponse.json({ booking });
      }
    }
  },
);
