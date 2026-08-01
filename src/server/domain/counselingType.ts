// Counselling-type taxonomy for admin-scheduled appointments. This module is
// the single source of truth for the two categories the clinic books against
// — an individual session, or a couple / family session — and the canonical
// Service each maps to. The booking layer resolves a type to a real Service
// row (upserting the canonical one on first use) so durations, prices and the
// financial ledger all stay data-driven rather than hard-coded per booking.

export const COUNSELING_TYPES = ["INDIVIDUAL", "COUPLE_FAMILY"] as const;

export type CounselingType = (typeof COUNSELING_TYPES)[number];

/** Human labels for admin UI / audit trails. */
export const COUNSELING_TYPE_LABELS: Record<CounselingType, string> = {
  INDIVIDUAL: "Individual Counselling",
  COUPLE_FAMILY: "Couple / Family Counselling",
};

export interface CounselingServiceDefault {
  slug: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceMinor: number;
}

// Canonical Service definition per counselling type. Used to upsert a stable
// Service row the first time a type is scheduled, so the catalogue always has
// a matching offering without the admin needing to seed one by hand.
export const COUNSELING_SERVICE_DEFAULTS: Record<
  CounselingType,
  CounselingServiceDefault
> = {
  INDIVIDUAL: {
    slug: "individual-counselling",
    name: "Individual Counselling",
    description:
      "One-on-one counselling session tailored to a single client's goals and concerns.",
    durationMinutes: 50,
    priceMinor: 150000,
  },
  COUPLE_FAMILY: {
    slug: "couple-family-counselling",
    name: "Couple / Family Counselling",
    description:
      "Structured counselling session for couples or families, guided by a consultant.",
    // Every session the clinic runs is a 45–50 minute slot; keep this in step
    // with the public catalogue rather than letting admin-scheduled couple
    // sessions book a longer block.
    durationMinutes: 50,
    priceMinor: 220000,
  },
};

export function isCounselingType(value: string): value is CounselingType {
  return (COUNSELING_TYPES as readonly string[]).includes(value);
}

export function counselingTypeLabel(value: string | null | undefined): string {
  if (value && isCounselingType(value)) return COUNSELING_TYPE_LABELS[value];
  return "—";
}
