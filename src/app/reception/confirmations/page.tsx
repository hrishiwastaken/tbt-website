"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, IndianRupee } from "lucide-react";
import { formatINR, formatDate, formatTime } from "@/lib/format";
import {
  ErrorNote,
  LoadingRow,
  Pager,
  Panel,
  StatusPill,
} from "@/components/admin/ui";
import {
  BookingDetailModal,
  canTakeDeskPayment,
  type BookingRow,
} from "@/components/reception/bookings";

// The desk's working queue: has the client confirmed, and has the fee landed?
// Both questions are answered — and actioned — from one screen.

const QUEUES = [
  {
    key: "unconfirmed",
    label: "Awaiting confirmation",
    empty: "Every upcoming session has been confirmed.",
    subtitle:
      "Upcoming sessions the client has not confirmed yet. Confirming holds the slot for them.",
  },
  {
    key: "holds",
    label: "Payment holds",
    empty: "No live payment holds.",
    subtitle:
      "Pay-now reservations still inside their payment window. They release automatically when the window lapses.",
  },
  {
    key: "unpaid",
    label: "Fees to collect",
    empty: "No outstanding fees.",
    subtitle:
      "Booked sessions whose fee has not been collected. Record a desk payment to settle one.",
  },
  {
    key: "today",
    label: "Today",
    empty: "Nothing scheduled for today.",
    subtitle: "Everything on today's sheet, whatever its state.",
  },
  {
    key: "upcoming",
    label: "Next 7 days",
    empty: "Nothing booked in the next seven days.",
    subtitle: "Live sessions on the book for the coming week.",
  },
] as const;

type QueueKey = (typeof QUEUES)[number]["key"];

export default function ReceptionConfirmationsPage() {
  const [queue, setQueue] = useState<QueueKey>("unconfirmed");
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [collectFor, setCollectFor] = useState<string | null>(null);
  const [reference, setReference] = useState("");

  const active = QUEUES.find((entry) => entry.key === queue)!;

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        queue,
        page: String(page),
        sort: "dateTime",
        order: "asc",
      });
      const res = await fetch(`/api/reception/bookings?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load the queue");
      setRows(data.items);
      setTotal(data.total);
      setPageCount(data.pageCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load the queue");
    } finally {
      setLoading(false);
    }
  }, [queue, page]);

  useEffect(() => {
    const run = async () => {
      await fetchRows();
    };
    run();
  }, [fetchRows]);

  const act = async (id: string, body: Record<string, unknown>) => {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/reception/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      setCollectFor(null);
      setReference("");
      await fetchRows();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
      <div>
        <h1 className="mb-2 font-cormorant text-4xl font-semibold text-ocean-deep">
          Confirmations
        </h1>
        <p className="font-dmsans text-sm text-ink-muted">
          Confirm attendance and settle fees without leaving the desk.
        </p>
      </div>

      <div className="surface-inset inline-flex flex-wrap items-center gap-1 rounded-full p-1">
        {QUEUES.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => {
              setQueue(entry.key);
              setPage(1);
            }}
            className={`rounded-full px-4 py-1.5 font-dmsans text-xs font-semibold transition-all duration-200 ease-out-soft ${
              queue === entry.key
                ? "bg-ocean text-white shadow-surface-raised-sm"
                : "text-ink-muted hover:text-ocean-deep"
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <ErrorNote message={error} />

      <Panel
        title={active.label}
        subtitle={`${active.subtitle} ${total} in this queue.`}
      >
        {loading ? (
          <LoadingRow label="Loading the queue..." />
        ) : rows.length === 0 ? (
          <LoadingRow label={active.empty} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full font-dmsans text-sm">
              <thead>
                <tr className="border-b border-ocean/10 text-left text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  <th className="px-3 py-3">Session</th>
                  <th className="px-3 py-3">Client</th>
                  <th className="px-3 py-3">Consultant</th>
                  <th className="px-3 py-3 text-right">Fee</th>
                  <th className="px-3 py-3">State</th>
                  <th className="px-3 py-3 text-right">Desk actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const busy = busyId === row.id;
                  const canConfirm = ["PENDING", "AWAITING_PAYMENT"].includes(
                    row.status,
                  );
                  const canCollect = canTakeDeskPayment(row);
                  return (
                    <tr key={row.id} className="border-b border-ocean/5">
                      <td
                        className="cursor-pointer px-3 py-3.5"
                        onClick={() => setDetailId(row.id)}
                      >
                        <div className="font-semibold text-ocean-deep">
                          {row.service.name}
                        </div>
                        <div className="text-xs text-ink-muted">
                          {formatDate(row.dateTime)} ·{" "}
                          {formatTime(row.dateTime)}
                        </div>
                      </td>
                      <td
                        className="cursor-pointer px-3 py-3.5"
                        onClick={() => setDetailId(row.id)}
                      >
                        <div className="font-medium text-ink">
                          {row.client.name}
                        </div>
                        <div className="text-xs text-ink-muted">
                          {row.client.phone}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-ink">
                        {row.therapist.name}
                      </td>
                      <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-ocean-deep">
                        {formatINR(row.amountMinor)}
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex flex-wrap gap-1.5">
                          <StatusPill status={row.status} />
                          <StatusPill status={row.paymentStatus} />
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {canConfirm && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                act(row.id, {
                                  action: "transition",
                                  toStatus: "CONFIRMED",
                                })
                              }
                              className="inline-flex items-center gap-1.5 rounded-full bg-ocean px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white transition-all hover:-translate-y-0.5 disabled:opacity-40"
                            >
                              <BadgeCheck size={11} /> Confirm
                            </button>
                          )}
                          {canCollect && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                setCollectFor(
                                  collectFor === row.id ? null : row.id,
                                );
                                setReference("");
                              }}
                              className="inline-flex items-center gap-1.5 rounded-full border border-ocean/25 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ocean-deep transition-colors hover:bg-surface-sunken disabled:opacity-40"
                            >
                              <IndianRupee size={11} /> Mark paid
                            </button>
                          )}
                          {!canConfirm && !canCollect && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                              Settled
                            </span>
                          )}
                        </div>
                        {collectFor === row.id && (
                          <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                            <input
                              value={reference}
                              onChange={(e) => setReference(e.target.value)}
                              placeholder="Reference (optional)"
                              className="w-44 rounded-soft border border-ocean/20 bg-surface px-3 py-1.5 text-xs text-ink"
                            />
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                act(row.id, {
                                  action: "record-payment",
                                  ...(reference.trim()
                                    ? { reference: reference.trim() }
                                    : {}),
                                })
                              }
                              className="rounded-full bg-ocean-deep px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-40"
                            >
                              {busy ? "Saving…" : "Confirm payment"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
    </div>
  );
}
