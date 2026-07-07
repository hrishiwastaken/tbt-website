import { assertMinorUnits } from "../money";

// Commission is expressed in basis points (1 bps = 0.01%). The platform
// default lives in CommissionSetting rows; consultants may carry an
// override. Bookings snapshot the resolved bps at creation time so future
// rate changes never rewrite historical economics.

export const DEFAULT_COMMISSION_BPS = 3000; // 30%
export const MIN_COMMISSION_BPS = 0;
export const MAX_COMMISSION_BPS = 10000;

export function isValidCommissionBps(bps: number): boolean {
  return Number.isInteger(bps) && bps >= MIN_COMMISSION_BPS && bps <= MAX_COMMISSION_BPS;
}

export function resolveCommissionBps(
  therapistOverrideBps: number | null | undefined,
  platformDefaultBps: number
): number {
  const resolved = therapistOverrideBps ?? platformDefaultBps;
  if (!isValidCommissionBps(resolved)) {
    throw new Error(`Invalid commission bps: ${resolved}`);
  }
  return resolved;
}

export interface PaymentSplit {
  /** Commission base: gross - discount - tax. */
  netMinor: number;
  /** Consultant's share of the net amount. */
  commissionMinor: number;
  /** Platform's share; netMinor - commissionMinor, so the split always sums exactly. */
  platformMinor: number;
}

/**
 * Split a collected payment between consultant and platform.
 * Rounds the consultant's share half-up; the platform absorbs the paisa
 * remainder so commission + platform === net always holds.
 */
export function splitPayment(input: {
  grossMinor: number;
  discountMinor?: number;
  taxMinor?: number;
  commissionBps: number;
}): PaymentSplit {
  const grossMinor = assertMinorUnits(input.grossMinor, "grossMinor");
  const discountMinor = assertMinorUnits(input.discountMinor ?? 0, "discountMinor");
  const taxMinor = assertMinorUnits(input.taxMinor ?? 0, "taxMinor");

  if (!isValidCommissionBps(input.commissionBps)) {
    throw new Error(`Invalid commission bps: ${input.commissionBps}`);
  }
  if (grossMinor < 0 || discountMinor < 0 || taxMinor < 0) {
    throw new Error("Money components must be non-negative");
  }

  const netMinor = grossMinor - discountMinor - taxMinor;
  if (netMinor < 0) {
    throw new Error("Discounts and taxes exceed the gross amount");
  }

  const commissionMinor = Math.round((netMinor * input.commissionBps) / 10000);
  return {
    netMinor,
    commissionMinor,
    platformMinor: netMinor - commissionMinor,
  };
}

/**
 * Proportionally attribute a (possibly partial) refund back to the
 * consultant/platform split of the original payment. The consultant side is
 * rounded; the platform side takes the remainder, mirroring splitPayment.
 */
export function splitRefund(input: {
  refundMinor: number;
  originalNetMinor: number;
  originalCommissionMinor: number;
}): { commissionReversalMinor: number; platformReversalMinor: number } {
  const refundMinor = assertMinorUnits(input.refundMinor, "refundMinor");
  if (refundMinor < 0) throw new Error("Refund must be non-negative");
  if (refundMinor > input.originalNetMinor) {
    throw new Error("Refund exceeds the originally collected net amount");
  }
  if (input.originalNetMinor === 0) {
    return { commissionReversalMinor: 0, platformReversalMinor: 0 };
  }
  const commissionReversalMinor = Math.round(
    (input.originalCommissionMinor * refundMinor) / input.originalNetMinor
  );
  return {
    commissionReversalMinor,
    platformReversalMinor: refundMinor - commissionReversalMinor,
  };
}
