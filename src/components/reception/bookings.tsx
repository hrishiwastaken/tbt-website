"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  StatusPill,
} from "@/components/admin/ui";
import {
  COUNSELING_TYPES,
  COUNSELING_TYPE_LABELS,
  counselingTypeLabel,
} from "@/server/domain/counselingType";
import { RECEPTION_TRANSITIONS } from "@/server/domain/receptionScope";
import {
  PAYMENT_REF_MAX_LENGTH,
  PHONE_MAX_LENGTH,
  PHONE_PATTERN,
  PHONE_TITLE,
  REFERENCE_PATTERN,
  REFERENCE_TITLE,
  sanitizePhone,
  sanitizeReference,
} from "@/lib/inputFormats";

// Shared front-desk booking pieces: the appointment table, the detail modal
// with the desk's action set, and the scheduling modal. Built entirely from
// the admin console primitives (components/admin/ui.tsx) so the reception
// panel and the admin panel are visually the same product.

export interface BookingRow {
  id: string;
  dateTime: string;
  durationMinutes: number;
  amountMinor: number;
  discountMinor: number;
  status: string;
  paymentStatus: string;
  invoiceNumber: string | null;
  counselingType: string | null;
  client: { id: string; name: string; email: string; phone: string };
  therapist: { id: string; name: string };
  service: { id: string; name: string };
}

export interface BookingDetail extends BookingRow {
  taxMinor: number;
  cancellationReason: string | null;
  expiresAt: string | null;
  createdAt: string;
  client: {
    id: string;
    name: string;
    email: string;
    phone: string;
    age: number;
    emergencyContact: string;
  };
  payments: {
    id: string;
    kind: string;
    provider: string;
    amountMinor: number;
    status: string;
    providerPaymentId: string | null;
    providerRef: string | null;
    failureReason: string | null;
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

export interface Consultant {
  id: string;
  name: string;
  status?: string;
  isActive?: boolean;
  feeMinor?: number;
}

// Client-side mirror of src/server/domain/receptionScope.ts — labels for the
// transitions the desk is allowed to make. The server re-checks every one of
// them, so this only shapes the UI.
const ACTION_LABELS: Record<
  string,
  { label: string; needsReason?: boolean; primary?: boolean }
> = {
  CONFIRMED: { label: "Confirm booking", primary: true },
  COMPLETED: { label: "Mark completed", primary: true },
  NO_SHOW: { label: "Mark no-show" },
  CANCELLED: { label: "Cancel", needsReason: true },
  REFUND_PENDING: { label: "Request refund (admin approves)", needsReason: true },
};

export function actionsFor(status: string) {
  return (RECEPTION_TRANSITIONS[status as keyof typeof RECEPTION_TRANSITIONS] ??
    []) as string[];
}

export const RESCHEDULABLE = ["PENDING", "AWAITING_PAYMENT", "CONFIRMED"];

export function canTakeDeskPayment(booking: {
  status: string;
  paymentStatus: string;
}): boolean {
  return (
    booking.paymentStatus === "UNPAID" &&
    !["CANCELLED", "REFUND_PENDING", "REFUNDED"].includes(booking.status)
  );
}

/** Shared appointment table. */
export function BookingTable({
  rows,
  loading,
  emptyLabel,
  onSelect,
}: {
  rows: BookingRow[];
  loading: boolean;
  emptyLabel: string;
  onSelect: (id: string) => void;
}) {
  if (loading) return <LoadingRow label="Loading appointments..." />;
  if (rows.length === 0) return <LoadingRow label={emptyLabel} />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full font-dmsans text-sm">
        <thead>
          <tr className="border-b border-ocean/10 text-left text-[10px] font-bold uppercase tracking-wider text-ink-muted">
            <th className="px-3 py-3">Session</th>
            <th className="px-3 py-3">Client</th>
            <th className="px-3 py-3">Consultant</th>
            <th className="px-3 py-3 text-right">Fee</th>
            <th className="px-3 py-3">Status</th>
            <th className="px-3 py-3">Payment</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onSelect(row.id)}
              className="cursor-pointer border-b border-ocean/5 transition-colors hover:bg-surface-sunken/60"
            >
              <td className="px-3 py-3.5">
                <div className="font-semibold text-ocean-deep">
                  {row.service.name}
                </div>
                <div className="text-xs text-ink-muted">
                  {formatDate(row.dateTime)} · {formatTime(row.dateTime)} ·{" "}
                  {row.durationMinutes} min
                </div>
                {row.counselingType && (
                  <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-ocean/70">
                    {counselingTypeLabel(row.counselingType)}
                  </div>
                )}
              </td>
              <td className="px-3 py-3.5">
                <div className="font-medium text-ink">{row.client.name}</div>
                <div className="text-xs text-ink-muted">{row.client.phone}</div>
              </td>
              <td className="px-3 py-3.5 text-ink">{row.therapist.name}</td>
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
  );
}

