// Client-safe formatting helpers. All amounts arrive as integer paise.

// Indian numbering compact suffixes, computed by hand rather than via
// Intl's "compact" notation: Chromium's en-IN ICU data mislabels the
// thousand tier as "T" (reads as trillion) instead of "K".
function compactRupees(rupees: number): string {
  const abs = Math.abs(rupees);
  const sign = rupees < 0 ? "-" : "";
  const trim = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

  if (abs >= 1e7) return `${sign}${trim(abs / 1e7)}Cr`;
  if (abs >= 1e5) return `${sign}${trim(abs / 1e5)}L`;
  if (abs >= 1e3) return `${sign}${trim(abs / 1e3)}K`;
  return `${sign}${abs}`;
}

export function formatINR(minor: number | null | undefined, opts: { compact?: boolean } = {}): string {
  const rupees = (minor ?? 0) / 100;
  if (opts.compact && Math.abs(rupees) >= 1000) {
    return `₹${compactRupees(rupees)}`;
  }
  return `₹${rupees.toLocaleString(
    "en-IN",
    rupees % 1 === 0
      ? { maximumFractionDigits: 0 }
      : { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  )}`;
}

export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatTime(value: string | Date): string {
  return new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(value: string | Date): string {
  return `${formatDate(value)}, ${formatTime(value)}`;
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
