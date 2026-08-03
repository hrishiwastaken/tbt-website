/**
 * Shared input-format rules for the fields that only accept a restricted
 * character set — phone numbers and payment references.
 *
 * One definition drives both sides:
 *   - the client keeps the field clean while the user types (sanitize*), so
 *     a typo is prevented rather than reported after submit;
 *   - the server re-validates with the same character classes (see
 *     server/validation.ts), because a browser-side limiter is a usability
 *     feature, never an enforcement one.
 *
 * Keep the two in step by changing the constants here rather than inlining
 * a regex at a call site.
 */

/* ------------------------------------------------------------------ phone */

export const PHONE_MAX_LENGTH = 20;
/** Minimum *digits* (not characters) — spacing and punctuation don't count. */
export const PHONE_MIN_DIGITS = 8;
export const PHONE_MAX_DIGITS = 15; // E.164 caps the subscriber number at 15

/**
 * Digits plus the punctuation people actually type in a phone number:
 * a leading +, spaces, hyphens and parentheses around an area code.
 */
export const PHONE_ALLOWED_CHARS = /[^0-9+\s()-]/g;

/** For the `pattern` attribute — native form validation where a form exists. */
export const PHONE_PATTERN = "[0-9+()\\s-]{8,20}";
export const PHONE_TITLE =
  "Digits, and optionally + ( ) - and spaces. Include the country code, e.g. +91 98765 43210";

export function countDigits(value: string): number {
  return (value.match(/\d/g) ?? []).length;
}

/**
 * Strip anything that cannot appear in a phone number and cap the length.
 * A lone leading "+" is kept (people type it first), but "+" elsewhere is
 * dropped so "+91+98" cannot be built up.
 */
export function sanitizePhone(raw: string): string {
  if (typeof raw !== "string") return "";
  const cleaned = raw.replace(PHONE_ALLOWED_CHARS, "");
  const leadingPlus = cleaned.startsWith("+");
  const rest = (leadingPlus ? cleaned.slice(1) : cleaned).replace(/\+/g, "");
  return `${leadingPlus ? "+" : ""}${rest}`.slice(0, PHONE_MAX_LENGTH);
}

/** Whether a sanitized value carries a plausible number of digits. */
export function isPlausiblePhone(value: string): boolean {
  const digits = countDigits(value);
  return digits >= PHONE_MIN_DIGITS && digits <= PHONE_MAX_DIGITS;
}

/* -------------------------------------------------- payment references */

// A UPI UTR is 12 digits, but this same field also takes a card-machine
// receipt number or a cheque number, so letters are allowed. What is not
// allowed is punctuation that suggests free text was pasted in — a
// reference has to stay greppable in the payments list.
export const PAYMENT_REF_MAX_LENGTH = 64;
/** Payout transfer references come from banks and run longer. */
export const TRANSFER_REF_MAX_LENGTH = 120;

export const REFERENCE_ALLOWED_CHARS = /[^A-Za-z0-9/-]/g;
/**
 * Non-global twin of the above, for `.test()`. A /g regex carries lastIndex
 * between calls, so testing with one returns alternating results — use this
 * for predicates and keep the /g version for `.replace()`.
 */
export const REFERENCE_DISALLOWED = /[^A-Za-z0-9/-]/;
export const REFERENCE_PATTERN = "[A-Za-z0-9/-]+";
export const REFERENCE_TITLE =
  "Letters, digits, hyphen and slash only — e.g. a 12-digit UPI UTR";

export function sanitizeReference(
  raw: string,
  maxLength: number = PAYMENT_REF_MAX_LENGTH,
): string {
  if (typeof raw !== "string") return "";
  return raw.replace(REFERENCE_ALLOWED_CHARS, "").slice(0, maxLength);
}
