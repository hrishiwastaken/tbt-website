// Date-range parsing shared by the analytics endpoints. Supports the
// dashboard presets (7d/30d/90d/month/year) and custom from/to ranges, and
// picks a chart bucketing granularity to match.

export type RangeKey = "7d" | "30d" | "90d" | "month" | "year" | "custom";
export type Granularity = "day" | "week" | "month";

export interface ResolvedRange {
  key: RangeKey;
  from: Date;
  to: Date;
  granularity: Granularity;
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function endOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
}

export function resolveRange(searchParams: URLSearchParams, now = new Date()): ResolvedRange {
  const key = (searchParams.get("range") || "30d") as RangeKey;
  const to = endOfDay(now);

  switch (key) {
    case "7d":
      return { key, from: startOfDay(addDays(now, -6)), to, granularity: "day" };
    case "30d":
      return { key, from: startOfDay(addDays(now, -29)), to, granularity: "day" };
    case "90d":
      return { key, from: startOfDay(addDays(now, -89)), to, granularity: "week" };
    case "month":
      return { key, from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), to, granularity: "day" };
    case "year":
      return { key, from: startOfDay(new Date(now.getFullYear(), 0, 1)), to, granularity: "month" };
    case "custom": {
      const fromParam = searchParams.get("from");
      const toParam = searchParams.get("to");
      const from = fromParam ? startOfDay(new Date(fromParam)) : startOfDay(addDays(now, -29));
      const toDate = toParam ? endOfDay(new Date(toParam)) : to;
      if (isNaN(from.getTime()) || isNaN(toDate.getTime()) || from > toDate) {
        throw new Error("Invalid custom date range");
      }
      const spanDays = Math.ceil((toDate.getTime() - from.getTime()) / 86400000);
      const granularity: Granularity = spanDays <= 45 ? "day" : spanDays <= 200 ? "week" : "month";
      return { key, from, to: toDate, granularity };
    }
    default:
      return { key: "30d", from: startOfDay(addDays(now, -29)), to, granularity: "day" };
  }
}

export function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

/** Stable bucket key for a timestamp at the given granularity. */
export function bucketKey(date: Date, granularity: Granularity): string {
  const d = new Date(date);
  if (granularity === "month") {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  if (granularity === "week") {
    const monday = new Date(d);
    const day = (d.getDay() + 6) % 7; // days since Monday
    monday.setDate(d.getDate() - day);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().slice(0, 10);
  }
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/** All bucket keys covering [from, to], so charts render gaps as zeroes. */
export function bucketKeys(from: Date, to: Date, granularity: Granularity): string[] {
  const keys: string[] = [];
  const cursor = new Date(from);
  const seen = new Set<string>();
  while (cursor <= to) {
    const key = bucketKey(cursor, granularity);
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
    cursor.setDate(cursor.getDate() + (granularity === "month" ? 28 : granularity === "week" ? 7 : 1));
  }
  const lastKey = bucketKey(to, granularity);
  if (!seen.has(lastKey)) keys.push(lastKey);
  return keys;
}

export function bucketLabel(key: string, granularity: Granularity): string {
  if (granularity === "month") {
    const [y, m] = key.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
  }
  const d = new Date(key);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
