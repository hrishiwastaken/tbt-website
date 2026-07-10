import { prisma } from "@/lib/db";
import { financialSummary, consultantBalances, consultantBalance } from "./ledgerService";
import { bucketKey, bucketKeys, bucketLabel, type ResolvedRange } from "../dateRange";

// Dashboard aggregation. Every number here is derived from persisted rows
// (ledger entries, bookings, clients, payouts) — nothing is estimated or
// mocked. Range-scoped queries use the caller-resolved window.

export interface OverviewKpis {
  grossRevenueMinor: number;
  netRevenueMinor: number;
  platformRevenueMinor: number;
  refundsMinor: number;
  consultantEarnedMinor: number;
  consultantPaidMinor: number;
  consultantPayableMinor: number;
  pendingPayoutsMinor: number;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  refundedBookings: number;
  noShowBookings: number;
  upcomingBookings: number;
  activeConsultants: number;
  activeClients: number; // clients with a booking inside the range
  totalClients: number;
  newClients: number;
}

export async function overviewKpis(range: ResolvedRange): Promise<OverviewKpis> {
  const window = { from: range.from, to: range.to };
  const bookingWindow = { gte: range.from, lte: range.to };

  const [
    rangeFinancials,
    lifetimeFinancials,
    balances,
    pendingPayouts,
    bookingsByStatus,
    upcomingBookings,
    activeConsultants,
    activeClientRows,
    totalClients,
    newClients,
  ] = await Promise.all([
    financialSummary(window),
    financialSummary(),
    consultantBalances(),
    prisma.payout.aggregate({
      _sum: { amountMinor: true },
      where: { status: { in: ["PENDING", "PROCESSING"] } },
    }),
    prisma.booking.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: { createdAt: bookingWindow },
    }),
    prisma.booking.count({
      where: { status: "CONFIRMED", dateTime: { gte: new Date() } },
    }),
    prisma.therapist.count({ where: { status: "APPROVED", isActive: true } }),
    prisma.booking.findMany({
      where: { createdAt: bookingWindow },
      select: { clientId: true },
      distinct: ["clientId"],
    }),
    prisma.client.count(),
    prisma.client.count({ where: { createdAt: bookingWindow } }),
  ]);

  const statusCount = new Map<string, number>(
    bookingsByStatus.map((b) => [b.status, Number(b._count._all)])
  );
  const totalBookings = bookingsByStatus.reduce((sum, b) => sum + Number(b._count._all), 0);

  return {
    grossRevenueMinor: rangeFinancials.grossRevenueMinor,
    netRevenueMinor: rangeFinancials.netRevenueMinor,
    platformRevenueMinor: rangeFinancials.platformRevenueMinor,
    refundsMinor: rangeFinancials.refundsMinor,
    consultantEarnedMinor: rangeFinancials.consultantEarnedMinor,
    consultantPaidMinor: lifetimeFinancials.consultantPaidMinor,
    consultantPayableMinor: balances.reduce((sum, b) => sum + Math.max(0, b.payableMinor), 0),
    pendingPayoutsMinor: pendingPayouts._sum.amountMinor ?? 0,
    totalBookings,
    completedBookings: statusCount.get("COMPLETED") ?? 0,
    cancelledBookings: statusCount.get("CANCELLED") ?? 0,
    refundedBookings: (statusCount.get("REFUNDED") ?? 0) + (statusCount.get("REFUND_PENDING") ?? 0),
    noShowBookings: statusCount.get("NO_SHOW") ?? 0,
    upcomingBookings,
    activeConsultants,
    activeClients: activeClientRows.length,
    totalClients,
    newClients,
  };
}

export interface SeriesPoint {
  key: string;
  label: string;
  [metric: string]: string | number;
}

function emptySeries(range: ResolvedRange, metrics: string[]): Map<string, SeriesPoint> {
  const map = new Map<string, SeriesPoint>();
  for (const key of bucketKeys(range.from, range.to, range.granularity)) {
    const point: SeriesPoint = { key, label: bucketLabel(key, range.granularity) };
    for (const metric of metrics) point[metric] = 0;
    map.set(key, point);
  }
  return map;
}

