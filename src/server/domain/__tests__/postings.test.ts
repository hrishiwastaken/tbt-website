import { describe, expect, it } from "vitest";
import {
  paymentSuccessPostings,
  payoutPaidPosting,
  refundPostings,
} from "../postings";

const paymentInput = {
  bookingId: "bk_1",
  paymentRecordId: "pay_1",
  therapistId: "th_1",
  grossMinor: 150000,
  discountMinor: 10000,
  taxMinor: 0,
  commissionBps: 3500,
  invoiceNumber: "INV-2026-TEST",
};

describe("paymentSuccessPostings", () => {
  it("posts gross, discount, commission and platform entries that reconcile", () => {
    const postings = paymentSuccessPostings(paymentInput);
    const byType = Object.fromEntries(
      postings.map((p) => [p.entryType, p.amountMinor]),
    );

    expect(byType.GROSS_REVENUE).toBe(150000);
    expect(byType.DISCOUNT).toBe(-10000);
    // net 140000 at 35% → 49000 / 91000
    expect(byType.COMMISSION_ACCRUED).toBe(49000);
    expect(byType.PLATFORM_REVENUE).toBe(91000);
    expect(byType.COMMISSION_ACCRUED + byType.PLATFORM_REVENUE).toBe(
      byType.GROSS_REVENUE + byType.DISCOUNT,
    );
  });

  it("tags the commission entry with the consultant and every entry with the payment", () => {
    const postings = paymentSuccessPostings(paymentInput);
    const commission = postings.find(
      (p) => p.entryType === "COMMISSION_ACCRUED",
    );
    expect(commission?.therapistId).toBe("th_1");
    for (const posting of postings) {
      expect(posting.bookingId).toBe("bk_1");
      expect(posting.paymentRecordId).toBe("pay_1");
    }
  });

  it("omits zero-value discount/tax entries", () => {
    const postings = paymentSuccessPostings({
      ...paymentInput,
      discountMinor: 0,
    });
    expect(postings.map((p) => p.entryType)).toEqual([
      "GROSS_REVENUE",
      "COMMISSION_ACCRUED",
      "PLATFORM_REVENUE",
    ]);
  });
});

describe("refundPostings", () => {
  it("posts negative reversals that mirror the original split", () => {
    const postings = refundPostings({
      bookingId: "bk_1",
      paymentRecordId: "rf_1",
      therapistId: "th_1",
      refundMinor: 140000,
      originalNetMinor: 140000,
      originalCommissionMinor: 49000,
    });
    const byType = Object.fromEntries(
      postings.map((p) => [p.entryType, p.amountMinor]),
    );
    expect(byType.REFUND).toBe(-140000);
    expect(byType.COMMISSION_REVERSED).toBe(-49000);
    expect(byType.PLATFORM_REVENUE_REVERSED).toBe(-91000);
    // reversal legs sum to the refund
    expect(byType.COMMISSION_REVERSED + byType.PLATFORM_REVENUE_REVERSED).toBe(
      byType.REFUND,
    );
  });
});

describe("payoutPaidPosting", () => {
  it("debits the consultant payable balance", () => {
    const posting = payoutPaidPosting({
      payoutId: "po_1",
      therapistId: "th_1",
      amountMinor: 50000,
      reference: "NEFT1",
    });
    expect(posting.entryType).toBe("PAYOUT_PAID");
    expect(posting.amountMinor).toBe(-50000);
    expect(posting.therapistId).toBe("th_1");
  });
});
