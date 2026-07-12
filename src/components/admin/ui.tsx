"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { titleCase } from "@/lib/format";

// Shared admin console primitives, composed from the site's existing design
// tokens (surface-raised / surface-inset neumorphism, Cormorant headings,
// DM Sans body, ocean palette).

export function KpiCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="surface-raised rounded-surface flex flex-col justify-between p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className="font-dmsans text-[10px] font-bold uppercase tracking-wider text-ink-muted">
          {label}
        </span>
        {icon && (
          <span className="surface-inset flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ocean">
            {icon}
          </span>
        )}
      </div>
      <div>
        <span className="block font-dmsans text-2xl font-bold tabular-nums text-ocean-deep">
          {value}
        </span>
        {hint && (
          <span className="mt-0.5 block font-dmsans text-[11px] font-medium text-ink-muted/80">
            {hint}
          </span>
        )}
      </div>
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  actions,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`surface-raised rounded-surface p-6 md:p-8 ${className}`}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-ocean/10 pb-3">
        <div>
          <h3 className="font-cormorant text-2xl font-semibold text-ocean-deep">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 font-dmsans text-xs text-ink-muted">
              {subtitle}
            </p>
          )}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

// Status → tone mapping. Status colors are reserved for state, shown with a
// label (never color alone).
const STATUS_TONES: Record<string, string> = {
  // booking lifecycle
  PENDING: "bg-gold/40 text-ocean-deep border-gold/60",
  AWAITING_PAYMENT: "bg-gold/40 text-ocean-deep border-gold/60",
  CONFIRMED: "bg-ocean/10 text-ocean-deep border-ocean/25",
  COMPLETED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  CANCELLED: "bg-panel-sand/30 text-ink-muted border-panel-sand/50",
  NO_SHOW: "bg-blush/60 text-ocean-deep border-blush",
  REFUND_PENDING: "bg-amber-50 text-amber-800 border-amber-200",
  REFUNDED: "bg-panel-sand/30 text-ink-muted border-panel-sand/50",
  // payment
  UNPAID: "bg-gold/40 text-ocean-deep border-gold/60",
  PAID: "bg-emerald-50 text-emerald-800 border-emerald-200",
  SUCCEEDED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  CREATED: "bg-gold/40 text-ocean-deep border-gold/60",
  PROCESSING: "bg-ocean/10 text-ocean-deep border-ocean/25",
  FAILED: "bg-red-50 text-red-800 border-red-200",
  // consultants / payouts
  APPROVED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  SUSPENDED: "bg-red-50 text-red-800 border-red-200",
};

export function StatusPill({ status }: { status: string }) {
  const tone =
    STATUS_TONES[status] ?? "bg-ocean/10 text-ocean-deep border-ocean/20";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-dmsans text-[10px] font-bold uppercase tracking-wide ${tone}`}
    >
      {titleCase(status)}
    </span>
  );
}

export const RANGE_OPTIONS = [
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
  { key: "custom", label: "Custom" },
] as const;

export type RangeKey = (typeof RANGE_OPTIONS)[number]["key"];

export function RangeFilter({
  value,
  onChange,
  custom,
  onCustomChange,
}: {
  value: RangeKey;
  onChange: (key: RangeKey) => void;
  custom: { from: string; to: string };
  onCustomChange: (custom: { from: string; to: string }) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="surface-inset flex items-center gap-1 rounded-full p-1">
        {RANGE_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={`rounded-full px-3.5 py-1.5 font-dmsans text-xs font-semibold transition-all duration-200 ease-out-soft ${
              value === option.key
                ? "bg-ocean text-white shadow-surface-raised-sm"
                : "text-ink-muted hover:text-ocean-deep"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {value === "custom" && (
        <div className="flex items-center gap-2 font-dmsans text-xs">
          <input
            type="date"
            value={custom.from}
            onChange={(e) =>
              onCustomChange({ ...custom, from: e.target.value })
            }
            className="rounded-soft border border-ocean/20 bg-surface px-3 py-1.5 text-ink"
          />
          <span className="text-ink-muted">to</span>
          <input
            type="date"
            value={custom.to}
            onChange={(e) => onCustomChange({ ...custom, to: e.target.value })}
            className="rounded-soft border border-ocean/20 bg-surface px-3 py-1.5 text-ink"
          />
        </div>
      )}
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ocean-deep/40 p-4 backdrop-blur-sm md:p-10"
      onMouseDown={onClose}
    >
      <div
        className={`surface-raised w-full rounded-panel bg-surface p-6 md:p-8 ${wide ? "max-w-4xl" : "max-w-xl"} animate-[fadeIn_0.2s_ease-out]`}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-ocean/10 pb-3">
          <h3 className="font-cormorant text-2xl font-semibold text-ocean-deep">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="surface-inset flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:text-ocean-deep"
          >
            <X size={14} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Pager({
  page,
  pageCount,
  total,
  onPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between font-dmsans text-xs text-ink-muted">
      <span>
        Page {page} of {pageCount} · {total} records
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="rounded-full border border-ocean/20 px-4 py-1.5 font-semibold text-ocean-deep transition-colors hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => onPage(page + 1)}
          className="rounded-full border border-ocean/20 px-4 py-1.5 font-semibold text-ocean-deep transition-colors hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block font-dmsans">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-ink-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-soft border border-ocean/20 bg-surface px-3.5 py-2.5 font-dmsans text-sm text-ink placeholder:text-ink-muted/50";

export function ErrorNote({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="rounded-soft border border-red-200 bg-red-50 px-4 py-3 font-dmsans text-sm font-medium text-red-700">
      {message}
    </div>
  );
}

export function LoadingRow({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="py-10 text-center font-dmsans text-sm italic text-ink-muted">
      {label}
    </div>
  );
}