/** Revenue over time from the ledger: gross, refunds, platform, consultant. */
export async function revenueSeries(range: ResolvedRange, therapistId?: string): Promise<SeriesPoint[]> {
  const entries = await prisma.ledgerEntry.findMany({
    where: {
      createdAt: { gte: range.from, lte: range.to },
      entryType: {
        in: [
          "GROSS_REVENUE",
          "REFUND",
          "PLATFORM_REVENUE",
          "PLATFORM_REVENUE_REVERSED",
          "COMMISSION_ACCRUED",
          "COMMISSION_REVERSED",
        ],
      },
      ...(therapistId ? { OR: [{ therapistId }, { booking: { is: { therapistId } } }] } : {}),
    },
    select: { entryType: true, amountMinor: true, createdAt: true },
  });

  const series = emptySeries(range, ["gross", "refunds", "platform", "consultant"]);
  for (const entry of entries) {
    const point = series.get(bucketKey(entry.createdAt, range.granularity));
    if (!point) continue;
    switch (entry.entryType) {
      case "GROSS_REVENUE":
        point.gross = (point.gross as number) + entry.amountMinor;
        break;
      case "REFUND":
        point.refunds = (point.refunds as number) + -entry.amountMinor;
        break;
      case "PLATFORM_REVENUE":
      case "PLATFORM_REVENUE_REVERSED":
        point.platform = (point.platform as number) + entry.amountMinor;
        break;
      case "COMMISSION_ACCRUED":
      case "COMMISSION_REVERSED":
        point.consultant = (point.consultant as number) + entry.amountMinor;
        break;
    }
  }
  return [...series.values()];
}

/** Bookings created per bucket, split by lifecycle outcome. */
export async function bookingSeries(range: ResolvedRange, therapistId?: string): Promise<SeriesPoint[]> {
  const bookings = await prisma.booking.findMany({
    where: { createdAt: { gte: range.from, lte: range.to }, ...(therapistId ? { therapistId } : {}) },
    select: { createdAt: true, status: true },
  });
  const series = emptySeries(range, ["total", "completed", "cancelled"]);
  for (const booking of bookings) {
    const point = series.get(bucketKey(booking.createdAt, range.granularity));
    if (!point) continue;
    point.total = (point.total as number) + 1;
    if (booking.status === "COMPLETED") point.completed = (point.completed as number) + 1;
    if (booking.status === "CANCELLED" || booking.status === "REFUNDED") {
      point.cancelled = (point.cancelled as number) + 1;
    }
  }
  return [...series.values()];
}

/** Client registrations per bucket plus cumulative growth. */
export async function clientGrowthSeries(range: ResolvedRange): Promise<SeriesPoint[]> {
  const [clients, before] = await Promise.all([
    prisma.client.findMany({
      where: { createdAt: { gte: range.from, lte: range.to } },
      select: { createdAt: true },
    }),
    prisma.client.count({ where: { createdAt: { lt: range.from } } }),
  ]);
  const series = emptySeries(range, ["new", "cumulative"]);
  for (const client of clients) {
    const point = series.get(bucketKey(client.createdAt, range.granularity));
    if (point) point.new = (point.new as number) + 1;
  }
  let running = before;
  for (const point of series.values()) {
    running += point.new as number;
    point.cumulative = running;
  }
  return [...series.values()];
}

export interface StatusSlice {
  status: string;
  count: number;
}

export async function statusDistribution(range: ResolvedRange, therapistId?: string): Promise<StatusSlice[]> {
  const grouped = await prisma.booking.groupBy({
    by: ["status"],
    _count: { _all: true },
    where: { createdAt: { gte: range.from, lte: range.to }, ...(therapistId ? { therapistId } : {}) },
  });
  return grouped
    .map((g) => ({ status: g.status, count: g._count._all }))
    .sort((a, b) => b.count - a.count);
}

export interface TherapistOverviewKpis {
  sessionValueMinor: number; // sum of this consultant's booking amounts in range (their session fees)
  refundedValueMinor: number;
  netSessionValueMinor: number;
  commissionEarnedMinor: number; // their accrued commission in range
  commissionPaidMinor: number; // lifetime settled payouts
  payableMinor: number; // current unsettled balance
  reservedMinor: number; // balance tied up in pending/processing payouts
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  noShowBookings: number;
  refundedBookings: number;
  todaysSessions: number;
  upcomingBookings: number;
  totalClients: number;
}