/** Appointment detail with the desk's permitted actions. */
export function BookingDetailModal({
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
  const [collecting, setCollecting] = useState(false);
  const [paymentRef, setPaymentRef] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/reception/bookings/${bookingId}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to load appointment");
      return;
    }
    setDetail(data.booking);
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
      const res = await fetch(`/api/reception/bookings/${bookingId}`, {
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
      setCollecting(false);
      setPaymentRef("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const actions = useMemo(
    () => (detail ? actionsFor(detail.status) : []),
    [detail],
  );
  const netMinor = detail
    ? detail.amountMinor - detail.discountMinor - detail.taxMinor
    : 0;
  const collectedMinor = detail
    ? detail.payments
        .filter((p) => p.kind === "CHARGE" && p.status === "SUCCEEDED")
        .reduce((sum, p) => sum + p.amountMinor, 0)
    : 0;

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

          {/* Client + fee */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="surface-inset rounded-soft p-4 text-sm">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                Client
              </div>
              <div className="font-semibold text-ocean-deep">
                {detail.client.name}
              </div>
              <div className="text-xs text-ink-muted">{detail.client.email}</div>
              <div className="text-xs text-ink-muted">{detail.client.phone}</div>
              <div className="mt-2 text-xs text-ink-muted">
                <span className="font-semibold">Emergency:</span>{" "}
                {detail.client.emergencyContact}
              </div>
            </div>
            <div className="surface-inset rounded-soft p-4 text-sm">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                Fee
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <span className="text-ink-muted">Session fee</span>
                <span className="text-right font-semibold tabular-nums text-ink">
                  {formatINR(detail.amountMinor)}
                </span>
                <span className="text-ink-muted">Discount</span>
                <span className="text-right tabular-nums text-ink">
                  −{formatINR(detail.discountMinor)}
                </span>
                <span className="text-ink-muted">Collected</span>
                <span className="text-right tabular-nums text-ink">
                  {formatINR(collectedMinor)}
                </span>
                <span className="border-t border-ocean/10 pt-1 font-semibold text-ink-muted">
                  {collectedMinor >= netMinor ? "Settled" : "Outstanding"}
                </span>
                <span className="border-t border-ocean/10 pt-1 text-right font-bold tabular-nums text-ocean-deep">
                  {formatINR(Math.max(0, netMinor - collectedMinor))}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {actions.map((toStatus) => {
              const meta = ACTION_LABELS[toStatus] ?? { label: toStatus };
              return meta.needsReason ? (
                <button
                  key={toStatus}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setReasonFor(reasonFor === toStatus ? null : toStatus);
                    setReason("");
                  }}
                  className="rounded-full border border-ocean/25 px-4 py-2 text-xs font-bold uppercase tracking-wider text-ocean-deep transition-colors hover:bg-surface-sunken disabled:opacity-40"
                >
                  {meta.label}
                </button>
              ) : (
                <button
                  key={toStatus}
                  type="button"
                  disabled={busy}
                  onClick={() => patch({ action: "transition", toStatus })}
                  className="rounded-full bg-ocean px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-surface-raised-sm transition-all hover:-translate-y-0.5 disabled:opacity-40"
                >
                  {meta.label}
                </button>
              );
            })}
            {canTakeDeskPayment(detail) && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setCollecting((c) => !c)}
                className="rounded-full bg-ocean-deep px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-surface-raised-sm transition-all hover:-translate-y-0.5 disabled:opacity-40"
              >
                Record payment ({formatINR(netMinor - collectedMinor)})
              </button>
            )}
            {RESCHEDULABLE.includes(detail.status) && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setRescheduling((r) => !r)}
                className="rounded-full border border-ocean/25 px-4 py-2 text-xs font-bold uppercase tracking-wider text-ocean-deep transition-colors hover:bg-surface-sunken disabled:opacity-40"
              >
                Reschedule
              </button>
            )}
            {detail.status === "REFUND_PENDING" && (
              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-amber-800">
                Awaiting admin refund decision
              </span>
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

          {collecting && (
            <div className="surface-inset flex flex-wrap items-end gap-3 rounded-soft p-4">
              <div className="min-w-[240px] flex-1">
                <Field label="Payment reference (UPI UTR, receipt no.) — optional">
                  <input
                    inputMode="text"
                    maxLength={PAYMENT_REF_MAX_LENGTH}
                    pattern={REFERENCE_PATTERN}
                    title={REFERENCE_TITLE}
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(sanitizeReference(e.target.value))}
                    className={inputClass}
                    placeholder="e.g. 402311223344"
                  />
                </Field>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  patch({
                    action: "record-payment",
                    ...(paymentRef.trim()
                      ? { reference: paymentRef.trim() }
                      : {}),
                  })
                }
                className="rounded-full bg-ocean px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-40"
              >
                {busy ? "Recording…" : "Mark fee collected"}
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
                    className="surface-inset space-y-1 rounded-soft px-4 py-2.5 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-ocean-deep">
                        {p.kind === "CHARGE" ? "Charge" : "Refund"} · {p.provider}
                      </span>
                      <span className="font-mono text-ink-muted">
                        {p.providerRef || p.providerPaymentId || "—"}
                      </span>
                      <span className="font-semibold tabular-nums text-ink">
                        {p.kind === "REFUND" ? "−" : ""}
                        {formatINR(p.amountMinor)}
                      </span>
                      <StatusPill status={p.status} />
                    </div>
                    {p.failureReason && (
                      <div className="text-[11px] font-medium text-red-700">
                        {p.failureReason}
                      </div>
                    )}
                  </div>
                ))}
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

