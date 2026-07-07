import { describe, expect, it } from "vitest";
import {
  DEFAULT_COMMISSION_BPS,
  isValidCommissionBps,
  resolveCommissionBps,
  splitPayment,
  splitRefund,
} from "../commission";

describe("resolveCommissionBps", () => {
  it("uses the platform default when no override exists", () => {
    expect(resolveCommissionBps(null, DEFAULT_COMMISSION_BPS)).toBe(3000);
    expect(resolveCommissionBps(undefined, 3200)).toBe(3200);
  });

  it("prefers the consultant override", () => {
    expect(resolveCommissionBps(3500, 3000)).toBe(3500);
  });

  it("rejects invalid rates", () => {
    expect(() => resolveCommissionBps(-1, 3000)).toThrow();
    expect(() => resolveCommissionBps(10001, 3000)).toThrow();
    expect(isValidCommissionBps(0.5 as unknown as number)).toBe(false);
  });
});

describe("splitPayment", () => {
  it("splits at 30% with exact-sum invariant", () => {
    const split = splitPayment({ grossMinor: 150000, commissionBps: 3000 });
    expect(split.netMinor).toBe(150000);
    expect(split.commissionMinor).toBe(45000);
    expect(split.platformMinor).toBe(105000);
  });

  it("commission + platform always equals net, even with odd paise", () => {
    for (const grossMinor of [99999, 10001, 33333, 1, 7]) {
      for (const commissionBps of [3000, 3250, 3333, 3500]) {
        const split = splitPayment({ grossMinor, commissionBps });
        expect(split.commissionMinor + split.platformMinor).toBe(split.netMinor);
        expect(Number.isSafeInteger(split.commissionMinor)).toBe(true);
      }
    }
  });

  it("commission is computed on net of discounts and tax", () => {
    const split = splitPayment({ grossMinor: 150000, discountMinor: 10000, taxMinor: 5000, commissionBps: 3000 });
    expect(split.netMinor).toBe(135000);
    expect(split.commissionMinor).toBe(40500);
    expect(split.platformMinor).toBe(94500);
  });

  it("rejects floats and over-discounts", () => {
    expect(() => splitPayment({ grossMinor: 100.5, commissionBps: 3000 })).toThrow();
    expect(() => splitPayment({ grossMinor: 100, discountMinor: 200, commissionBps: 3000 })).toThrow();
    expect(() => splitPayment({ grossMinor: -5, commissionBps: 3000 })).toThrow();
  });
});

describe("splitRefund", () => {
  it("fully reverses a full refund", () => {
    const { commissionReversalMinor, platformReversalMinor } = splitRefund({
      refundMinor: 150000,
      originalNetMinor: 150000,
      originalCommissionMinor: 45000,
    });
    expect(commissionReversalMinor).toBe(45000);
    expect(platformReversalMinor).toBe(105000);
  });

  it("attributes partial refunds proportionally with exact-sum invariant", () => {
    const { commissionReversalMinor, platformReversalMinor } = splitRefund({
      refundMinor: 50000,
      originalNetMinor: 150000,
      originalCommissionMinor: 45000,
    });
    expect(commissionReversalMinor).toBe(15000);
    expect(commissionReversalMinor + platformReversalMinor).toBe(50000);
  });

  it("rejects refunds above the collected amount", () => {
    expect(() =>
      splitRefund({ refundMinor: 200000, originalNetMinor: 150000, originalCommissionMinor: 45000 })
    ).toThrow();
  });
});
