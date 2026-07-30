"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarPlus, Search } from "lucide-react";
import { titleCase } from "@/lib/format";
import {
  ErrorNote,
  inputClass,
  Pager,
  Panel,
} from "@/components/admin/ui";
import {
  BookingDetailModal,
  BookingTable,
  ScheduleModal,
  type BookingRow,
  type Consultant,
} from "@/components/reception/bookings";

const STATUS_FILTERS = [
  "",
  "PENDING",
  "AWAITING_PAYMENT",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
  "REFUND_PENDING",
  "REFUNDED",
];

export default function ReceptionAppointmentsPage() {
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [therapistId, setTherapistId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [consultants, setConsultants] = useState<Consultant[]>([]);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  useEffect(() => {
    fetch("/api/reception/consultants")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setConsultants(data.consultants))
      .catch(() => {});
  }, []);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(q);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set("q", search);
      if (status) params.set("status", status);
      if (paymentStatus) params.set("paymentStatus", paymentStatus);
      if (therapistId) params.set("therapistId", therapistId);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const res = await fetch(`/api/reception/bookings?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load appointments");
      setRows(data.items);
      setTotal(data.total);
      setPageCount(data.pageCount);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load appointments",
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, status, paymentStatus, therapistId, dateFrom, dateTo]);

  useEffect(() => {
    const run = async () => {
      await fetchRows();
    };
    run();
  }, [fetchRows]);

  const selectClass = `${inputClass} !py-2 !text-xs`;

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-2 font-cormorant text-4xl font-semibold text-ocean-deep">
            Appointments
          </h1>
          <p className="font-dmsans text-sm text-ink-muted">
            Book, confirm, reschedule and close out sessions.
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

      <Panel
        title="Session Register"
        subtitle={`${total} appointments match the current filters.`}
      >
        {/* Filters */}
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-7">
          <div className="relative col-span-2 md:col-span-1 xl:col-span-2">
            <Search
              size={13}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search client, phone, invoice..."
              className={`${selectClass} !pl-9`}
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {s ? titleCase(s) : "All statuses"}
              </option>
            ))}
          </select>
          <select
            value={paymentStatus}
            onChange={(e) => {
              setPaymentStatus(e.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            <option value="">All payments</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PAID">Paid</option>
            <option value="REFUNDED">Refunded</option>
          </select>
          <select
            value={therapistId}
            onChange={(e) => {
              setTherapistId(e.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            <option value="">All consultants</option>
            {consultants.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="col-span-2 flex items-center gap-2 md:col-span-1 xl:col-span-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className={selectClass}
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className={selectClass}
            />
          </div>
        </div>

        <ErrorNote message={error} />

        <BookingTable
          rows={rows}
          loading={loading}
          emptyLabel="No appointments match these filters."
          onSelect={setDetailId}
        />

        <Pager
          page={page}
          pageCount={pageCount}
          total={total}
          onPage={setPage}
        />
      </Panel>

      {detailId && (
        <BookingDetailModal
          bookingId={detailId}
          onClose={() => setDetailId(null)}
          onChanged={fetchRows}
        />
      )}

      {scheduleOpen && (
        <ScheduleModal
          consultants={consultants}
          onClose={() => setScheduleOpen(false)}
          onScheduled={() => {
            setScheduleOpen(false);
            setPage(1);
            fetchRows();
          }}
        />
      )}
    </div>
  );
}
