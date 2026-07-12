import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { releaseExpiredReservations } from "@/server/services/bookingService";
import { badRequest, handleApi, notFound } from "@/server/http";

export const GET = handleApi(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const therapistSlug = searchParams.get("therapist");
  const dateStr = searchParams.get("date"); // YYYY-MM-DD

  if (!therapistSlug || !dateStr) {
    throw badRequest("Missing therapist slug or date parameter");
  }

  const therapist = await prisma.therapist.findUnique({
    where: { slug: therapistSlug },
  });
  if (!therapist || !therapist.isActive || therapist.status !== "APPROVED") {
    throw notFound("Therapist not found");
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) throw badRequest("Invalid date format");

  // Free any lapsed payment holds before reporting availability.
  await releaseExpiredReservations();

  const startOfDay = new Date(`${dateStr}T00:00:00`);
  const endOfDay = new Date(`${dateStr}T23:59:59.999`);

  const [weeklySlots, heldSlots, blocks] = await Promise.all([
    prisma.therapistAvailability.findMany({
      where: { therapistId: therapist.id, dayOfWeek: date.getDay() },
    }),
    // BookingSlot rows are the single source of truth for live holds.
    prisma.bookingSlot.findMany({
      where: {
        therapistId: therapist.id,
        startAt: { gte: startOfDay, lte: endOfDay },
      },
      select: { startAt: true },
    }),
    prisma.slotBlock.findMany({
      where: {
        therapistId: therapist.id,
        startAt: { lt: endOfDay },
        endAt: { gt: startOfDay },
      },
    }),
  ]);

  const heldTimes = new Set(
    heldSlots.map(
      (s) =>
        `${String(s.startAt.getHours()).padStart(2, "0")}:${String(s.startAt.getMinutes()).padStart(2, "0")}`,
    ),
  );

  const availableSlots = weeklySlots
    .map((slot) => {
      const slotStart = new Date(`${dateStr}T${slot.startTime}:00`);
      const slotEnd = new Date(`${dateStr}T${slot.endTime}:00`);
      const isBlocked = blocks.some(
        (b) => b.startAt < slotEnd && b.endAt > slotStart,
      );
      const isPast = slotStart.getTime() <= Date.now();
      return {
        id: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isAvailable: !heldTimes.has(slot.startTime) && !isBlocked && !isPast,
      };
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return NextResponse.json({ slots: availableSlots });
});
