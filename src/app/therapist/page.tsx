"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, IndianRupee, CalendarCheck, Wallet, Hourglass } from "lucide-react";
import { formatINR, formatDateTime, titleCase } from "@/lib/format";
import { BarChart, CHART_COLORS, DonutChart, LineAreaChart, type ChartDatum } from "@/components/admin/charts";
import { ErrorNote, KpiCard, LoadingRow, Panel, RangeFilter, StatusPill, type RangeKey } from "@/components/admin/ui";

interface TherapistKpis {
  sessionValueMinor: number;
  refundedValueMinor: number;
  netSessionValueMinor: number;
  commissionEarnedMinor: number;
  commissionPaidMinor: number;
  payableMinor: number;
  reservedMinor: number;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  noShowBookings: number;
  refundedBookings: number;
  todaysSessions: number;
  upcomingBookings: number;
  totalClients: number;
}

interface DashboardPayload {
  kpis: TherapistKpis;
  series: { revenue: ChartDatum[]; bookings: ChartDatum[] };
  statusDistribution: { status: string; count: number }[];
  upcomingAppointments: {
    id: string;
    dateTime: string;
    status: string;
    durationMinutes: number;
    client: { name: string };
    service: { name: string };
  }[];
}

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

export default function TherapistDashboardPage() {
  const [range, setRange] = useState<RangeKey>("30d");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async () => {
    if (range === "custom" && (!custom.from || !custom.to)) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ range });
      if (range === "custom") {
        params.set("from", custom.from);
        params.set("to", custom.to);
      }
      const res = await fetch(`/api/therapist/dashboard?${params}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to load dashboard");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [range, custom]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const kpis = data?.kpis;

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-2 font-cormorant text-4xl font-semibold text-ocean-deep">Your Practice</h1>
          <p className="font-dmsans text-sm text-ink-muted">Sessions and earnings, scoped to your own caseload.</p>
        </div>
        <RangeFilter value={range} onChange={setRange} custom={custom} onCustomChange={setCustom} />
      </div>

      <ErrorNote message={error} />
      {loading && !data && <LoadingRow label="Loading your dashboard..." />}

      {kpis && (
        <>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            <KpiCard label="Today's Sessions" value={kpis.todaysSessions} icon={<CalendarCheck size={16} />} />
            <KpiCard label="Upcoming" value={kpis.upcomingBookings} hint="Confirmed, not yet held" />
            <KpiCard
              label="Session Value"
              value={formatINR(kpis.sessionValueMinor)}
              hint="Gross fees in period"
              icon={<IndianRupee size={16} />}
            />
            <KpiCard
              label="Commission Earned"
              value={formatINR(kpis.commissionEarnedMinor)}
              hint="Your share in period"
              icon={<Wallet size={16} />}
            />
          </div>

          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
            <KpiCard label="Payable Balance" value={formatINR(kpis.payableMinor)} hint="Unsettled" />
            <KpiCard label="Reserved" value={formatINR(kpis.reservedMinor)} hint="In pending payouts" icon={<Hourglass size={13} />} />
            <KpiCard label="Lifetime Paid" value={formatINR(kpis.commissionPaidMinor)} hint="Settled to date" />
            <KpiCard label="Completed" value={kpis.completedBookings} hint={`of ${kpis.totalBookings} bookings`} />
            <KpiCard label="Clients Served" value={kpis.totalClients} hint="All time" />
          </div>
        </>
      )}

      {data && (
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
          <Panel title="Earnings Trend" subtitle="Session value collected vs your accrued commission.">
            <LineAreaChart
              data={data.series.revenue}
              series={[
                { key: "gross", label: "Session Value", color: CHART_COLORS.blue, area: true },
                { key: "consultant", label: "Your Commission", color: CHART_COLORS.violet },
              ]}
              valueFormat={compactINR}
            />
          </Panel>

          <Panel title="Bookings" subtitle="Sessions booked with you per period.">
            <BarChart
              data={data.series.bookings}
              series={[
                { key: "total", label: "Booked", color: CHART_COLORS.blue },
                { key: "completed", label: "Completed", color: CHART_COLORS.ochre },
                { key: "cancelled", label: "Cancelled", color: CHART_COLORS.rosewood },
              ]}
            />
          </Panel>

          <Panel title="Appointment Status" subtitle="Lifecycle outcome of your bookings in the period.">
            <DonutChart
              centerLabel="Bookings"
              slices={data.statusDistribution.map((s) => ({
                label: titleCase(s.status),
                value: s.count,
                color: STATUS_COLORS[s.status] ?? "#8CA0AD",
              }))}
            />
          </Panel>

          <Panel
            title="Upcoming Appointments"
            subtitle="Your next confirmed and pending sessions."
            actions={
              <Link href="/therapist/appointments" className="inline-flex items-center gap-1.5 text-xs font-semibold text-ocean hover:text-ocean-deep transition-colors">
                View all <ArrowRight size={13} />
              </Link>
            }
          >
            {data.upcomingAppointments.length === 0 ? (
              <LoadingRow label="No upcoming appointments." />
            ) : (
              <div className="divide-y divide-ocean/10 font-dmsans">
                {data.upcomingAppointments.map((a) => (
                  <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium text-ocean-deep">{a.client.name}</p>
                      <p className="text-xs text-ink-muted">
                        {a.service.name} — {formatDateTime(a.dateTime)} ({a.durationMinutes} min)
                      </p>
                    </div>
                    <StatusPill status={a.status} />
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
