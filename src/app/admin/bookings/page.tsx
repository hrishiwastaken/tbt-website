"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarPlus, Download, Search } from "lucide-react";
import {
  formatINR,
  formatDate,
  formatDateTime,
  formatTime,
  titleCase,
} from "@/lib/format";
import {
  ErrorNote,
  Field,
  inputClass,
  LoadingRow,
  Modal,
  Pager,
  Panel,
  StatusPill,
} from "@/components/admin/ui";
import {
  COUNSELING_TYPES,
  COUNSELING_TYPE_LABELS,
  counselingTypeLabel,
} from "@/server/domain/counselingType";

// Client-side mirror of the booking state machine for action menus; the
// server re-validates every transition.
const ACTIONS: Record<
  string,
  { toStatus: string; label: string; needsReason?: boolean }[]
> = {
  PENDING: [
    { toStatus: "CONFIRMED", label: "Confirm" },
    { toStatus: "CANCELLED", label: "Cancel", needsReason: true },
  ],
  AWAITING_PAYMENT: [
    { toStatus: "CONFIRMED", label: "Confirm (payment received)" },
    { toStatus: "CANCELLED", label: "Cancel", needsReason: true },
  ],
  CONFIRMED: [
    { toStatus: "COMPLETED", label: "Mark completed" },
    { toStatus: "NO_SHOW", label: "Mark no-show" },
    { toStatus: "CANCELLED", label: "Cancel", needsReason: true },
    { toStatus: "REFUND_PENDING", label: "Request refund", needsReason: true },
  ],
  COMPLETED: [
    { toStatus: "REFUND_PENDING", label: "Request refund", needsReason: true },
  ],
  CANCELLED: [
    { toStatus: "REFUND_PENDING", label: "Request refund", needsReason: true },
  ],
  NO_SHOW: [
    { toStatus: "REFUND_PENDING", label: "Request refund", needsReason: true },
  ],
  REFUND_PENDING: [
    { toStatus: "CONFIRMED", label: "Reject refund (reinstate)" },
  ],
  REFUNDED: [],
};

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

interface BookingRow {
  id: string;
  dateTime: string;
  durationMinutes: number;
  amountMinor: number;
  discountMinor: number;
  status: string;
  paymentStatus: string;
  invoiceNumber: string | null;
  commissionBps: number;
  counselingType: string | null;
  client: { id: string; name: string; email: string; phone: string };
  therapist: { id: string; name: string };
  service: { id: string; name: string };
}

interface BookingDetail extends BookingRow {
  notes: string;
  cancellationReason: string | null;
  createdAt: string;
  payments: {
    id: string;
    kind: string;
    provider: string;
    amountMinor: number;
    status: string;
    providerPaymentId: string | null;
    providerRef: string | null;
    createdAt: string;
  }[];
  ledgerEntries: {
    id: string;
    entryType: string;
    amountMinor: number;
    description: string;
    createdAt: string;
  }[];
  statusHistory: {
    id: string;
    fromStatus: string | null;
    toStatus: string;
    reason: string | null;
    actorType: string;
    createdAt: string;
  }[];
}

interface Consultant {
  id: string;
  name: string;
  status?: string;
  isActive?: boolean;
  feeMinor?: number;
}

