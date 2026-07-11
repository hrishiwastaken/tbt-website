"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import {
  ErrorNote,
  Field,
  inputClass,
  LoadingRow,
  Panel,
} from "@/components/admin/ui";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface WeeklySlot {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface SlotBlock {
  id: string;
  startAt: string;
  endAt: string;
  reason: string | null;
}

export default function TherapistSettingsPage() {
  const [weekly, setWeekly] = useState<WeeklySlot[]>([]);
  const [blocks, setBlocks] = useState<SlotBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const [newDay, setNewDay] = useState(1);
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("10:00");

  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [blockError, setBlockError] = useState("");
  const [blockBusy, setBlockBusy] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/therapist/availability");
        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error || "Failed to load availability");
        setWeekly(data.weekly);
        setBlocks(data.blocks);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load availability",
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const addRow = () => {
    if (newStart >= newEnd) {
      setError("Start time must be before end time");
      return;
    }
    setError("");
    setWeekly((rows) => [
      ...rows,
      { dayOfWeek: newDay, startTime: newStart, endTime: newEnd },
    ]);
  };

  const removeRow = (idx: number) => {
    setWeekly((rows) => rows.filter((_, i) => i !== idx));
  };

  const saveWeekly = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/therapist/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekly: weekly.map(({ dayOfWeek, startTime, endTime }) => ({
            dayOfWeek,
            startTime,
            endTime,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save availability");
      setNotice("Weekly schedule saved.");
      setWeekly(data.weekly);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save availability",
      );
    } finally {
      setBusy(false);
    }
  };

  const addBlock = async () => {
    if (!blockStart || !blockEnd) {
      setBlockError("Start and end are required");
      return;
    }
    setBlockBusy(true);
    setBlockError("");
    try {
      const res = await fetch("/api/therapist/availability/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startAt: new Date(blockStart).toISOString(),
          endAt: new Date(blockEnd).toISOString(),
          reason: blockReason || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add block");
      setBlocks((rows) =>
        [...rows, data.block].sort((a, b) =>
          a.startAt.localeCompare(b.startAt),
        ),
      );
      setBlockStart("");
      setBlockEnd("");
      setBlockReason("");
    } catch (err) {
      setBlockError(err instanceof Error ? err.message : "Failed to add block");
    } finally {
      setBlockBusy(false);
    }
  };

  const removeBlock = async (id: string) => {
    setBlockBusy(true);
    try {
      const res = await fetch(`/api/therapist/availability/blocks/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove block");
      setBlocks((rows) => rows.filter((b) => b.id !== id));
    } catch (err) {
      setBlockError(
        err instanceof Error ? err.message : "Failed to remove block",
      );
    } finally {
      setBlockBusy(false);
    }
  };

  const groupedByDay = DAYS.map((_, day) =>
    weekly.map((w, idx) => ({ ...w, idx })).filter((w) => w.dayOfWeek === day),
  );

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
      <div>
        <h1 className="mb-2 font-cormorant text-4xl font-semibold text-ocean-deep">
          Availability Settings
        </h1>
        <p className="font-dmsans text-sm text-ink-muted">
          Manage your weekly working hours and block off one-off unavailability.
        </p>
      </div>

      <ErrorNote message={error} />
      {notice && (
        <div className="rounded-soft border border-emerald-200 bg-emerald-50 px-4 py-3 font-dmsans text-sm font-medium text-emerald-800">
          {notice}
        </div>
      )}

      <Panel
        title="Weekly Schedule"
        subtitle="Clients can only book slots that fall within these hours."
      >
        {loading ? (
          <LoadingRow label="Loading schedule..." />
        ) : (
          <div className="space-y-5 font-dmsans">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
              {DAYS.map((day, dayIdx) => (
                <div key={day} className="surface-inset rounded-soft p-3">
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ocean-deep">
                    {day}
                  </div>
                  <div className="space-y-1.5">
                    {groupedByDay[dayIdx].length === 0 && (
                      <p className="text-[11px] italic text-ink-muted">Off</p>
                    )}
                    {groupedByDay[dayIdx].map((slot) => (
                      <div
                        key={slot.idx}
                        className="flex items-center justify-between gap-1 rounded-full bg-surface px-2 py-1 text-[11px]"
                      >
                        <span className="text-ink">
                          {slot.startTime}–{slot.endTime}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeRow(slot.idx)}
                          className="text-ink-muted hover:text-red-700"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-end gap-3 border-t border-ocean/10 pt-4">
              <Field label="Day">
                <select
                  value={newDay}
                  onChange={(e) => setNewDay(Number(e.target.value))}
                  className={inputClass}
                >
                  {DAYS.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Start">
                <input
                  type="time"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="End">
                <input
                  type="time"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-1.5 rounded-full border border-ocean/25 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-ocean-deep hover:bg-surface-sunken"
              >
                <Plus size={13} /> Add slot
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={saveWeekly}
                className="ml-auto rounded-full bg-ocean px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-surface-raised-sm transition-all hover:-translate-y-0.5 disabled:opacity-40"
              >
                {busy ? "Saving..." : "Save weekly schedule"}
              </button>
            </div>
          </div>
        )}
      </Panel>

      <Panel
        title="Unavailability Blocks"
        subtitle="Block off leave or one-off unavailability within your normal hours."
      >
        <div className="space-y-4 font-dmsans">
          <ErrorNote message={blockError} />
          <div className="flex flex-wrap items-end gap-3">
            <Field label="From">
              <input
                type="datetime-local"
                value={blockStart}
                onChange={(e) => setBlockStart(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="To">
              <input
                type="datetime-local"
                value={blockEnd}
                onChange={(e) => setBlockEnd(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Reason (optional)">
              <input
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className={inputClass}
                placeholder="e.g. Leave"
              />
            </Field>
            <button
              type="button"
              disabled={blockBusy}
              onClick={addBlock}
              className="rounded-full bg-ocean px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-surface-raised-sm disabled:opacity-40"
            >
              Add block
            </button>
          </div>

          {blocks.length === 0 ? (
            <p className="text-xs italic text-ink-muted">
              No unavailability blocks scheduled.
            </p>
          ) : (
            <div className="space-y-2">
              {blocks.map((b) => (
                <div
                  key={b.id}
                  className="surface-inset flex flex-wrap items-center justify-between gap-2 rounded-soft px-4 py-2.5 text-xs"
                >
                  <span className="font-semibold text-ocean-deep">
                    {formatDateTime(b.startAt)} → {formatDateTime(b.endAt)}
                  </span>
                  <span className="text-ink-muted">{b.reason || "—"}</span>
                  <button
                    type="button"
                    onClick={() => removeBlock(b.id)}
                    disabled={blockBusy}
                    className="text-ink-muted hover:text-red-700"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
