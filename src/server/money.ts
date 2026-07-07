// Money utilities. All amounts move through the system as integer minor
// units (paise). Floats only ever appear at the display boundary.

export function assertMinorUnits(value: number, label = "amount"): number {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${label} must be an integer amount in minor units, got ${value}`);
  }
  return value;
}

export function rupeesToMinor(rupees: number): number {
  return Math.round(rupees * 100);
}

export function minorToRupees(minor: number): number {
  return minor / 100;
}

/** "₹1,234.50" — for API payloads consumed directly by the UI. */
export function formatINR(minor: number, opts: { showPaise?: boolean } = {}): string {
  const { showPaise = false } = opts;
  const rupees = minor / 100;
  return rupees.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: showPaise ? 2 : 0,
    maximumFractionDigits: showPaise ? 2 : rupees % 1 === 0 ? 0 : 2,
  });
}
