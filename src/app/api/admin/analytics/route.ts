import { NextResponse } from "next/server";
import { resolveRange } from "@/server/dateRange";
import {
  bookingSeries,
  clientGrowthSeries,
  consultantPerformance,
  overviewKpis,
  revenueSeries,
  statusDistribution,
} from "@/server/services/analyticsService";
import { badRequest, handleApi, requireAdmin } from "@/server/http";

// Single aggregation endpoint feeding the dashboard: KPIs and all chart
// series for the requested window (?range=7d|30d|90d|month|year|custom).

export const GET = handleApi(async (request: Request) => {
  await requireAdmin(request);
  const { searchParams } = new URL(request.url);

  let range;
  try {
    range = resolveRange(searchParams);
  } catch {
    throw badRequest("Invalid date range");
  }

  const [kpis, revenue, bookings, clients, statuses, consultants] = await Promise.all([
    overviewKpis(range),
    revenueSeries(range),
    bookingSeries(range),
    clientGrowthSeries(range),
    statusDistribution(range),
    consultantPerformance(range),
  ]);

  return NextResponse.json({
    range: { key: range.key, from: range.from, to: range.to, granularity: range.granularity },
    kpis,
    series: { revenue, bookings, clients },
    statusDistribution: statuses,
    consultantPerformance: consultants,
  });
});
