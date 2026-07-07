"use client";

import { useCallback, useEffect, useState } from "react";
import { formatINR, formatDate, titleCase } from "@/lib/format";
import { ErrorNote, LoadingRow, Panel, StatusPill } from "@/components/admin/ui";

interface Balance {
  earnedMinor: number;
  paidMinor: number;
  reservedMinor: number;
  payableMinor: number;
}

interface Payout {
  id: string;
  amountMinor: number;
  status: string;
  method: string | null;
  reference: string | null;
  createdAt: string;
  paidAt: string | null;
}

interface LedgerEntry {
  id: string;
  entryType: string;
  amountMinor: number;
  description: string;
  createdAt: string;
}

export default function TherapistEarningsPage() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/therapist/earnings");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load earnings");
      setBalance(data.balance);
      setPayouts(data.payouts);
      setEntries(data.entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load earnings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
      <div>
        <h1 className="mb-2 font-cormorant text-4xl font-semibold text-ocean-deep">Your Earnings</h1>
        <p className="font-dmsans text-sm text-ink-muted">
          Balance is derived from the clinic's immutable financial ledger. Payouts are created and settled by admin staff.
        </p>
      </div>

      <ErrorNote message={error} />

      {loading ? (
        <LoadingRow label="Loading earnings..." />
      ) : balance ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 font-dmsans">
          {[
            ["Earned", balance.earnedMinor],
            ["Paid", balance.paidMinor],
            ["Reserved", balance.reservedMinor],
            ["Payable", balance.payableMinor],
          ].map(([label, value]) => (
            <div key={label as string} className="surface-raised rounded-surface p-5 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">{label}</div>
              <div className="mt-1 text-xl font-bold tabular-nums text-ocean-deep">{formatINR(value as number)}</div>
            </div>
          ))}
        </div>
      ) : null}

      <Panel title="Payout History" subtitle="Settlements made to you.">
        {payouts.length === 0 ? (
          <LoadingRow label="No payouts yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full font-dmsans text-sm">
              <thead>
                <tr className="border-b border-ocean/10 text-left text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  <th className="px-3 py-3">Created</th>
                  <th className="px-3 py-3 text-right">Amount</th>
                  <th className="px-3 py-3">Method</th>
                  <th className="px-3 py-3">Reference</th>
                  <th className="px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-b border-ocean/5">
                    <td className="px-3 py-3.5 text-xs text-ink-muted">{formatDate(p.createdAt)}</td>
                    <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-ocean-deep">{formatINR(p.amountMinor)}</td>
                    <td className="px-3 py-3.5 text-xs text-ink-muted">{p.method || "—"}</td>
                    <td className="px-3 py-3.5 font-mono text-xs text-ink-muted">{p.reference || "—"}</td>
                    <td className="px-3 py-3.5">
                      <StatusPill status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Earnings Ledger" subtitle="Recent commission and settlement entries (latest 50).">
        {entries.length === 0 ? (
          <LoadingRow label="No earnings entries yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-ocean/5">
                    <td className="py-2 pr-3 font-mono text-[10px] text-ink-muted">{formatDate(entry.createdAt)}</td>
                    <td className="py-2 pr-3 font-semibold text-ocean-deep">{titleCase(entry.entryType)}</td>
                    <td className="py-2 pr-3 text-ink-muted">{entry.description}</td>
                    <td className={`py-2 text-right font-semibold tabular-nums ${entry.amountMinor < 0 ? "text-red-700" : "text-ink"}`}>
                      {formatINR(entry.amountMinor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
