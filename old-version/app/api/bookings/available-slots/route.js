import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const therapistSlug = searchParams.get("therapist");
    const dateStr = searchParams.get("date"); // YYYY-MM-DD

    if (!therapistSlug || !dateStr) {
      return NextResponse.json(
        { error: "Missing therapist slug or date parameter" },
        { status: 400 }
      );
    }

    // 1. Fetch therapist
    const therapist = await prisma.therapist.findUnique({
      where: { slug: therapistSlug },
    });

    if (!therapist) {
      return NextResponse.json({ error: "Therapist not found" }, { status: 404 });
    }

    // 2. Parse date and find day of week
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // 3. Fetch weekly availability for this day of week
    const weeklySlots = await prisma.therapistAvailability.findMany({
      where: {
        therapistId: therapist.id,
        dayOfWeek: dayOfWeek,
      },
    });

    // 4. Fetch bookings for this therapist on this specific day
    const startOfDay = new Date(dateStr);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(dateStr);
    endOfDay.setHours(23, 59, 59, 999);

    const activeBookings = await prisma.booking.findMany({
      where: {
        therapistId: therapist.id,
        dateTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: ["CONFIRMED", "PENDING", "COMPLETED"], // Include pending to avoid double-bookings during checkout
        },
      },
    });

    // Helper to format time into "HH:MM" for matching
    const getFormattedTime = (dateObj) => {
      const hours = String(dateObj.getHours()).padStart(2, "0");
      const minutes = String(dateObj.getMinutes()).padStart(2, "0");
      return `${hours}:${minutes}`;
    };

    // 5. Filter out booked slots
    const availableSlots = weeklySlots.map((slot) => {
      // Check if this slot overlaps with any active booking
      const isBooked = activeBookings.some((booking) => {
        const bookingTime = getFormattedTime(booking.dateTime);
        return bookingTime === slot.startTime;
      });

      return {
        id: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isAvailable: !isBooked,
      };
    });

    // Sort slots by time
    availableSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));

    return NextResponse.json({ slots: availableSlots });
  } catch (error) {
    console.error("Error fetching slots:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
