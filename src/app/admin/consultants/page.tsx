"use client";

import { useCallback, useEffect, useState } from "react";
import { formatINR, formatDate, formatDateTime, titleCase } from "@/lib/format";
import {
  ErrorNote,
  Field,
  inputClass,
  LoadingRow,
  Modal,
  Panel,
  StatusPill,
} from "@/components/admin/ui";

interface ConsultantRow {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  status: string;
  feeMinor: number;
  commissionBps: number | null;
  effectiveCommissionBps: number;
  totalBookings: number;
  earnedMinor: number;
  paidMinor: number;
  payableMinor: number;
  reservedMinor: number;
}

interface ConsultantDetail {
  consultant: {
    id: string;
    name: string;
    slug: string;
    bio: string;
    email: string | null;
    status: string;
    feeMinor: number;
    commissionBps: number | null;
    effectiveCommissionBps: number;
    availability: {
      id: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
    }[];
  };
  balance: {
    earnedMinor: number;
    paidMinor: number;
    reservedMinor: number;
    payableMinor: number;
  };
  payouts: {
    id: string;
    amountMinor: number;
    status: string;
    reference: string | null;
    createdAt: string;
    paidAt: string | null;
  }[];
  recentBookings: {
    id: string;
    dateTime: string;
    status: string;
    amountMinor: number;
    client: { name: string };
    service: { name: string };
  }[];
  earningsEntries: {
    id: string;
    entryType: string;
    amountMinor: number;
    description: string;
    createdAt: string;
  }[];
  defaultCommissionBps: number;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AdminConsultantsPage() {
  const [rows, setRows] = useState<ConsultantRow[]>([]);
  const [defaultBps, setDefaultBps] = useState(3000);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/consultants");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load consultants");
      setRows(data.consultants);
      setDefaultBps(data.defaultCommissionBps);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load consultants",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      await fetchRows();
    };
    run();
  }, [fetchRows]);

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
      <div>
        <h1 className="mb-2 font-cormorant text-4xl font-semibold text-ocean-deep">
          Consultants
        </h1>
        <p className="font-dmsans text-sm text-ink-muted">
          Roster, approval status, commission terms and live earning balances.
          Platform default commission: <strong>{defaultBps / 100}%</strong>.
        </p>
      </div>

      <ErrorNote message={error} />

      <Panel
        title="Practice Roster"
        subtitle="Balances are derived from the immutable financial ledger."
      >
        {loading ? (
          <LoadingRow label="Loading consultants..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full font-dmsans text-sm">
              <thead>
                <tr className="border-b border-ocean/10 text-left text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  <th className="px-3 py-3">Consultant</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Session fee</th>
                  <th className="px-3 py-3 text-right">Commission</th>
                  <th className="px-3 py-3 text-right">Bookings</th>
                  <th className="px-3 py-3 text-right">Earned</th>
                  <th className="px-3 py-3 text-right">Paid</th>
                  <th className="px-3 py-3 text-right">Payable</th>
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
                        {row.name}
                      </div>
                      <div className="text-xs text-ink-muted">
                        {row.email || row.slug}
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums text-ink">
                      {formatINR(row.feeMinor)}
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums text-ink">
                      {row.effectiveCommissionBps / 100}%
                      {row.commissionBps !== null && (
                        <span className="ml-1 text-[10px] font-bold uppercase text-ocean">
                          override
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums text-ink">
                      {row.totalBookings}
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums text-ink">
                      {formatINR(row.earnedMinor)}
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums text-ink">
                      {formatINR(row.paidMinor)}
                    </td>
                    <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-ocean-deep">
                      {formatINR(row.payableMinor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {detailId && (
        <ConsultantDetailModal
          consultantId={detailId}
          onClose={() => setDetailId(null)}
          onChanged={fetchRows}
        />
      )}
    </div>
  );
}

function ConsultantDetailModal({
  consultantId,
  onClose,
  onChanged,
}: {
  consultantId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<ConsultantDetail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [feeRupees, setFeeRupees] = useState("");
  const [commissionPct, setCommissionPct] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/consultants/${consultantId}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to load consultant");
      return;
    }
    setDetail(data);
    setFeeRupees(String(data.consultant.feeMinor / 100));
    setCommissionPct(
      data.consultant.commissionBps !== null
        ? String(data.consultant.commissionBps / 100)
        : "",
    );
  }, [consultantId]);

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
      const res = await fetch(`/api/admin/consultants/${consultantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const c = detail?.consultant;

  return (
    <Modal title="Consultant Profile" onClose={onClose} wide>
      {!c || !detail ? (
        <LoadingRow />
      ) : (
        <div className="space-y-6 font-dmsans">
          <ErrorNote message={error} />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-cormorant text-2xl font-semibold text-ocean-deep">
                {c.name}
              </div>
              <div className="text-xs text-ink-muted">{c.email || c.slug}</div>
            </div>
            <div className="flex items-center gap-2">
              <StatusPill status={c.status} />
              {c.status !== "APPROVED" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => patch({ status: "APPROVED" })}
                  className="rounded-full bg-ocean px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-surface-raised-sm disabled:opacity-40"
                >
                  Approve
                </button>
              )}
              {c.status === "APPROVED" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => patch({ status: "SUSPENDED" })}
                  className="rounded-full border border-red-200 px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-700 transition-colors hover:bg-red-50 disabled:opacity-40"
                >
                  Suspend
                </button>
              )}
            </div>
          </div>

          {/* Earnings summary */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["Earned", detail.balance.earnedMinor],
              ["Paid out", detail.balance.paidMinor],
              ["Reserved", detail.balance.reservedMinor],
              ["Payable", detail.balance.payableMinor],
            ].map(([label, value]) => (
              <div
                key={label as string}
                className="surface-inset rounded-soft p-3 text-center"
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  {label}
                </div>
                <div className="mt-1 text-lg font-bold tabular-nums text-ocean-deep">
                  {formatINR(value as number)}
                </div>
              </div>
            ))}
          </div>

          {/* Terms editor */}
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Session fee (₹)">
              <input
                type="number"
                min={1}
                value={feeRupees}
                onChange={(e) => setFeeRupees(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field
              label={`Commission % (blank = default ${detail.defaultCommissionBps / 100}%)`}
            >
              <input
                type="number"
                min={0}
                max={100}
                step={0.25}
                value={commissionPct}
                onChange={(e) => setCommissionPct(e.target.value)}
                className={inputClass}
                placeholder={`${detail.defaultCommissionBps / 100}`}
              />
            </Field>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                patch({
                  feeRupees: Number(feeRupees),
                  commissionBps:
                    commissionPct.trim() === ""
                      ? null
                      : Math.round(Number(commissionPct) * 100),
                })
              }
              className="rounded-full bg-ocean px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-surface-raised-sm disabled:opacity-40"
            >
              Save terms
            </button>
            <p className="w-full text-[11px] italic text-ink-muted">
              Rate changes only affect future bookings — historical bookings
              keep their snapshotted commission.
            </p>
          </div>

          {/* Availability */}
          <div>
            <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
              Weekly availability
            </h4>
            {c.availability.length === 0 ? (
              <p className="text-xs italic text-ink-muted">
                No availability configured.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 text-xs">
                {Object.entries(
                  c.availability.reduce<Record<number, string[]>>(
                    (acc, slot) => {
                      (acc[slot.dayOfWeek] ??= []).push(slot.startTime);
                      return acc;
                    },
                    {},
                  ),
                ).map(([day, times]) => (
                  <span
                    key={day}
                    className="surface-inset rounded-full px-3 py-1.5 text-ink-muted"
                  >
                    <strong className="text-ocean-deep">
                      {DAYS[Number(day)]}
                    </strong>{" "}
                    {times[0]}–
                    {
                      c.availability
                        .filter((s) => s.dayOfWeek === Number(day))
                        .slice(-1)[0].endTime
                    }{" "}
                    ({times.length} slots)
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Payout history */}
          <div>
            <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
              Payout history
            </h4>
            {detail.payouts.length === 0 ? (
              <p className="text-xs italic text-ink-muted">No payouts yet.</p>
            ) : (
              <div className="space-y-2">
                {detail.payouts.map((p) => (
                  <div
                    key={p.id}
                    className="surface-inset flex flex-wrap items-center justify-between gap-2 rounded-soft px-4 py-2.5 text-xs"
                  >
                    <span className="font-mono text-ink-muted">
                      {formatDate(p.createdAt)}
                    </span>
                    <span className="font-semibold tabular-nums text-ink">
                      {formatINR(p.amountMinor)}
                    </span>
                    <span className="font-mono text-ink-muted">
                      {p.reference || "—"}
                    </span>
                    <StatusPill status={p.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent appointments */}
          <div>
            <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
              Recent appointments
            </h4>
            <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1 text-xs">
              {detail.recentBookings.map((b) => (
                <div
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-ocean/5 py-1.5"
                >
                  <span className="text-ink-muted">
                    {formatDateTime(b.dateTime)}
                  </span>
                  <span className="font-medium text-ink">{b.client.name}</span>
                  <span className="text-ink-muted">{b.service.name}</span>
                  <span className="tabular-nums font-semibold text-ink">
                    {formatINR(b.amountMinor)}
                  </span>
                  <StatusPill status={b.status} />
                </div>
              ))}
            </div>
          </div>

          {/* Earnings ledger */}
          <div>
            <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
              Earnings ledger (latest 50)
            </h4>
            <div className="max-h-56 overflow-y-auto pr-1">
              <table className="w-full text-xs">
                <tbody>
                  {detail.earningsEntries.map((entry) => (
                    <tr key={entry.id} className="border-b border-ocean/5">
                      <td className="py-1.5 pr-3 font-mono text-[10px] text-ink-muted">
                        {formatDate(entry.createdAt)}
                      </td>
                      <td className="py-1.5 pr-3 font-semibold text-ocean-deep">
                        {titleCase(entry.entryType)}
                      </td>
                      <td
                        className={`py-1.5 text-right font-semibold tabular-nums ${entry.amountMinor < 0 ? "text-red-700" : "text-ink"}`}
                      >
                        {formatINR(entry.amountMinor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
