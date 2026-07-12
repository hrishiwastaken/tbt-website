"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatTime, titleCase } from "@/lib/format";
import {
  ErrorNote,
  LoadingRow,
  Panel,
  StatusPill,
} from "@/components/admin/ui";

interface Booking {
  id: string;
  dateTime: string;
  durationMinutes: number;
  status: string;
  client: { name: string };
  service: { name: string };
}

interface Availability {
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

interface CalendarPayload {
  from: string;
  to: string;
  bookings: Booking[];
  availability: Availability[];
  blocks: SlotBlock[];
}

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  const day = (out.getDay() + 6) % 7;
  out.setDate(out.getDate() - day);
  out.setHours(0, 0, 0, 0);
  return out;
}

function toDateParam(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function TherapistCalendarPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [data, setData] = useState<CalendarPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/therapist/calendar?from=${toDateParam(weekStart)}`,
        );
        const payload = await res.json();
        if (!res.ok)
          throw new Error(payload.error || "Failed to load calendar");
        setData(payload);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load calendar",
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [weekStart]);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const bookingsByDay = (day: Date) =>
    (data?.bookings || []).filter((b) => {
      const bd = new Date(b.dateTime);
      return bd.toDateString() === day.toDateString();
    });

  const availabilityFor = (dayOfWeek: number) =>
    (data?.availability || []).filter((a) => a.dayOfWeek === dayOfWeek);

  const blocksFor = (day: Date) =>
    (data?.blocks || []).filter((b) => {
      const start = new Date(b.startAt);
      const end = new Date(b.endAt);
      return (
        start.toDateString() === day.toDateString() ||
        (start <= day && end >= day)
      );
    });

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-2 font-cormorant text-4xl font-semibold text-ocean-deep">
            Calendar
          </h1>
          <p className="font-dmsans text-sm text-ink-muted">
            {weekStart.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            })}{" "}
            –{" "}
            {days[6].toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="surface-inset flex items-center gap-1 rounded-full p-1">
          <button
            type="button"
            onClick={() =>
              setWeekStart((d) => {
                const n = new Date(d);
                n.setDate(n.getDate() - 7);
                return n;
              })
            }
            className="flex h-8 w-8 items-center justify-center rounded-full text-ocean-deep transition-colors hover:bg-surface-sunken"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            className="rounded-full px-3.5 py-1.5 font-dmsans text-xs font-semibold text-ink-muted hover:text-ocean-deep"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() =>
              setWeekStart((d) => {
                const n = new Date(d);
                n.setDate(n.getDate() + 7);
                return n;
              })
            }
            className="flex h-8 w-8 items-center justify-center rounded-full text-ocean-deep transition-colors hover:bg-surface-sunken"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <ErrorNote message={error} />

      {loading ? (
        <LoadingRow label="Loading calendar..." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {days.map((day, i) => {
            const dayOfWeek = (i + 1) % 7; // Mon=1..Sun=0, matching Date.getDay()
            const bookings = bookingsByDay(day);
            const availability = availabilityFor(dayOfWeek);
            const blocks = blocksFor(day);
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <Panel
                key={i}
                title={`${DAY_LABELS[i]} ${day.getDate()}`}
                subtitle={
                  isToday
                    ? "Today"
                    : day.toLocaleDateString("en-IN", {
                        month: "short",
                        year: "numeric",
                      })
                }
                className={isToday ? "ring-2 ring-ocean/30" : ""}
              >
                <div className="space-y-3">
                  {availability.length === 0 ? (
                    <p className="text-[11px] italic text-ink-muted">
                      No working hours
                    </p>
                  ) : (
                    <p className="text-[11px] text-ink-muted">
                      Hours:{" "}
                      {availability
                        .map((a) => `${a.startTime}–${a.endTime}`)
                        .join(", ")}
                    </p>
                  )}
                  {blocks.map((b) => (
                    <div
                      key={b.id}
                      className="rounded-soft border border-panel-sand/60 bg-panel-sand/20 px-3 py-2 text-[11px] text-ink-muted"
                    >
                      Blocked{b.reason ? `: ${b.reason}` : ""}
                    </div>
                  ))}
                  {bookings.length === 0 ? (
                    <p className="text-xs italic text-ink-muted">No sessions</p>
                  ) : (
                    <div className="space-y-2">
                      {bookings.map((b) => (
                        <div
                          key={b.id}
                          className="surface-inset rounded-soft p-2.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-dmsans text-xs font-bold text-ocean-deep">
                              {formatTime(b.dateTime)}
                            </span>
                            <StatusPill status={b.status} />
                          </div>
                          <p className="mt-1 text-xs font-medium text-ink">
                            {b.client.name}
                          </p>
                          <p className="text-[11px] text-ink-muted">
                            {b.service.name} · {b.durationMinutes} min
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
