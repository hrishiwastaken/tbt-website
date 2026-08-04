import { describe, expect, it } from "vitest";
import {
  COUNSELING_SERVICE_DEFAULTS,
  COUNSELING_TYPES,
  counselingTypeLabel,
  isCounselingType,
} from "../counselingType";

describe("counselingType domain", () => {
  it("recognises the two supported types", () => {
    expect(isCounselingType("INDIVIDUAL")).toBe(true);
    expect(isCounselingType("COUPLE_FAMILY")).toBe(true);
    expect(isCounselingType("GROUP")).toBe(false);
    expect(isCounselingType("")).toBe(false);
  });

  it("labels known types and falls back for unknown/null", () => {
    expect(counselingTypeLabel("INDIVIDUAL")).toBe("Assessment");
    expect(counselingTypeLabel("COUPLE_FAMILY")).toBe(
      "Couple / Family Counselling",
    );
    expect(counselingTypeLabel(null)).toBe("—");
    expect(counselingTypeLabel("NONSENSE")).toBe("—");
  });

  it("defines a canonical, well-formed service for every type", () => {
    for (const type of COUNSELING_TYPES) {
      const def = COUNSELING_SERVICE_DEFAULTS[type];
      expect(def.slug).toMatch(/^[a-z0-9-]+$/);
      expect(def.name.length).toBeGreaterThan(0);
      expect(def.durationMinutes).toBeGreaterThan(0);
      expect(Number.isInteger(def.priceMinor)).toBe(true);
      expect(def.priceMinor).toBeGreaterThan(0);
    }
  });

  it("keeps canonical service slugs unique across types", () => {
    const slugs = COUNSELING_TYPES.map(
      (t) => COUNSELING_SERVICE_DEFAULTS[t].slug,
    );
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
