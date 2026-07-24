import { splitPayment, splitRefund } from "./commission";

// Pure ledger-posting rules. Given a financial event these functions return
// the exact set of immutable LedgerEntry rows to insert — services persist
// them inside the same transaction as the triggering event and never edit
// them afterwards.

export const LEDGER_ENTRY_TYPES = [
  "GROSS_REVENUE",
  "DISCOUNT",
  "TAX_COLLECTED",
  "REFUND",
  "COMMISSION_ACCRUED",
  "COMMISSION_REVERSED",
  "PLATFORM_REVENUE",
  "PLATFORM_REVENUE_REVERSED",
  "PAYOUT_PAID",
  "ADJUSTMENT",
] as const;

export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number];

export interface LedgerPosting {
  entryType: LedgerEntryType;
  amountMinor: number; // signed
  description: string;
  bookingId?: string;
  paymentRecordId?: string;
  therapistId?: string;
  payoutId?: string;
}

export interface PaymentSuccessInput {
  bookingId: string;
  paymentRecordId: string;
  therapistId: string;
  grossMinor: number;
  discountMinor: number;
  taxMinor: number;
  commissionBps: number;
  invoiceNumber?: string | null;
}

/** Postings for a successfully collected charge. */
export function paymentSuccessPostings(
  input: PaymentSuccessInput,
): LedgerPosting[] {
  const split = splitPayment(input);
  const ref = input.invoiceNumber ? ` (${input.invoiceNumber})` : "";
  const base = {
    bookingId: input.bookingId,
    paymentRecordId: input.paymentRecordId,
  };

  const postings: LedgerPosting[] = [
    {
      ...base,
      entryType: "GROSS_REVENUE",
      amountMinor: input.grossMinor,
      description: `Gross booking amount collected${ref}`,
    },
  ];
  if (input.discountMinor > 0) {
    postings.push({
      ...base,
      entryType: "DISCOUNT",
      amountMinor: -input.discountMinor,
      description: `Discount applied${ref}`,
    });
  }
  if (input.taxMinor > 0) {
    postings.push({
      ...base,
      entryType: "TAX_COLLECTED",
      amountMinor: input.taxMinor,
      description: `Tax collected${ref}`,
    });
  }
  postings.push(
    {
      ...base,
      entryType: "COMMISSION_ACCRUED",
      amountMinor: split.commissionMinor,
      therapistId: input.therapistId,
      description: `Consultant commission accrued at ${input.commissionBps / 100}%${ref}`,
    },
    {
      ...base,
      entryType: "PLATFORM_REVENUE",
      amountMinor: split.platformMinor,
      description: `Platform share recognised${ref}`,
    },
  );
  return postings;
}

export interface RefundInput {
  bookingId: string;
  paymentRecordId: string; // the REFUND payment record
  therapistId: string;
  refundMinor: number;
  originalNetMinor: number;
  originalCommissionMinor: number;
  reason?: string;
}

/** Reversal postings for an executed refund. Original entries stay intact. */
export function refundPostings(input: RefundInput): LedgerPosting[] {
  const { commissionReversalMinor, platformReversalMinor } = splitRefund(input);
  const why = input.reason ? ` — ${input.reason}` : "";
  const base = {
    bookingId: input.bookingId,
    paymentRecordId: input.paymentRecordId,
  };
  return [
    {
      ...base,
      entryType: "REFUND",
      amountMinor: -input.refundMinor,
      description: `Refund issued${why}`,
    },
    {
      ...base,
      entryType: "COMMISSION_REVERSED",
      amountMinor: -commissionReversalMinor,
      therapistId: input.therapistId,
      description: `Consultant commission reversed on refund${why}`,
    },
    {
      ...base,
      entryType: "PLATFORM_REVENUE_REVERSED",
      amountMinor: -platformReversalMinor,
      description: `Platform share reversed on refund${why}`,
    },
  ];
}

export function payoutPaidPosting(input: {
  payoutId: string;
  therapistId: string;
  amountMinor: number;
  reference?: string | null;
}): LedgerPosting {
  return {
    entryType: "PAYOUT_PAID",
    amountMinor: -input.amountMinor,
    therapistId: input.therapistId,
    payoutId: input.payoutId,
    description: `Payout settled${input.reference ? ` (ref ${input.reference})` : ""}`,
  };
}
