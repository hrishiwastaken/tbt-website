import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { transitionBooking } from "@/server/services/bookingService";
import { badRequest, forbidden, handleApi, notFound, parseBody } from "@/server/http";

const CUTOFF_HOURS = 12;

const cancelSchema = z.object({
  bookingId: z.string().min(1),
  reason: z.string().max(500).optional(),
});

export const POST = handleApi(async (request: Request) => {
  const { bookingId, reason } = parseBody(cancelSchema, await request.json());

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw notFound("Booking not found");
  if (["CANCELLED", "REFUNDED"].includes(booking.status)) {
    throw badRequest("Booking is already cancelled");
  }

  const hoursUntilSession = (booking.dateTime.getTime() - Date.now()) / 3600000;
  if (hoursUntilSession < CUTOFF_HOURS) {
    throw forbidden(
      `Cancellations are only permitted at least ${CUTOFF_HOURS} hours before the scheduled appointment. Your session starts in ${Math.max(0, hoursUntilSession).toFixed(1)} hours.`
    );
  }

  // Cancel the session. If money was collected the booking rolls into
  // REFUND_PENDING so the refund is executed (and ledger-reversed) by staff
  // through the admin console rather than silently flipping flags.
  const cancelled = await transitionBooking({
    bookingId,
    toStatus: "CANCELLED",
    actorType: "CLIENT",
    reason: reason ?? "Cancelled by client",
  });

  let finalBooking = cancelled;
  if (booking.paymentStatus === "PAID") {
    finalBooking = await transitionBooking({
      bookingId,
      toStatus: "REFUND_PENDING",
      actorType: "SYSTEM",
      reason: "Paid booking cancelled — refund queued for processing",
    });
  }

  return NextResponse.json({
    message:
      booking.paymentStatus === "PAID"
        ? "Appointment cancelled. Your refund is being processed."
        : "Appointment successfully cancelled.",
    booking: finalBooking,
  });
});