/** KPI set for a single consultant's own dashboard — reads never cross into another consultant's data. */
export async function therapistOverviewKpis(range: ResolvedRange, therapistId: string): Promise<TherapistOverviewKpis> {
  const bookingWindow = { gte: range.from, lte: range.to };
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const [rangeFinancials, lifetimeFinancials, balance, bookingsByStatus, todaysSessions, upcomingBookings, clientRows] =
    await Promise.all([
      financialSummary({ from: range.from, to: range.to }, therapistId),
      financialSummary({}, therapistId),
      consultantBalance(therapistId),
      prisma.booking.groupBy({
        by: ["status"],
        _count: { _all: true },
        where: { createdAt: bookingWindow, therapistId },
      }),
      prisma.booking.count({
        where: { therapistId, dateTime: { gte: startOfToday, lte: endOfToday }, status: { in: ["CONFIRMED", "COMPLETED"] } },
      }),
      prisma.booking.count({
        where: { therapistId, status: "CONFIRMED", dateTime: { gte: new Date() } },
      }),
      prisma.booking.findMany({ where: { therapistId }, select: { clientId: true }, distinct: ["clientId"] }),
    ]);

  const statusCount = new Map<string, number>(bookingsByStatus.map((b) => [b.status, Number(b._count._all)]));
  const totalBookings = bookingsByStatus.reduce((sum, b) => sum + Number(b._count._all), 0);

  return {
    sessionValueMinor: rangeFinancials.grossRevenueMinor,
    refundedValueMinor: rangeFinancials.refundsMinor,
    netSessionValueMinor: rangeFinancials.netRevenueMinor,
    commissionEarnedMinor: rangeFinancials.consultantEarnedMinor,
    commissionPaidMinor: lifetimeFinancials.consultantPaidMinor,
    payableMinor: balance.payableMinor,
    reservedMinor: balance.reservedMinor,
    totalBookings,
    completedBookings: statusCount.get("COMPLETED") ?? 0,
    cancelledBookings: statusCount.get("CANCELLED") ?? 0,
    noShowBookings: statusCount.get("NO_SHOW") ?? 0,
    refundedBookings: (statusCount.get("REFUNDED") ?? 0) + (statusCount.get("REFUND_PENDING") ?? 0),
    todaysSessions,
    upcomingBookings,
    totalClients: clientRows.length,
  };
}

export interface ConsultantPerformance {
  therapistId: string;
  name: string;
  bookings: number;
  completed: number;
  grossMinor: number;
  commissionMinor: number;
}

export async function consultantPerformance(range: ResolvedRange): Promise<ConsultantPerformance[]> {
  const [therapists, bookings, commissions] = await Promise.all([
    prisma.therapist.findMany({ select: { id: true, name: true } }),
    prisma.booking.groupBy({
      by: ["therapistId", "status"],
      _count: { _all: true },
      _sum: { amountMinor: true },
      where: { createdAt: { gte: range.from, lte: range.to } },
    }),
    prisma.ledgerEntry.groupBy({
      by: ["therapistId"],
      _sum: { amountMinor: true },
      where: {
        therapistId: { not: null },
        entryType: { in: ["COMMISSION_ACCRUED", "COMMISSION_REVERSED"] },
        createdAt: { gte: range.from, lte: range.to },
      },
    }),
  ]);

  const perf = new Map<string, ConsultantPerformance>(
    therapists.map((t) => [
      t.id,
      { therapistId: t.id, name: t.name, bookings: 0, completed: 0, grossMinor: 0, commissionMinor: 0 },
    ])
  );
  for (const row of bookings) {
    const entry = perf.get(row.therapistId);
    if (!entry) continue;
    entry.bookings += row._count._all;
    if (row.status === "COMPLETED") entry.completed += row._count._all;
    if (!["CANCELLED", "REFUNDED", "AWAITING_PAYMENT"].includes(row.status)) {
      entry.grossMinor += row._sum.amountMinor ?? 0;
    }
  }
  for (const row of commissions) {
    if (!row.therapistId) continue;
    const entry = perf.get(row.therapistId);
    if (entry) entry.commissionMinor += row._sum.amountMinor ?? 0;
  }
  // Only consultants with activity in the window — idle/pending roster
  // members would otherwise pad the chart with meaningless ₹0 rows.
  return [...perf.values()]
    .filter((p) => p.bookings > 0 || p.grossMinor !== 0 || p.commissionMinor !== 0)
    .sort((a, b) => b.grossMinor - a.grossMinor);
}
