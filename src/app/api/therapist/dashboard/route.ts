import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveRange } from "@/server/dateRange";
import { bookingSeries, revenueSeries, statusDistribution, therapistOverviewKpis } from "@/server/services/analyticsService";
import { badRequest, handleApi, requireTherapist } from "@/server/http";

// Own-scoped dashboard: identical shape/approach to the admin analytics
// endpoint, but every query is filtered to this consultant's therapistId.

export const GET = handleApi(async (request: Request) => {
  const { therapistId } = await requireTherapist(request);
  const { searchParams } = new URL(request.url);

  let range;
  try {
    range = resolveRange(searchParams);
  } catch {
    throw badRequest("Invalid date range");
  }

  const [kpis, revenue, bookings, statuses, upcoming] = await Promise.all([
    therapistOverviewKpis(range, therapistId),
    revenueSeries(range, therapistId),
    bookingSeries(range, therapistId),
    statusDistribution(range, therapistId),
    prisma.booking.findMany({
      where: { therapistId, dateTime: { gte: new Date() }, status: { in: ["PENDING", "AWAITING_PAYMENT", "CONFIRMED"] } },
      include: { client: { select: { name: true } }, service: { select: { name: true } } },
      orderBy: { dateTime: "asc" },
      take: 8,
    }),
  ]);

  return NextResponse.json({
    range: { key: range.key, from: range.from, to: range.to, granularity: range.granularity },
    kpis,
    series: { revenue, bookings },
    statusDistribution: statuses,
    upcomingAppointments: upcoming,
  });
});