interface ClientOption {
  id: string;
  name: string;
  email: string;
  phone: string;
}

/** Front-desk appointment scheduling. */
export function ScheduleModal({
  consultants,
  onClose,
  onScheduled,
}: {
  consultants: Consultant[];
  onClose: () => void;
  onScheduled: () => void;
}) {
  // Only APPROVED, active consultants can take new appointments.
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
    age: "",
    emergencyContact: "",
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onConsultantChange = (id: string) => {
    setTherapistId(id);
    const c = bookable.find((x) => x.id === id);
    if (c?.feeMinor != null) setFeeRupees(String(c.feeMinor / 100));
  };

  // Debounced client search against the reception clients endpoint.
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
          `/api/reception/clients?q=${encodeURIComponent(q)}&pageSize=8`,
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
        !newClient.age ||
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

      const res = await fetch("/api/reception/bookings", {
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
              Fee collected at the desk
            </label>
            {paymentReceived && (
              <input
                inputMode="text"
                maxLength={PAYMENT_REF_MAX_LENGTH}
                pattern={REFERENCE_PATTERN}
                title={REFERENCE_TITLE}
                value={paymentRef}
                onChange={(e) => setPaymentRef(sanitizeReference(e.target.value))}
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
                  type="tel"
                  inputMode="tel"
                  maxLength={PHONE_MAX_LENGTH}
                  pattern={PHONE_PATTERN}
                  title={PHONE_TITLE}
                  value={newClient.phone}
                  onChange={(e) =>
                    setNewClient({
                      ...newClient,
                      phone: sanitizePhone(e.target.value),
                    })
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Age">
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={newClient.age}
                  onChange={(e) =>
                    setNewClient({ ...newClient, age: e.target.value })
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

/** Compact queue card used on the front-desk overview. */
export function QueueList({
  rows,
  emptyLabel,
  onSelect,
}: {
  rows: BookingRow[];
  emptyLabel: string;
  onSelect: (id: string) => void;
}) {
  if (rows.length === 0) return <LoadingRow label={emptyLabel} />;
  return (
    <ul className="divide-y divide-ocean/5">
      {rows.map((row) => (
        <li key={row.id}>
          <button
            type="button"
            onClick={() => onSelect(row.id)}
            className="flex w-full flex-wrap items-center justify-between gap-3 px-1 py-3 text-left transition-colors hover:bg-surface-sunken/60"
          >
            <span className="min-w-[140px]">
              <span className="block font-dmsans text-sm font-semibold text-ocean-deep">
                {row.client.name}
              </span>
              <span className="block font-dmsans text-xs text-ink-muted">
                {formatDate(row.dateTime)} · {formatTime(row.dateTime)} ·{" "}
                {row.therapist.name}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span className="font-dmsans text-xs font-semibold tabular-nums text-ink">
                {formatINR(row.amountMinor)}
              </span>
              <StatusPill status={row.status} />
              <StatusPill status={row.paymentStatus} />
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
