// Provider-agnostic payment abstraction. Booking and revenue logic depend
// only on these interfaces; integrating a real gateway later means writing
// one adapter that implements PaymentProvider and registering it — nothing
// upstream changes.

export interface CreateIntentInput {
  bookingId: string;
  amountMinor: number;
  currency: string;
  customer: { name: string; email: string; phone: string };
  /** Caller-supplied idempotency key; providers must not double-create. */
  idempotencyKey: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntentResult {
  /** Provider-side order/intent id, stored on the PaymentRecord. */
  providerOrderId: string;
  /**
   * What the client should do next. "none" providers (manual/offline)
   * complete out-of-band; gateway providers return a checkout payload.
   */
  clientAction:
    { type: "none" } | { type: "checkout"; payload: Record<string, unknown> };
}

export interface VerifyPaymentInput {
  providerOrderId: string;
  providerPaymentId?: string;
  /** Opaque provider-specific proof (signature, UTR, etc.). */
  proof?: Record<string, string>;
}

export type VerificationResult =
  { ok: true; providerPaymentId: string } | { ok: false; reason: string };

export interface WebhookParseResult {
  /** Provider's unique event id — used for replay-safe dedupe. */
  externalId: string;
  eventType: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  status: "SUCCEEDED" | "FAILED" | "REFUNDED" | "IGNORED";
  amountMinor?: number;
}

export interface RefundInput {
  providerPaymentId: string;
  amountMinor: number;
  idempotencyKey: string;
  reason?: string;
}

export type RefundResult =
  | { ok: true; providerRefundId: string; status: "PROCESSING" | "SUCCEEDED" }
  | { ok: false; reason: string };

export interface PaymentProvider {
  readonly name: string;
  createIntent(input: CreateIntentInput): Promise<PaymentIntentResult>;
  verifyPayment(input: VerifyPaymentInput): Promise<VerificationResult>;
  /** Validate signature + parse a raw webhook request body. Throws on bad signature. */
  parseWebhook(
    rawBody: string,
    headers: Record<string, string>,
  ): Promise<WebhookParseResult>;
  refund(input: RefundInput): Promise<RefundResult>;
  /** Poll provider for the authoritative status of a payment (reconciliation). */
  fetchPaymentStatus(
    providerPaymentId: string,
  ): Promise<"SUCCEEDED" | "FAILED" | "PENDING" | "UNKNOWN">;
}
