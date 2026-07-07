"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { formatINR, formatDate, formatDateTime, formatTime, titleCase } from "@/lib/format";
import { ErrorNote, Field, inputClass, LoadingRow, Modal, Pager, Panel, StatusPill } from "@/components/admin/ui";

// A consultant's own action set is intentionally narrower than admin's:
// no reschedule, no refund execution — just outcome-marking on their own
// sessions plus a refund request that a staff member later approves.
const ACTIONS: Record<string, { toStatus: string; label: string; needsReason?: boolean }[]> = {
  CONFIRMED: [
    { toStatus: "COMPLETED", label: "Mark completed" },
    { toStatus: "NO_SHOW", label: "Mark no-show" },
    { toStatus: "CANCELLED", label: "Cancel", needsReason: true },
    { toStatus: "REFUND_PENDING", label: "Request refund", needsReason: true },
  ],
  COMPLETED: [{ toStatus: "REFUND_PENDING", label: "Request refund", needsReason: true }],
  CANCELLED: [{ toStatus: "REFUND_PENDING", label: "Request refund", needsReason: true }],
  NO_SHOW: [{ toStatus: "REFUND_PENDING", label: "Request refund", needsReason: true }],
};

const STATUS_FILTERS = ["", "PENDING", "AWAITING_PAYMENT", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW", "REFUND_PENDING", "REFUNDED"];

interface BookingRow {
  id: string;
  dateTime: string;
  durationMinutes: number;
  amountMinor: number;
  status: string;
  paymentStatus: string;
  client: { id: string; name: string; email: string; phone: string };
  service: { id: string; name: string };
}

interface BookingDetail extends BookingRow {
  notes: string;
  invoiceNumber: string | null;
  createdAt: string;
  payments: { id: string; kind: string; amountMinor: number; status: string; providerRef: string | null; createdAt: string }[];
  statusHistory: { id: string; fromStatus: string | null; toStatus: string; reason: string | null; actorType: string; createdAt: string }[];
}

export default function TherapistAppointmentsPage() {
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);

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
      const res = await fetch(`/api/therapist/appointments?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load appointments");
      setRows(data.items);
      setTotal(data.total);
      setPageCount(data.pageCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const selectClass = `${inputClass} !py-2 !text-xs`;

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
      <div>
        <h1 className="mb-2 font-cormorant text-4xl font-semibold text-ocean-deep">Your Appointments</h1>
        <p className="font-dmsans text-sm text-ink-muted">Search and manage your own sessions.</p>
      </div>

      <Panel title="Session Register" subtitle={`${total} appointments match the current filters.`}>
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3">
          <div className="relative col-span-2 md:col-span-1">
            <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search client, email, invoice..."
              className={`${selectClass} !pl-9`}
            />
          </div>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={selectClass}>
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {s ? titleCase(s) : "All statuses"}
              </option>
            ))}
          </select>
        </div>

        <ErrorNote message={error} />

        {loading ? (
          <LoadingRow label="Loading appointments..." />
        ) : rows.length === 0 ? (
          <LoadingRow label="No appointments match these filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full font-dmsans text-sm">
              <thead>
                <tr className="border-b border-ocean/10 text-left text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  <th className="px-3 py-3">Session</th>
                  <th className="px-3 py-3">Client</th>
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
                      <div className="font-semibold text-ocean-deep">{row.service.name}</div>
                      <div className="text-xs text-ink-muted">
                        {formatDate(row.dateTime)} · {formatTime(row.dateTime)} · {row.durationMinutes} min
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="font-medium text-ink">{row.client.name}</div>
                      <div className="text-xs text-ink-muted">{row.client.email}</div>
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
        <Pager page={page} pageCount={pageCount} total={total} onPage={setPage} />
      </Panel>

      {detailId && (
        <BookingDetailModal bookingId={detailId} onClose={() => setDetailId(null)} onChanged={fetchRows} />
      )}
    </div>
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
  const [notes, setNotes] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/therapist/appointments/${bookingId}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to load appointment");
      return;
    }
    setDetail(data.booking);
    setNotes(data.booking.notes || "");
    setNotesDirty(false);
  }, [bookingId]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/therapist/appointments/${bookingId}`, {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const actions = useMemo(() => (detail ? ACTIONS[detail.status] ?? [] : []), [detail]);

  return (
    <Modal title="Appointment Detail" onClose={onClose} wide>
      {!detail ? (
        <LoadingRow />
      ) : (
        <div className="space-y-6 font-dmsans">
          <ErrorNote message={error} />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-cormorant text-xl font-semibold text-ocean-deep">{detail.service.name}</div>
              <div className="text-sm text-ink-muted">
                {formatDateTime(detail.dateTime)} · {detail.durationMinutes} min ·{" "}
                <span className="font-mono text-xs">{detail.invoiceNumber || detail.id.slice(0, 8)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <StatusPill status={detail.status} />
              <StatusPill status={detail.paymentStatus} />
            </div>
          </div>

          <div className="surface-inset rounded-soft p-4 text-sm">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Client</div>
            <div className="font-semibold text-ocean-deep">{detail.client.name}</div>
            <div className="text-xs text-ink-muted">{detail.client.email}</div>
            <div className="text-xs text-ink-muted">{detail.client.phone}</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {actions.map((action) =>
              action.needsReason ? (
                <button
                  key={action.toStatus}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setReasonFor(reasonFor === action.toStatus ? null : action.toStatus);
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
                  onClick={() => patch({ action: "transition", toStatus: action.toStatus })}
                  className="rounded-full bg-ocean px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-surface-raised-sm transition-all hover:-translate-y-0.5 disabled:opacity-40"
                >
                  {action.label}
                </button>
              )
            )}
            {actions.length === 0 && (
              <p className="text-xs italic text-ink-muted">
                This appointment is in a terminal state — no further actions available.
              </p>
            )}
          </div>

          {reasonFor && (
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[240px] flex-1">
                <Field label="Reason">
                  <input value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} placeholder="Reason for this change" />
                </Field>
              </div>
              <button
                type="button"
                disabled={busy || !reason.trim()}
                onClick={() => patch({ action: "transition", toStatus: reasonFor, reason: reason.trim() })}
                className="rounded-full bg-ocean px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-40"
              >
                Confirm
              </button>
            </div>
          )}
          {reasonFor === "REFUND_PENDING" && (
            <p className="text-xs italic text-ink-muted">
              Requesting a refund queues it for admin review — the refund itself is executed by clinic staff.
            </p>
          )}

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

          {detail.payments.length > 0 && (
            <div>
              <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Payment records</h4>
              <div className="space-y-2">
                {detail.payments.map((p) => (
                  <div key={p.id} className="surface-inset flex flex-wrap items-center justify-between gap-2 rounded-soft px-4 py-2.5 text-xs">
                    <span className="font-semibold text-ocean-deep">{p.kind === "CHARGE" ? "Charge" : "Refund"}</span>
                    <span className="font-mono text-ink-muted">{p.providerRef || "—"}</span>
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

          <div>
            <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Status history</h4>
            <ol className="space-y-1.5 text-xs">
              {detail.statusHistory.map((h) => (
                <li key={h.id} className="flex flex-wrap items-baseline gap-x-2 text-ink-muted">
                  <span className="font-mono text-[10px]">{formatDateTime(h.createdAt)}</span>
                  <span className="font-semibold text-ocean-deep">
                    {h.fromStatus ? `${titleCase(h.fromStatus)} → ` : ""}
                    {titleCase(h.toStatus)}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide">{h.actorType}</span>
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
