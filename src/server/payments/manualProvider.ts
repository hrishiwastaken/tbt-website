import crypto from "crypto";
import type {
  CreateIntentInput,
  FetchPaymentStatusResult,
  PaymentIntentResult,
  PaymentProvider,
  RefundInput,
  RefundResult,
  VerificationResult,
  VerifyPaymentInput,
  WebhookParseResult,
} from "./types";

// Offline/manual provider: payments are collected out-of-band (UPI transfer,
// cash at clinic) and verified by staff against a reference (e.g. a 12-digit
// UPI UTR). It exercises the full provider contract so the surrounding
// plumbing — intents, verification, refunds, webhooks, idempotency — is
// proven before any real gateway adapter exists.

const UTR_PATTERN = /^\d{12}$/;

export const manualProvider: PaymentProvider = {
  name: "manual",

  async createIntent(input: CreateIntentInput): Promise<PaymentIntentResult> {
    // Deterministic order id from the idempotency key: retrying the same
    // request yields the same order instead of a duplicate.
    const hash = crypto
      .createHash("sha256")
      .update(input.idempotencyKey)
      .digest("hex")
      .slice(0, 16);
    return {
      providerOrderId: `manual_${hash}`,
      clientAction: { type: "none" },
    };
  },

  async verifyPayment(input: VerifyPaymentInput): Promise<VerificationResult> {
    const utr = input.proof?.utr ?? input.providerPaymentId;
    if (!utr || !UTR_PATTERN.test(utr)) {
      return {
        ok: false,
        reason: "A valid 12-digit UPI reference (UTR) is required",
      };
    }
    return { ok: true, providerPaymentId: utr };
  },

  async parseWebhook(): Promise<WebhookParseResult> {
    // Manual payments have no webhook source; nothing should route here.
    throw new Error("The manual payment provider does not receive webhooks");
  },

  async refund(input: RefundInput): Promise<RefundResult> {
    // Refunds are executed out-of-band; record intent immediately.
    const hash = crypto
      .createHash("sha256")
      .update(input.idempotencyKey)
      .digest("hex")
      .slice(0, 16);
    return {
      ok: true,
      providerRefundId: `manual_rf_${hash}`,
      status: "SUCCEEDED",
    };
  },

  async fetchPaymentStatus(): Promise<FetchPaymentStatusResult> {
    return { status: "UNKNOWN" }; // no remote source of truth for manual payments
  },
};
