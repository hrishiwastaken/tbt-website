"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDateTime } from "@/lib/format";
import {
  ErrorNote,
  Field,
  inputClass,
  LoadingRow,
  Pager,
  Panel,
} from "@/components/admin/ui";

interface CommissionHistoryRow {
  id: string;
  commissionBps: number;
  effectiveFrom: string;
  createdAt: string;
}

interface AuditRow {
  id: string;
  actorEmail: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  detail: string | null;
  createdAt: string;
}

export default function AdminSettingsPage() {
  const [defaultBps, setDefaultBps] = useState<number | null>(null);
  const [history, setHistory] = useState<CommissionHistoryRow[]>([]);
  const [pct, setPct] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [logPage, setLogPage] = useState(1);
  const [logPageCount, setLogPageCount] = useState(1);
  const [logTotal, setLogTotal] = useState(0);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/settings/commission");
    const data = await res.json();
    if (res.ok) {
      setDefaultBps(data.defaultCommissionBps);
      setPct(String(data.defaultCommissionBps / 100));
      setHistory(data.history);
    } else {
      setError(data.error || "Failed to load settings");
    }
  }, []);

  const loadLogs = useCallback(async () => {
    const res = await fetch(`/api/admin/audit-logs?page=${logPage}`);
    const data = await res.json();
    if (res.ok) {
      setLogs(data.items);
      setLogPageCount(data.pageCount);
      setLogTotal(data.total);
    }
  }, [logPage]);

  useEffect(() => {
    const run = async () => {
      await load();
    };
    run();
  }, [load]);
  useEffect(() => {
    const run = async () => {
      await loadLogs();
    };
    run();
  }, [loadLogs]);

  const save = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/settings/commission", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commissionBps: Math.round(Number(pct) * 100) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setNotice(
        "Default commission updated. Existing bookings keep their snapshotted rate.",
      );
      await load();
      await loadLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
      <div>
        <h1 className="mb-2 font-cormorant text-4xl font-semibold text-ocean-deep">
          Platform Settings
        </h1>
        <p className="font-dmsans text-sm text-ink-muted">
          Commission configuration and the administrative audit trail.
        </p>
      </div>

      <ErrorNote message={error} />
      {notice && (
        <div className="rounded-soft border border-emerald-200 bg-emerald-50 px-4 py-3 font-dmsans text-sm font-medium text-emerald-800">
          {notice}
        </div>
      )}

      <Panel
        title="Default Consultant Commission"
        subtitle="Applies to consultants without an override. Policy bounds: 30% – 35%. Changes are append-only; historical bookings are never re-rated."
      >
        {defaultBps === null ? (
          <LoadingRow />
        ) : (
          <div className="space-y-5 font-dmsans">
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Commission %">
                <input
                  type="number"
                  min={30}
                  max={35}
                  step={0.25}
                  value={pct}
                  onChange={(e) => setPct(e.target.value)}
                  className={`${inputClass} w-32`}
                />
              </Field>
              <button
                type="button"
                disabled={busy}
                onClick={save}
                className="rounded-full bg-ocean px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-surface-raised-sm transition-all hover:-translate-y-0.5 disabled:opacity-40"
              >
                {busy ? "Saving..." : "Save default"}
              </button>
              <span className="pb-2 text-xs text-ink-muted">
                Current:{" "}
                <strong className="text-ocean-deep">{defaultBps / 100}%</strong>
              </span>
            </div>

            <div>
              <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                Rate history
              </h4>
              <div className="space-y-1.5 text-xs">
                {history.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center gap-3 text-ink-muted"
                  >
                    <span className="font-mono text-[10px]">
                      {formatDateTime(row.effectiveFrom)}
                    </span>
                    <span className="font-semibold text-ocean-deep">
                      {row.commissionBps / 100}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Panel>

      <Panel
        title="Audit Trail"
        subtitle={`${logTotal} recorded administrative actions.`}
      >
        {logs.length === 0 ? (
          <LoadingRow label="No audit entries yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full font-dmsans text-xs">
              <thead>
                <tr className="border-b border-ocean/10 text-left text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  <th className="px-3 py-2.5">When</th>
                  <th className="px-3 py-2.5">Actor</th>
                  <th className="px-3 py-2.5">Action</th>
                  <th className="px-3 py-2.5">Entity</th>
                  <th className="px-3 py-2.5">Detail</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-ocean/5 align-top"
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[10px] text-ink-muted">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-3 py-2.5 text-ink">
                      {log.actorEmail || log.actorRole || "system"}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-ocean-deep">
                      {log.action}
                    </td>
                    <td className="px-3 py-2.5 text-ink-muted">
                      {log.entityType}
                      {log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ""}
                    </td>
                    <td className="max-w-xs truncate px-3 py-2.5 font-mono text-[10px] text-ink-muted">
                      {log.detail || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager
          page={logPage}
          pageCount={logPageCount}
          total={logTotal}
          onPage={setLogPage}
        />
      </Panel>
    </div>
  );
}
