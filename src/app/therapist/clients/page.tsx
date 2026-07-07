"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { formatDate } from "@/lib/format";
import { ErrorNote, inputClass, LoadingRow, Pager, Panel } from "@/components/admin/ui";

interface ClientRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  sessionCount: number;
  completedCount: number;
  lastSessionAt: string | null;
}

export default function TherapistClientsPage() {
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");

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
      const res = await fetch(`/api/therapist/clients?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load clients");
      setRows(data.items);
      setPageCount(data.pageCount);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load clients");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
      <div>
        <h1 className="mb-2 font-cormorant text-4xl font-semibold text-ocean-deep">Your Clients</h1>
        <p className="font-dmsans text-sm text-ink-muted">Everyone you've held a session with.</p>
      </div>

      <ErrorNote message={error} />

      <Panel title="Client Roster" subtitle={`${total} clients.`}>
        <div className="relative mb-5 max-w-md">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, phone..."
            className={`${inputClass} !py-2 !pl-9 !text-xs`}
          />
        </div>

        {loading ? (
          <LoadingRow label="Loading clients..." />
        ) : rows.length === 0 ? (
          <LoadingRow label="No clients match." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full font-dmsans text-sm">
              <thead>
                <tr className="border-b border-ocean/10 text-left text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  <th className="px-3 py-3">Client</th>
                  <th className="px-3 py-3">Contact</th>
                  <th className="px-3 py-3 text-right">Sessions</th>
                  <th className="px-3 py-3 text-right">Completed</th>
                  <th className="px-3 py-3">Last Session</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-ocean/5">
                    <td className="px-3 py-3.5 font-semibold text-ocean-deep">{row.name}</td>
                    <td className="px-3 py-3.5 text-xs text-ink-muted">
                      {row.email}
                      <br />
                      {row.phone}
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums text-ink">{row.sessionCount}</td>
                    <td className="px-3 py-3.5 text-right tabular-nums text-ink">{row.completedCount}</td>
                    <td className="px-3 py-3.5 text-xs text-ink-muted">
                      {row.lastSessionAt ? formatDate(row.lastSessionAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager page={page} pageCount={pageCount} total={total} onPage={setPage} />
      </Panel>
    </div>
  );
}