export default function AdminBookingsPage() {
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
    fetch("/api/admin/consultants")
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
      const res = await fetch(`/api/admin/bookings?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load bookings");
      setRows(data.items);
      setTotal(data.total);
      setPageCount(data.pageCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bookings");
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
            Search, inspect and manage the full booking lifecycle.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setScheduleOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-ocean px-5 py-2.5 font-dmsans text-xs font-bold uppercase tracking-wider text-white shadow-surface-raised-sm transition-all hover:-translate-y-0.5"
          >
            <CalendarPlus size={13} /> Schedule appointment
          </button>
          <a
            href="/api/admin/reports"
            className="inline-flex items-center gap-2 rounded-full border border-ocean/25 px-5 py-2.5 font-dmsans text-xs font-bold uppercase tracking-wider text-ocean-deep transition-colors hover:bg-surface-sunken"
          >
            <Download size={13} /> Export CSV
          </a>
        </div>
      </div>

      <Panel
        title="Session Register"
        subtitle={`${total} bookings match the current filters.`}
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
              placeholder="Search client, email, invoice..."
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

        {loading ? (
          <LoadingRow label="Loading appointments..." />
        ) : rows.length === 0 ? (
          <LoadingRow label="No bookings match these filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full font-dmsans text-sm">
              <thead>
                <tr className="border-b border-ocean/10 text-left text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  <th className="px-3 py-3">Session</th>
                  <th className="px-3 py-3">Client</th>
                  <th className="px-3 py-3">Consultant</th>
                  <th className="px-3 py-3 text-right">Amount</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Payment</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setDetailId(row.id)}
                    className="cursor-pointer border-b border-ocean/5 transition-colors hover:bg-surface-sunken/60"
                  >
                    <td className="px-3 py-3.5">
                      <div className="font-semibold text-ocean-deep">
                        {row.service.name}
                      </div>
                      <div className="text-xs text-ink-muted">
                        {formatDate(row.dateTime)} · {formatTime(row.dateTime)}{" "}
                        · {row.durationMinutes} min
                      </div>
                      {row.counselingType && (
                        <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-ocean/70">
                          {counselingTypeLabel(row.counselingType)}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="font-medium text-ink">
                        {row.client.name}
                      </div>
                      <div className="text-xs text-ink-muted">
                        {row.client.email}
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-ink">
                      {row.therapist.name}
                    </td>
                    <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-ocean-deep">
                      {formatINR(row.amountMinor)}
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusPill status={row.paymentStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

interface ClientOption {
  id: string;
  name: string;
  email: string;
  phone: string;
}

function ScheduleModal({
  consultants,
  onClose,
  onScheduled,
}: {
  consultants: Consultant[];
  onClose: () => void;
  onScheduled: () => void;
}) {
  // Only APPROVED, active consultants can take new appointments. When the
  // list carries status/isActive (the consultants endpoint provides them) we
  // filter on it; otherwise we fall back to the full roster.
  const bookable = useMemo(
    () =>
      consultants.filter(
        (c) =>
          (c.status === undefined || c.status === "APPROVED") &&
          (c.isActive === undefined || c.isActive),
      ),
    [consultants],
  );

  const [therapistId, setTherapistId] = useState("");
  const [counselingType, setCounselingType] = useState<string>(
    COUNSELING_TYPES[0],
  );
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [feeRupees, setFeeRupees] = useState("");
  const [paymentReceived, setPaymentReceived] = useState(false);
  const [paymentRef, setPaymentRef] = useState("");

  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [clientQuery, setClientQuery] = useState("");
  const [clientResults, setClientResults] = useState<ClientOption[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(
    null,
  );
  const [newClient, setNewClient] = useState({
    name: "",
    email: "",
    phone: "",
    dob: "",
    emergencyContact: "",
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Prefill the fee from the chosen consultant's default rate.
  const onConsultantChange = (id: string) => {
    setTherapistId(id);
    const c = bookable.find((x) => x.id === id);
    if (c?.feeMinor != null) setFeeRupees(String(c.feeMinor / 100));
  };

  // Debounced client search against the admin clients endpoint. All state
  // updates happen inside the debounced callback so the effect body never
  // sets state synchronously.
  useEffect(() => {
    if (clientMode !== "existing") return;
    const q = clientQuery.trim();
    const t = setTimeout(async () => {
      if (!q) {
        setClientResults([]);
        return;
      }
      try {
        const res = await fetch(
          `/api/admin/clients?q=${encodeURIComponent(q)}&pageSize=8`,
        );
        if (!res.ok) return;
        const data = await res.json();
        setClientResults(data.items ?? []);
      } catch {
        /* ignore transient search errors */
      }
    }, 300);
    return () => clearTimeout(t);
  }, [clientQuery, clientMode]);

  const submit = async () => {
    setError("");
    if (!therapistId) return setError("Select a consultant");
    if (!date || !time) return setError("Select a date and time");
    const fee = Number(feeRupees);
    if (!fee || fee <= 0) return setError("Enter a valid fee amount");
    if (clientMode === "existing" && !selectedClient)
      return setError("Search for and select a client");
    if (
      clientMode === "new" &&
      (!newClient.name ||
        !newClient.email ||
        !newClient.phone ||
        !newClient.dob ||
        !newClient.emergencyContact)
    )
      return setError("Complete all new client fields");

    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        therapistId,
        counselingType,
        date,
        time,
        feeRupees: fee,
        paymentReceived,
      };
      if (paymentReceived && paymentRef.trim())
        body.paymentRef = paymentRef.trim();
      if (clientMode === "existing") body.clientId = selectedClient!.id;
      else body.newClient = newClient;

      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to schedule");
      onScheduled();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule");
    } finally {
      setBusy(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Modal title="Schedule Appointment" onClose={onClose} wide>
      <div className="space-y-5 font-dmsans">
        <ErrorNote message={error} />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Consultant">
            <select
              value={therapistId}
              onChange={(e) => onConsultantChange(e.target.value)}
              className={inputClass}
            >
              <option value="">Select consultant…</option>
              {bookable.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Counselling type">
            <select
              value={counselingType}
              onChange={(e) => setCounselingType(e.target.value)}
              className={inputClass}
            >
              {COUNSELING_TYPES.map((t) => (
                <option key={t} value={t}>
                  {COUNSELING_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input
              type="date"
              min={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Time">
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={inputClass}
              step={900}
            />
          </Field>
          <Field label="Session fee (₹)">
            <input
              type="number"
              min={0}
              step="0.01"
              value={feeRupees}
              onChange={(e) => setFeeRupees(e.target.value)}
              className={inputClass}
              placeholder="e.g. 1500"
            />
          </Field>
          <div className="flex flex-col justify-end gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={paymentReceived}
                onChange={(e) => setPaymentReceived(e.target.checked)}
                className="h-4 w-4 accent-ocean"
              />
              Fee already paid
            </label>
            {paymentReceived && (
              <input
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                className={`${inputClass} !py-2 !text-xs`}
                placeholder="Payment reference / UPI UTR (optional)"
              />
            )}
          </div>
        </div>

        {/* Client selection */}
        <div className="surface-inset rounded-soft p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
              Client
            </span>
            <div className="surface-raised ml-auto flex items-center gap-1 rounded-full p-1">
              {(["existing", "new"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setClientMode(m)}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                    clientMode === m
                      ? "bg-ocean text-white"
                      : "text-ink-muted hover:text-ocean-deep"
                  }`}
                >
                  {m === "existing" ? "Existing" : "New client"}
                </button>
              ))}
            </div>
          </div>

          {clientMode === "existing" ? (
            <div className="space-y-2">
              {selectedClient ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-soft border border-ocean/20 bg-surface px-3.5 py-2.5 text-sm">
                  <span>
                    <span className="font-semibold text-ocean-deep">
                      {selectedClient.name}
                    </span>{" "}
                    <span className="text-ink-muted">
                      · {selectedClient.email}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClient(null);
                      setClientQuery("");
                    }}
                    className="text-xs font-semibold text-ocean underline"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <input
                    value={clientQuery}
                    onChange={(e) => setClientQuery(e.target.value)}
                    className={inputClass}
                    placeholder="Search client by name, email or phone…"
                  />
                  {clientResults.length > 0 && (
                    <div className="max-h-44 overflow-y-auto rounded-soft border border-ocean/15">
                      {clientResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedClient(c)}
                          className="block w-full border-b border-ocean/5 px-3.5 py-2 text-left text-sm transition-colors last:border-0 hover:bg-surface-sunken"
                        >
                          <span className="font-semibold text-ocean-deep">
                            {c.name}
                          </span>{" "}
                          <span className="text-xs text-ink-muted">
                            · {c.email} · {c.phone}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Full name">
                <input
                  value={newClient.name}
                  onChange={(e) =>
                    setNewClient({ ...newClient, name: e.target.value })
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={newClient.email}
                  onChange={(e) =>
                    setNewClient({ ...newClient, email: e.target.value })
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Phone">
                <input
                  value={newClient.phone}
                  onChange={(e) =>
                    setNewClient({ ...newClient, phone: e.target.value })
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Date of birth">
                <input
                  type="date"
                  max={today}
                  value={newClient.dob}
                  onChange={(e) =>
                    setNewClient({ ...newClient, dob: e.target.value })
                  }
                  className={inputClass}
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Emergency contact">
                  <input
                    value={newClient.emergencyContact}
                    onChange={(e) =>
                      setNewClient({
                        ...newClient,
                        emergencyContact: e.target.value,
                      })
                    }
                    className={inputClass}
                    placeholder="Name & phone of an emergency contact"
                  />
                </Field>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-full border border-ocean/25 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-ocean-deep transition-colors hover:bg-surface-sunken disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="rounded-full bg-ocean px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-surface-raised-sm transition-all hover:-translate-y-0.5 disabled:opacity-40"
          >
            {busy ? "Scheduling…" : "Schedule appointment"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function BookingDetailModal({
  bookingId,
  onClose,
  onChanged,
}: {
  bookingId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<BookingDetail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reasonFor, setReasonFor] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [rescheduling, setRescheduling] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [notes, setNotes] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/bookings/${bookingId}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to load booking");
      return;
    }
    setDetail(data.booking);
    setNotes(data.booking.notes || "");
    setNotesDirty(false);
  }, [bookingId]);

  useEffect(() => {
    const run = async () => {
      await load();
    };
    run();
  }, [load]);

  const patch = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      await load();
      onChanged();
      setReasonFor(null);
      setReason("");
      setRescheduling(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const actions = useMemo(
    () => (detail ? (ACTIONS[detail.status] ?? []) : []),
    [detail],
  );
  const canReschedule =
    detail &&
    ["PENDING", "AWAITING_PAYMENT", "CONFIRMED"].includes(detail.status);
  const netMinor = detail ? detail.amountMinor - detail.discountMinor : 0;

  return (
    <Modal title="Appointment Detail" onClose={onClose} wide>
      {!detail ? (
        <LoadingRow />
      ) : (
        <div className="space-y-6 font-dmsans">
          <ErrorNote message={error} />

          {/* Header strip */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-cormorant text-xl font-semibold text-ocean-deep">
                {detail.service.name} · {detail.therapist.name}
              </div>
              <div className="text-sm text-ink-muted">
                {formatDateTime(detail.dateTime)} · {detail.durationMinutes} min
                ·{" "}
                <span className="font-mono text-xs">
                  {detail.invoiceNumber || detail.id.slice(0, 8)}
                </span>
              </div>
              {detail.counselingType && (
                <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-ocean/70">
                  {counselingTypeLabel(detail.counselingType)}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <StatusPill status={detail.status} />
              <StatusPill status={detail.paymentStatus} />
            </div>
          </div>

          {/* Client + financials */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="surface-inset rounded-soft p-4 text-sm">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                Client
              </div>
              <div className="font-semibold text-ocean-deep">
                {detail.client.name}
              </div>
              <div className="text-xs text-ink-muted">
                {detail.client.email}
              </div>
              <div className="text-xs text-ink-muted">
                {detail.client.phone}
              </div>
            </div>
            <div className="surface-inset rounded-soft p-4 text-sm">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                Financials
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <span className="text-ink-muted">Gross</span>
                <span className="text-right font-semibold tabular-nums text-ink">
                  {formatINR(detail.amountMinor)}
                </span>
                <span className="text-ink-muted">Discount</span>
                <span className="text-right tabular-nums text-ink">
                  −{formatINR(detail.discountMinor)}
                </span>
                <span className="text-ink-muted">Commission rate</span>
                <span className="text-right tabular-nums text-ink">
                  {detail.commissionBps / 100}%
                </span>
                <span className="border-t border-ocean/10 pt-1 font-semibold text-ink-muted">
                  Net
                </span>
                <span className="border-t border-ocean/10 pt-1 text-right font-bold tabular-nums text-ocean-deep">
                  {formatINR(netMinor)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {actions.map((action) =>
              action.needsReason ? (
                <button
                  key={action.toStatus}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setReasonFor(
                      reasonFor === action.toStatus ? null : action.toStatus,
                    );
                    setReason("");
                  }}
                  className="rounded-full border border-ocean/25 px-4 py-2 text-xs font-bold uppercase tracking-wider text-ocean-deep transition-colors hover:bg-surface-sunken disabled:opacity-40"
                >
                  {action.label}
                </button>
              ) : (
                <button
                  key={action.toStatus}
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    patch({ action: "transition", toStatus: action.toStatus })
                  }
                  className="rounded-full bg-ocean px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-surface-raised-sm transition-all hover:-translate-y-0.5 disabled:opacity-40"
                >
                  {action.label}
                </button>
              ),
            )}
            {detail.status === "REFUND_PENDING" &&
              detail.paymentStatus === "PAID" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    patch({
                      action: "refund",
                      reason: "Refund approved by admin",
                    })
                  }
                  className="rounded-full bg-ocean-deep px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-surface-raised-sm transition-all hover:-translate-y-0.5 disabled:opacity-40"
                >
                  Execute refund ({formatINR(netMinor)})
                </button>
              )}
            {canReschedule && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setRescheduling((r) => !r)}
                className="rounded-full border border-ocean/25 px-4 py-2 text-xs font-bold uppercase tracking-wider text-ocean-deep transition-colors hover:bg-surface-sunken disabled:opacity-40"
              >
                Reschedule
              </button>
            )}
          </div>

          {reasonFor && (
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[240px] flex-1">
                <Field label="Reason">
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className={inputClass}
                    placeholder="Reason for this change"
                  />
                </Field>
              </div>
              <button
                type="button"
                disabled={busy || !reason.trim()}
                onClick={() =>
                  patch({
                    action: "transition",
                    toStatus: reasonFor,
                    reason: reason.trim(),
                  })
                }
                className="rounded-full bg-ocean px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-40"
              >
                Confirm
              </button>
            </div>
          )}

          {rescheduling && (
            <div className="flex flex-wrap items-end gap-3">
              <Field label="New date">
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="New time">
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className={inputClass}
                  step={3600}
                />
              </Field>
              <button
                type="button"
                disabled={busy || !newDate || !newTime}
                onClick={() =>
                  patch({
                    action: "reschedule",
                    dateTime: `${newDate}T${newTime}:00`,
                  })
                }
                className="rounded-full bg-ocean px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-40"
              >
                Move session
              </button>
            </div>
          )}

          {/* Clinical notes */}
          <div>
            <Field label="Clinical notes (AES-256 encrypted at rest)">
              <textarea
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setNotesDirty(true);
                }}
                rows={3}
                className={`${inputClass} resize-none`}
                placeholder="Session notes visible to clinical staff only"
              />
            </Field>
            {notesDirty && (
              <button
                type="button"
                disabled={busy}
                onClick={() => patch({ action: "notes", notes })}
                className="mt-2 rounded-full bg-ocean px-5 py-2 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-40"
              >
                Save notes
              </button>
            )}
          </div>

          {/* Payments */}
          {detail.payments.length > 0 && (
            <div>
              <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                Payment records
              </h4>
              <div className="space-y-2">
                {detail.payments.map((p) => (
                  <div
                    key={p.id}
                    className="surface-inset flex flex-wrap items-center justify-between gap-2 rounded-soft px-4 py-2.5 text-xs"
                  >
                    <span className="font-semibold text-ocean-deep">
                      {p.kind === "CHARGE" ? "Charge" : "Refund"} · {p.provider}
                    </span>
                    <span className="font-mono text-ink-muted">
                      {p.providerRef || p.providerPaymentId || "—"}
                    </span>
                    <span className="tabular-nums font-semibold text-ink">
                      {p.kind === "REFUND" ? "−" : ""}
                      {formatINR(p.amountMinor)}
                    </span>
                    <StatusPill status={p.status} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ledger */}
          {detail.ledgerEntries.length > 0 && (
            <div>
              <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                Ledger entries (immutable)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <tbody>
                    {detail.ledgerEntries.map((entry) => (
                      <tr key={entry.id} className="border-b border-ocean/5">
                        <td className="py-2 pr-3 font-semibold text-ocean-deep">
                          {titleCase(entry.entryType)}
                        </td>
                        <td className="py-2 pr-3 text-ink-muted">
                          {entry.description}
                        </td>
                        <td
                          className={`py-2 text-right font-semibold tabular-nums ${entry.amountMinor < 0 ? "text-red-700" : "text-ink"}`}
                        >
                          {formatINR(entry.amountMinor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* History */}
          <div>
            <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
              Status history
            </h4>
            <ol className="space-y-1.5 text-xs">
              {detail.statusHistory.map((h) => (
                <li
                  key={h.id}
                  className="flex flex-wrap items-baseline gap-x-2 text-ink-muted"
                >
                  <span className="font-mono text-[10px]">
                    {formatDateTime(h.createdAt)}
                  </span>
                  <span className="font-semibold text-ocean-deep">
                    {h.fromStatus ? `${titleCase(h.fromStatus)} → ` : ""}
                    {titleCase(h.toStatus)}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide">
                    {h.actorType}
                  </span>
                  {h.reason && <span className="italic">— {h.reason}</span>}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </Modal>
  );
}
