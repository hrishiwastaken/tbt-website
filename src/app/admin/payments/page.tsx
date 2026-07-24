"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { formatINR, formatDateTime } from "@/lib/format";
import {
  ErrorNote,
  inputClass,
  LoadingRow,
  Pager,
  Panel,
  StatusPill,
} from "@/components/admin/ui";

interface Summary {
  grossRevenueMinor: number;
  refundsMinor: number;
  netRevenueMinor: number;
  platformRevenueMinor: number;
  consultantEarnedMinor: number;
  consultantPaidMinor: number;
}

interface PaymentRow {
  id: string;
  kind: string;
  provider: string;
  amountMinor: number;
  status: string;
  providerPaymentId: string | null;
  providerRef: string | null;
  createdAt: string;
  booking: {
    id: string;
    invoiceNumber: string | null;
    client: { name: string; email: string };
    service: { name: string };
    therapist: { name: string };
  };
}

export default function AdminPaymentsPage() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(q);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ page: String(page) });
        if (search) params.set("q", search);
        if (kind) params.set("kind", kind);
        const res = await fetch(`/api/admin/payments?${params}`);
        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error || "Failed to load transactions");
        setRows(data.items);
        setSummary(data.summary);
        setPageCount(data.pageCount);
        setTotal(data.total);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load transactions",
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [page, search, kind]);

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
      <div>
        <h1 className="mb-2 font-cormorant text-4xl font-semibold text-ocean-deep">
          Transactions
        </h1>
        <p className="font-dmsans text-sm text-ink-muted">
          Charges and refunds across all payment providers.
        </p>
      </div>

      <ErrorNote message={error} />

      {summary && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6 font-dmsans">
          {[
            ["Lifetime Gross", summary.grossRevenueMinor],
            ["Refunds", summary.refundsMinor],
            ["Net Revenue", summary.netRevenueMinor],
            ["Platform Share", summary.platformRevenueMinor],
            ["Consultant Earned", summary.consultantEarnedMinor],
            ["Consultant Paid", summary.consultantPaidMinor],
          ].map(([label, value]) => (
            <div
              key={label as string}
              className="surface-raised rounded-surface p-4"
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
      )}

      <Panel title="Payment Records" subtitle={`${total} transactions.`}>
        <div className="mb-5 flex flex-wrap gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search
              size={13}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search reference, invoice, client..."
              className={`${inputClass} !py-2 !pl-9 !text-xs`}
            />
          </div>
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setPage(1);
            }}
            className={`${inputClass} !py-2 !text-xs w-40`}
          >
            <option value="">Charges & refunds</option>
            <option value="CHARGE">Charges</option>
            <option value="REFUND">Refunds</option>
          </select>
        </div>

        {loading ? (
          <LoadingRow label="Loading transactions..." />
        ) : rows.length === 0 ? (
          <LoadingRow label="No transactions match." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full font-dmsans text-sm">
              <thead>
                <tr className="border-b border-ocean/10 text-left text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Invoice</th>
                  <th className="px-3 py-3">Client</th>
                  <th className="px-3 py-3">Consultant / Service</th>
                  <th className="px-3 py-3">Reference</th>
                  <th className="px-3 py-3 text-right">Amount</th>
                  <th className="px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-ocean/5">
                    <td className="whitespace-nowrap px-3 py-3.5 text-xs text-ink-muted">
                      {formatDateTime(row.createdAt)}
                    </td>
                    <td className="px-3 py-3.5 font-mono text-xs text-ink">
                      {row.booking.invoiceNumber || "—"}
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="font-medium text-ink">
                        {row.booking.client.name}
                      </div>
                      <div className="text-xs text-ink-muted">
                        {row.booking.client.email}
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-xs text-ink-muted">
                      {row.booking.therapist.name}
                      <br />
                      {row.booking.service.name}
                    </td>
                    <td className="px-3 py-3.5 font-mono text-xs text-ink-muted">
                      {row.providerRef || row.providerPaymentId || "—"}
                    </td>
                    <td
                      className={`px-3 py-3.5 text-right font-semibold tabular-nums ${row.kind === "REFUND" ? "text-red-700" : "text-ocean-deep"}`}
                    >
                      {row.kind === "REFUND" ? "−" : ""}
                      {formatINR(row.amountMinor)}
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusPill status={row.status} />
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
    </div>
  );
}
