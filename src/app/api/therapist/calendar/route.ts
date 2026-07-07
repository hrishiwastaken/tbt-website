import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApi, requireTherapist } from "@/server/http";

// Week-scoped schedule: bookings, the weekly availability template, and any
// one-off slot blocks (leave/unavailability) for the requested window.
// Defaults to the current week (Monday–Sunday) when no range is given.

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  const day = (out.getDay() + 6) % 7; // days since Monday
  out.setDate(out.getDate() - day);
  out.setHours(0, 0, 0, 0);
  return out;
}

export const GET = handleApi(async (request: Request) => {
  const { therapistId } = await requireTherapist(request);
  const { searchParams } = new URL(request.url);

  const fromParam = searchParams.get("from");
  const from = fromParam ? new Date(`${fromParam}T00:00:00`) : startOfWeek(new Date());
  const to = new Date(from);
  to.setDate(to.getDate() + 6);
  to.setHours(23, 59, 59, 999);

  const [bookings, availability, blocks] = await Promise.all([
    prisma.booking.findMany({
      where: {
        therapistId,
        dateTime: { gte: from, lte: to },
        status: { in: ["PENDING", "AWAITING_PAYMENT", "CONFIRMED", "COMPLETED", "NO_SHOW"] },
      },
      include: { client: { select: { name: true } }, service: { select: { name: true } } },
      orderBy: { dateTime: "asc" },
    }),
    prisma.therapistAvailability.findMany({
      where: { therapistId },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
    prisma.slotBlock.findMany({
      where: { therapistId, startAt: { lte: to }, endAt: { gte: from } },
      orderBy: { startAt: "asc" },
    }),
  ]);

  return NextResponse.json({ from, to, bookings, availability, blocks });
});
