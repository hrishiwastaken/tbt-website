"use client";

import { useEffect, useState } from "react";
import { Search, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/format";
import {
  ErrorNote,
  inputClass,
  LoadingRow,
  Modal,
  Pager,
  Panel,
} from "@/components/admin/ui";

interface ClientRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  age: number;
  emergencyContact: string;
  createdAt: string;
  _count: { bookings: number };
}

export default function AdminClientsPage() {
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<ClientRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(q);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ page: String(page) });
        if (search) params.set("q", search);
        const res = await fetch(`/api/admin/clients?${params}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load clients");
        if (cancelled) return;
        setRows(data.items);
        setPageCount(data.pageCount);
        setTotal(data.total);
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Failed to load clients",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [page, search, refreshKey]);

  const erase = async () => {
    if (!deleting) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/clients", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: deleting.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erasure failed");
      setDeleting(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erasure failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
      <div>
        <h1 className="mb-2 font-cormorant text-4xl font-semibold text-ocean-deep">
          Clients
        </h1>
        <p className="font-dmsans text-sm text-ink-muted">
          Patient registry with GDPR/IT-Act compliant erasure.
        </p>
      </div>

      <ErrorNote message={error} />

      <Panel title="Patient Registry" subtitle={`${total} registered clients.`}>
        <div className="relative mb-5 max-w-md">
          <Search
            size={13}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
          />
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
                  <th className="px-3 py-3">Emergency contact</th>
                  <th className="px-3 py-3 text-right">Bookings</th>
                  <th className="px-3 py-3">Registered</th>
                  <th className="px-3 py-3 text-right">Compliance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-ocean/5">
                    <td className="px-3 py-3.5">
                      <div className="font-semibold text-ocean-deep">
                        {row.name}
                      </div>
                      <div className="text-xs text-ink-muted">
                        Age {row.age}
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-xs text-ink-muted">
                      {row.email}
                      <br />
                      {row.phone}
                    </td>
                    <td className="px-3 py-3.5 text-xs text-ink-muted">
                      {row.emergencyContact}
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums text-ink">
                      {row._count.bookings}
                    </td>
                    <td className="px-3 py-3.5 text-xs text-ink-muted">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setDeleting(row)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-red-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-700 transition-colors hover:bg-red-50"
                      >
                        <Trash2 size={11} /> Erase
                      </button>
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

      {deleting && (
        <Modal title="Compliance Erasure" onClose={() => setDeleting(null)}>
          <div className="space-y-4 font-dmsans">
            <p className="text-sm text-ink-muted">
              Permanently erase{" "}
              <strong className="text-ocean-deep">{deleting.name}</strong> and
              all their booking records ({deleting._count.bookings})? Anonymised
              financial ledger entries are retained so the books still balance.
              This cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                className="rounded-full border border-ocean/25 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-ocean-deep hover:bg-surface-sunken"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={erase}
                className="rounded-full bg-red-700 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-40"
              >
                {busy ? "Erasing..." : "Erase permanently"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
