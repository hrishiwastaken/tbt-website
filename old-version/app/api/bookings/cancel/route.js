import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request) {
  try {
    const { bookingId } = await request.json();

    if (!bookingId) {
      return NextResponse.json({ error: "Missing booking ID" }, { status: 400 });
    }

    // Fetch booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status === "CANCELLED") {
      return NextResponse.json({ error: "Booking is already cancelled" }, { status: 400 });
    }

    // Verify cancellation cutoff window (12 hours)
    const now = new Date();
    const sessionTime = new Date(booking.dateTime);
    const differenceInMs = sessionTime.getTime() - now.getTime();
    const differenceInHours = differenceInMs / (1000 * 60 * 60);

    const CUTOFF_HOURS = 12;

    if (differenceInHours < CUTOFF_HOURS) {
      return NextResponse.json(
        {
          error: `Cancellations or rescheduling are only permitted at least ${CUTOFF_HOURS} hours before the scheduled appointment. Your session starts in ${Math.max(0, differenceInHours).toFixed(1)} hours.`,
        },
        { status: 403 }
      );
    }

    // Update status to CANCELLED
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "CANCELLED",
        paymentStatus: booking.paymentStatus === "PAID" ? "REFUNDED" : booking.paymentStatus,
      },
    });

    // Update corresponding payment records
    if (booking.paymentStatus === "PAID") {
      await prisma.payment.updateMany({
        where: { bookingId: booking.id, status: "SUCCESS" },
        data: { status: "REFUNDED" },
      });
    }

    return NextResponse.json({
      message: "Appointment successfully cancelled.",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Cancellation Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
