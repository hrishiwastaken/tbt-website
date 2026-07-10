"use client";

import { useCallback, useEffect, useState } from "react";
import {
  IndianRupee,
  Landmark,
  HeartHandshake,
  CalendarCheck,
  Users,
  Undo2,
  Hourglass,
  Wallet,
  UserPlus,
  CalendarX,
} from "lucide-react";
import { formatINR, titleCase } from "@/lib/format";
import {
  BarChart,
  CHART_COLORS,
  DonutChart,
  HBarList,
  LineAreaChart,
  type ChartDatum,
} from "@/components/admin/charts";
import {
  ErrorNote,
  KpiCard,
  LoadingRow,
  Panel,
  RangeFilter,
  type RangeKey,
} from "@/components/admin/ui";

interface Kpis {
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
  activeClients: number;
  totalClients: number;
  newClients: number;
}

interface AnalyticsPayload {
  kpis: Kpis;
  series: { revenue: ChartDatum[]; bookings: ChartDatum[]; clients: ChartDatum[] };
  statusDistribution: { status: string; count: number }[];
  consultantPerformance: {
    therapistId: string;
    name: string;
    bookings: number;
    completed: number;
    grossMinor: number;
    commissionMinor: number;
  }[];
}

// Booking statuses → entity-stable slice colors (identity, not rank).
const STATUS_COLORS: Record<string, string> = {
  COMPLETED: CHART_COLORS.blue,
  CONFIRMED: CHART_COLORS.violet,
  PENDING: CHART_COLORS.ochre,
  AWAITING_PAYMENT: CHART_COLORS.ochre,
  CANCELLED: "#8CA0AD",
  NO_SHOW: CHART_COLORS.rosewood,
  REFUND_PENDING: CHART_COLORS.rosewood,
  REFUNDED: "#C8B39B",
};

const compactINR = (minor: number) => formatINR(minor, { compact: true });

export default function AdminDashboardPage() {
  const [range, setRange] = useState<RangeKey>("30d");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAnalytics = useCallback(async () => {
    if (range === "custom" && (!custom.from || !custom.to)) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ range });
      if (range === "custom") {
        params.set("from", custom.from);
        params.set("to", custom.to);
      }
      const res = await fetch(`/api/admin/analytics?${params}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to load analytics");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [range, custom]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const kpis = data?.kpis;

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-2 font-cormorant text-4xl font-semibold text-ocean-deep">Practice Overview</h1>
          <p className="font-dmsans text-sm text-ink-muted">
            Live financials and clinical operations, aggregated from the ledger.
          </p>
        </div>
        <RangeFilter value={range} onChange={setRange} custom={custom} onCustomChange={setCustom} />
      </div>

      <ErrorNote message={error} />
      {loading && !data && <LoadingRow label="Loading analytics overview..." />}

      {kpis && (
        <>
          {/* Revenue KPIs */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Gross Revenue"
              value={formatINR(kpis.grossRevenueMinor)}
              hint="Collected in period, before refunds"
              icon={<IndianRupee size={16} />}
            />
            <KpiCard
              label="Net Revenue"
              value={formatINR(kpis.netRevenueMinor)}
              hint={`After ${formatINR(kpis.grossRevenueMinor - kpis.netRevenueMinor)} refunds & discounts`}
              icon={<Landmark size={16} />}
            />
            <KpiCard
              label="Platform Revenue"
              value={formatINR(kpis.platformRevenueMinor)}
              hint="Practice share after consultant commission"
              icon={<Wallet size={16} />}
            />
            <KpiCard
              label="Consultant Earnings"
              value={formatINR(kpis.consultantEarnedMinor)}
              hint="Commission accrued in period"
              icon={<HeartHandshake size={16} />}
            />
          </div>

          {/* Payables + bookings KPIs */}
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
            <KpiCard label="Consultant Payable" value={formatINR(kpis.consultantPayableMinor)} hint="Unsettled balance" />
            <KpiCard
              label="Pending Payouts"
              value={formatINR(kpis.pendingPayoutsMinor)}
              hint="Queued for settlement"
              icon={<Hourglass size={14} />}
            />
            <KpiCard label="Paid Out" value={formatINR(kpis.consultantPaidMinor)} hint="Lifetime settled" />
            <KpiCard label="Refunds" value={formatINR(kpis.refundsMinor)} hint={`${kpis.refundedBookings} bookings`} icon={<Undo2 size={14} />} />
            <KpiCard
              label="Bookings"
              value={kpis.totalBookings}
              hint={`${kpis.completedBookings} completed · ${kpis.upcomingBookings} upcoming`}
              icon={<CalendarCheck size={14} />}
            />
            <KpiCard
              label="Cancellations"
              value={kpis.cancelledBookings + kpis.noShowBookings}
              hint={`${kpis.cancelledBookings} cancelled · ${kpis.noShowBookings} no-show`}
              icon={<CalendarX size={14} />}
            />
          </div>

          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            <KpiCard label="Active Consultants" value={kpis.activeConsultants} hint="Approved & accepting bookings" icon={<HeartHandshake size={14} />} />
            <KpiCard label="Active Clients" value={kpis.activeClients} hint="Booked within period" icon={<Users size={14} />} />
            <KpiCard label="New Clients" value={kpis.newClients} hint="Registered within period" icon={<UserPlus size={14} />} />
            <KpiCard label="Total Clients" value={kpis.totalClients} hint="All-time registrations" />
          </div>
        </>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
            <Panel title="Revenue Trend" subtitle="Gross collections vs platform and consultant share, with refunds, from ledger entries.">
              <LineAreaChart
                data={data.series.revenue}
                series={[
                  { key: "gross", label: "Gross", color: CHART_COLORS.blue, area: true },
                  { key: "platform", label: "Platform", color: CHART_COLORS.ochre },
                  { key: "consultant", label: "Consultant", color: CHART_COLORS.violet },
                  { key: "refunds", label: "Refunds", color: CHART_COLORS.rosewood },
                ]}
                valueFormat={compactINR}
              />
            </Panel>

            <Panel title="Bookings" subtitle="Sessions booked per period, with completions and cancellations.">
              <BarChart
                data={data.series.bookings}
                series={[
                  { key: "total", label: "Booked", color: CHART_COLORS.blue },
                  { key: "completed", label: "Completed", color: CHART_COLORS.ochre },
                  { key: "cancelled", label: "Cancelled", color: CHART_COLORS.rosewood },
                ]}
              />
            </Panel>

            <Panel title="Appointment Status" subtitle="Lifecycle outcome of bookings created in the period.">
              <DonutChart
                centerLabel="Bookings"
                slices={data.statusDistribution.map((s) => ({
                  label: titleCase(s.status),
                  value: s.count,
                  color: STATUS_COLORS[s.status] ?? "#8CA0AD",
                }))}
              />
            </Panel>

            <Panel title="Client Growth" subtitle="New registrations and cumulative client base.">
              <LineAreaChart
                data={data.series.clients}
                series={[
                  { key: "cumulative", label: "Total clients", color: CHART_COLORS.blue, area: true },
                  { key: "new", label: "New", color: CHART_COLORS.ochre },
                ]}
              />
            </Panel>
          </div>

          <Panel title="Consultant Performance" subtitle="Gross revenue attributed per consultant in the period, with accrued commission.">
            <HBarList
              items={data.consultantPerformance.map((c) => ({
                label: c.name,
                value: c.grossMinor,
                secondary: `${c.bookings} bookings · ${formatINR(c.commissionMinor)} commission`,
              }))}
              valueFormat={compactINR}
            />
          </Panel>
        </>
      )}
    </div>
  );
}
