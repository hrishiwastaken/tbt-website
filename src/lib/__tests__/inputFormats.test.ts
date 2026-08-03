import { describe, expect, it } from "vitest";
import {
  isPlausiblePhone,
  PHONE_MAX_LENGTH,
  sanitizePhone,
  sanitizeReference,
  TRANSFER_REF_MAX_LENGTH,
} from "../inputFormats";
import {
  paymentReferenceSchema,
  phoneSchema,
  transferReferenceSchema,
} from "@/server/validation";

// The client limiter and the server schema are two expressions of one rule.
// These tests pin both, and — most importantly — that they agree: anything
// the field lets a user type must survive server validation, or staff get
// mysterious 400s from a form that appeared to accept their input.

describe("sanitizePhone", () => {
  it("keeps the punctuation people actually type", () => {
    expect(sanitizePhone("+91 98765-43210")).toBe("+91 98765-43210");
    expect(sanitizePhone("(022) 2345 6789")).toBe("(022) 2345 6789");
  });

  it("strips letters and stray symbols", () => {
    expect(sanitizePhone("98765abc43210")).toBe("9876543210");
    expect(sanitizePhone("98765#4321*0")).toBe("9876543210");
  });

  it("keeps only a leading plus", () => {
    expect(sanitizePhone("+919876543210")).toBe("+919876543210");
    // A second + cannot be built up mid-number.
    expect(sanitizePhone("+91+98765")).toBe("+9198765");
    expect(sanitizePhone("91+98765")).toBe("9198765");
  });

  it("caps length so the column limit cannot be exceeded", () => {
    expect(sanitizePhone("9".repeat(50))).toHaveLength(PHONE_MAX_LENGTH);
  });

  it("handles non-string input without throwing", () => {
    expect(sanitizePhone(null as unknown as string)).toBe("");
  });
});

describe("isPlausiblePhone", () => {
  it("counts digits, not characters", () => {
    // Eight digits dressed up in punctuation is still eight digits.
    expect(isPlausiblePhone("(12) 34-56 78")).toBe(true);
    // Punctuation alone must never satisfy a length rule.
    expect(isPlausiblePhone("--- () ---")).toBe(false);
  });

  it("rejects too few and too many digits", () => {
    expect(isPlausiblePhone("1234567")).toBe(false);
    expect(isPlausiblePhone("1".repeat(16))).toBe(false);
    expect(isPlausiblePhone("9876543210")).toBe(true);
  });
});

describe("sanitizeReference", () => {
  it("keeps a UPI UTR intact", () => {
    expect(sanitizeReference("402311223344")).toBe("402311223344");
  });

  it("keeps alphanumeric receipt and cheque numbers", () => {
    expect(sanitizeReference("NEFT-123/456")).toBe("NEFT-123/456");
  });

  it("strips spaces and free-text punctuation", () => {
    expect(sanitizeReference("UTR 4023 1122, paid cash!")).toBe(
      "UTR40231122paidcash",
    );
  });

  it("honours the caller's max length", () => {
    expect(sanitizeReference("A".repeat(200))).toHaveLength(64);
    expect(
      sanitizeReference("A".repeat(200), TRANSFER_REF_MAX_LENGTH),
    ).toHaveLength(TRANSFER_REF_MAX_LENGTH);
  });
});

describe("server schemas agree with the client limiters", () => {
  it("accepts every shape the phone field permits", () => {
    for (const v of [
      "+91 98765 43210",
      "9876543210",
      "(022) 2345 6789",
      "+919876543210",
    ]) {
      expect(phoneSchema.safeParse(v).success, v).toBe(true);
    }
  });

  it("rejects what the phone field would have stripped", () => {
    for (const v of ["98765abc43210", "not a phone", "", "   "]) {
      expect(phoneSchema.safeParse(v).success, v).toBe(false);
    }
  });

  it("rejects punctuation-only and out-of-range digit counts", () => {
    expect(phoneSchema.safeParse("--- () ---").success).toBe(false);
    expect(phoneSchema.safeParse("1234567").success).toBe(false);
    expect(phoneSchema.safeParse("1".repeat(16)).success).toBe(false);
  });

  it("accepts references the field permits and rejects the rest", () => {
    expect(paymentReferenceSchema.safeParse("402311223344").success).toBe(true);
    expect(paymentReferenceSchema.safeParse("NEFT-123/456").success).toBe(true);
    expect(paymentReferenceSchema.safeParse("paid in cash").success).toBe(false);
    expect(paymentReferenceSchema.safeParse("A".repeat(65)).success).toBe(false);
  });

  it("gives payout transfer references the longer bank-friendly limit", () => {
    const long = "A".repeat(100);
    expect(paymentReferenceSchema.safeParse(long).success).toBe(false);
    expect(transferReferenceSchema.safeParse(long).success).toBe(true);
  });

  it("is not confused by repeated calls (global-regex lastIndex trap)", () => {
    // REFERENCE_ALLOWED_CHARS carries /g; a predicate built on it would
    // alternate pass/fail across calls. Same input, same answer, every time.
    for (let i = 0; i < 4; i++) {
      expect(paymentReferenceSchema.safeParse("bad ref!").success).toBe(false);
      expect(paymentReferenceSchema.safeParse("GOODREF1").success).toBe(true);
    }
  });
});
