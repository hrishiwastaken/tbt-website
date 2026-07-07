// Client-safe formatting helpers. All amounts arrive as integer paise.

export function formatINR(minor: number | null | undefined, opts: { compact?: boolean } = {}): string {
  const rupees = (minor ?? 0) / 100;
  if (opts.compact && Math.abs(rupees) >= 1000) {
    return `₹${new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(rupees)}`;
  }
  return `₹${rupees.toLocaleString("en-IN", { maximumFractionDigits: rupees % 1 === 0 ? 0 : 2 })}`;
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
