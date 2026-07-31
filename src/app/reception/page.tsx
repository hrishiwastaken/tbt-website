"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  CheckCheck,
  IndianRupee,
  Hourglass,
  UserPlus,
  Wallet,
} from "lucide-react";
import { formatINR } from "@/lib/format";
import { ErrorNote, KpiCard, LoadingRow, Panel } from "@/components/admin/ui";
import {
  BookingDetailModal,
  QueueList,
  ScheduleModal,
  type BookingRow,
  type Consultant,
} from "@/components/reception/bookings";

interface DeskKpis {
  todayTotal: number;
  todayConfirmed: number;
  todayUnpaid: number;
  awaitingConfirmation: number;
  awaitingPayment: number;
  unpaidOutstanding: number;
  upcomingWeek: number;
  collectedTodayMinor: number;
  collectedTodayCount: number;
  refundedTodayMinor: number;
  refundedTodayCount: number;
  outstandingMinor: number;
  newClientsWeek: number;
  totalClients: number;
}

interface DashboardPayload {
  kpis: DeskKpis;
  todaySchedule: BookingRow[];
  needsAttention: BookingRow[];
}

export default function ReceptionDashboardPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/reception/dashboard");
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to load the desk");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load the desk");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      await load();
    };
    run();
  }, [load]);

  useEffect(() => {
    fetch("/api/reception/consultants")
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => payload && setConsultants(payload.consultants))
      .catch(() => {});
  }, []);

  const kpis = data?.kpis;

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-2 font-cormorant text-4xl font-semibold text-ocean-deep">
            Front Desk
          </h1>
          <p className="font-dmsans text-sm text-ink-muted">
            Today&apos;s sessions, confirmations still owed, and fees still to
            collect.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setScheduleOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-ocean px-5 py-2.5 font-dmsans text-xs font-bold uppercase tracking-wider text-white shadow-surface-raised-sm transition-all hover:-translate-y-0.5"
        >
          <CalendarPlus size={13} /> Schedule appointment
        </button>
      </div>

      <ErrorNote message={error} />
      {loading && !data && <LoadingRow label="Loading the front desk..." />}

      {kpis && (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Today's Sessions"
              value={kpis.todayTotal}
              hint={`${kpis.todayConfirmed} confirmed · ${kpis.todayUnpaid} unpaid`}
              icon={<CalendarCheck size={16} />}
            />
            <KpiCard
              label="Awaiting Confirmation"
              value={kpis.awaitingConfirmation}
              hint="Upcoming sessions the client hasn't confirmed"
              icon={<CheckCheck size={16} />}
            />
            <KpiCard
              label="Live Payment Holds"
              value={kpis.awaitingPayment}
              hint="Reservations inside their payment window"
              icon={<Hourglass size={16} />}
            />
            <KpiCard
              label="Collected Today"
              value={formatINR(kpis.collectedTodayMinor)}
              hint={`${kpis.collectedTodayCount} payments · ${formatINR(kpis.refundedTodayMinor)} refunded`}
              icon={<IndianRupee size={16} />}
            />
          </div>

          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            <KpiCard
              label="Fees Outstanding"
              value={formatINR(kpis.outstandingMinor)}
              hint={`${kpis.unpaidOutstanding} sessions unpaid`}
              icon={<Wallet size={14} />}
            />
            <KpiCard
              label="Next 7 Days"
              value={kpis.upcomingWeek}
              hint="Live sessions on the book"
              icon={<CalendarClock size={14} />}
            />
            <KpiCard
              label="New Clients"
              value={kpis.newClientsWeek}
              hint="Registered in the last 7 days"
              icon={<UserPlus size={14} />}
            />
            <KpiCard
              label="Client Registry"
              value={kpis.totalClients}
              hint="All-time registrations"
            />
          </div>
        </>
      )}

      {data && (
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
          <Panel
            title="Today's Schedule"
            subtitle={`${data.todaySchedule.length} sessions on the sheet today.`}
          >
            <QueueList
              rows={data.todaySchedule}
              emptyLabel="Nothing scheduled for today."
              onSelect={setDetailId}
            />
          </Panel>

          <Panel
            title="Needs Attention"
            subtitle="Upcoming sessions that are unconfirmed, on a payment hold, or unpaid."
            actions={
              <Link
                href="/reception/confirmations"
                className="rounded-full border border-ocean/25 px-4 py-2 font-dmsans text-[10px] font-bold uppercase tracking-wider text-ocean-deep transition-colors hover:bg-surface-sunken"
              >
                Open queue
              </Link>
            }
          >
            <QueueList
              rows={data.needsAttention}
              emptyLabel="Everything upcoming is confirmed and paid."
              onSelect={setDetailId}
            />
          </Panel>
        </div>
      )}

      {detailId && (
        <BookingDetailModal
          bookingId={detailId}
          onClose={() => setDetailId(null)}
          onChanged={load}
        />
      )}

      {scheduleOpen && (
        <ScheduleModal
          consultants={consultants}
          onClose={() => setScheduleOpen(false)}
          onScheduled={() => {
            setScheduleOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}
