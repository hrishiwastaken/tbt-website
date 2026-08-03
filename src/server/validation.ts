import { z } from "zod";
import {
  countDigits,
  PAYMENT_REF_MAX_LENGTH,
  PHONE_MAX_DIGITS,
  PHONE_MAX_LENGTH,
  PHONE_MIN_DIGITS,
  REFERENCE_DISALLOWED,
  TRANSFER_REF_MAX_LENGTH,
} from "@/lib/inputFormats";

/**
 * Phone numbers, validated on the character classes the client-side limiter
 * enforces while typing. The browser limiter is a usability feature — this
 * is the enforcement, since anything can POST to the API directly.
 *
 * Length is counted in digits rather than characters so that "+91 98765
 * 43210" and "9876543210" are judged the same way, and a string of spaces
 * and hyphens cannot satisfy a minimum length.
 */
export const phoneSchema = z
  .string()
  .trim()
  .max(PHONE_MAX_LENGTH, `Phone number must be ${PHONE_MAX_LENGTH} characters or fewer`)
  .regex(
    /^\+?[0-9\s()-]+$/,
    "Phone number may contain only digits, and optionally + ( ) - and spaces",
  )
  .refine((v) => countDigits(v) >= PHONE_MIN_DIGITS, {
    message: `Phone number must have at least ${PHONE_MIN_DIGITS} digits`,
  })
  .refine((v) => countDigits(v) <= PHONE_MAX_DIGITS, {
    message: `Phone number must have at most ${PHONE_MAX_DIGITS} digits`,
  });

/** Payment / transfer references: greppable identifiers, not free text. */
function referenceSchema(maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength, `Reference must be ${maxLength} characters or fewer`)
    .refine((v) => !REFERENCE_DISALLOWED.test(v), {
      message: "Reference may contain only letters, digits, hyphen and slash",
    });
}

export const paymentReferenceSchema = referenceSchema(PAYMENT_REF_MAX_LENGTH);
export const transferReferenceSchema = referenceSchema(TRANSFER_REF_MAX_LENGTH);

export const httpUrl = z.string().url().refine((value) => {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}, { message: "URL must start with http:// or https://" });

const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

export function csvCell(value: unknown): string {
  const raw = value == null ? "" : String(value);
  const safe = FORMULA_TRIGGER.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function toCsv(rows: unknown[][]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}
