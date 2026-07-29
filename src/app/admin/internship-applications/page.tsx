"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { formatDate } from "@/lib/format";
import {
  ErrorNote,
  LoadingRow,
  Modal,
  Pager,
  Panel,
  StatusPill,
} from "@/components/admin/ui";

interface ApplicationRow {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  college: string;
  course: string;
  yearOrSemester: string;
  internshipType: "graduate" | "postgraduate";
  preferredStart: string;
  statementOfPurpose: string;
  resumeFileName: string;
  status: string;
  createdAt: string;
}

const STATUSES = ["SUBMITTED", "REVIEWED", "ACCEPTED", "REJECTED"] as const;

export default function AdminInternshipApplicationsPage() {
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewing, setViewing] = useState<ApplicationRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/admin/internship-applications?page=${page}`,
        );
        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error || "Failed to load applications");
        if (cancelled) return;
        setRows(data.items);
        setPageCount(data.pageCount);
        setTotal(data.total);
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Failed to load applications",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [page, refreshKey]);

  const updateStatus = async (status: string) => {
    if (!viewing) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/internship-applications/${viewing.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      setViewing({ ...viewing, status });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
      <div>
        <h1 className="mb-2 font-cormorant text-4xl font-semibold text-ocean-deep">
          Internship Applications
        </h1>
        <p className="font-dmsans text-sm text-ink-muted">
          Submissions from the public internship page.
        </p>
      </div>

      <ErrorNote message={error} />

      <Panel title="Applications" subtitle={`${total} received.`}>
        {loading ? (
          <LoadingRow label="Loading applications..." />
        ) : rows.length === 0 ? (
          <LoadingRow label="No applications yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full font-dmsans text-sm">
              <thead>
                <tr className="border-b border-ocean/10 text-left text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  <th className="px-3 py-3">Applicant</th>
                  <th className="px-3 py-3">Program</th>
                  <th className="px-3 py-3">College</th>
                  <th className="px-3 py-3">Submitted</th>
                  <th className="px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-b border-ocean/5 hover:bg-surface-sunken"
                    onClick={() => setViewing(row)}
                  >
                    <td className="px-3 py-3.5">
                      <div className="font-semibold text-ocean-deep">
                        {row.fullName}
                      </div>
                      <div className="text-xs text-ink-muted">{row.email}</div>
                    </td>
                    <td className="px-3 py-3.5 text-xs text-ink-muted">
                      {row.internshipType === "graduate"
                        ? "Graduate"
                        : "Postgraduate"}
                    </td>
                    <td className="px-3 py-3.5 text-xs text-ink-muted">
                      {row.college}
                    </td>
                    <td className="px-3 py-3.5 text-xs text-ink-muted">
                      {formatDate(row.createdAt)}
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

      {viewing && (
        <Modal title={viewing.fullName} onClose={() => setViewing(null)} wide>
          <div className="space-y-4 font-dmsans">
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  Email
                </span>
                <span className="text-ocean-deep">{viewing.email}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  Phone
                </span>
                <span className="text-ocean-deep">{viewing.phone}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  College
                </span>
                <span className="text-ocean-deep">{viewing.college}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  Course / Year
                </span>
                <span className="text-ocean-deep">
                  {viewing.course} &middot; {viewing.yearOrSemester}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  Program
                </span>
                <span className="text-ocean-deep">
                  {viewing.internshipType === "graduate"
                    ? "Graduate — Administrative Focus"
                    : "Postgraduate — Clinical Focus"}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  Preferred Start
                </span>
                <span className="text-ocean-deep">
                  {formatDate(viewing.preferredStart)}
                </span>
              </div>
            </div>

            <div>
              <span className="block mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                Statement of Purpose
              </span>
              <p className="whitespace-pre-wrap rounded-soft border border-ocean/10 bg-surface-sunken p-4 text-sm text-ink">
                {viewing.statementOfPurpose}
              </p>
            </div>

            <a
              href={`/api/admin/internship-applications/${viewing.id}/resume`}
              className="inline-flex items-center gap-2 rounded-full border border-ocean/25 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-ocean-deep hover:bg-surface-sunken"
            >
              <Download size={12} /> Download {viewing.resumeFileName}
            </a>

            <div className="flex flex-wrap gap-2 border-t border-ocean/10 pt-4">
              {STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={busy || viewing.status === status}
                  onClick={() => updateStatus(status)}
                  className="rounded-full border border-ocean/20 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-ocean-deep transition-colors hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Mark {status.toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
