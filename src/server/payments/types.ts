// Provider-agnostic payment abstraction. Booking and revenue logic depend
// only on these interfaces; integrating a real gateway means writing one
// adapter that implements PaymentProvider and registering it — nothing
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
  /**
   * OUR correlation key for this order at the provider (merchantOrderId).
   * Stored on PaymentRecord.providerOrderId; webhooks and status polls
   * look records up by it.
   */
  providerOrderId: string;
  /**
   * What the client should do next. "none" providers (manual/offline)
   * complete out-of-band; gateway providers return a checkout payload.
   */
  clientAction:
    { type: "none" } | { type: "checkout"; payload: Record<string, unknown> };
  /**
   * Provider-specific facts worth persisting on the PaymentRecord
   * (e.g. checkoutUrl, order expiry) so an idempotent replay can
   * reconstruct the clientAction without a second provider call.
   */
  metadata?: Record<string, unknown>;
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
  /** merchantOrderId (charges) / merchantRefundId (refunds). */
  providerOrderId?: string;
  providerPaymentId?: string;
  /**
   * SUCCEEDED/FAILED refer to charges; REFUNDED/REFUND_FAILED to refunds.
   * PENDING and IGNORED are recorded but cause no state change.
   */
  status:
    | "SUCCEEDED"
    | "FAILED"
    | "PENDING"
    | "REFUNDED"
    | "REFUND_FAILED"
    | "IGNORED";
  amountMinor?: number;
}

export interface RefundInput {
  providerPaymentId: string;
  /**
   * The original charge's merchantOrderId — some gateways (PhonePe) key
   * refunds on the order rather than the payment id.
   */
  providerOrderId?: string;
  /**
   * Caller-chosen correlation id for this refund at the provider. The
   * service persists it BEFORE calling the provider, so a crash mid-call
   * can always be reconciled by polling this id. Adapters must submit the
   * refund under this id when the gateway supports merchant refund ids.
   */
  merchantRefundId?: string;
  amountMinor: number;
  idempotencyKey: string;
  reason?: string;
}

export type RefundResult =
  | {
      ok: true;
      providerRefundId: string;
      status: "PROCESSING" | "SUCCEEDED";
      /** Our correlation key for the refund at the provider, when distinct. */
      merchantRefundId?: string;
    }
  | { ok: false; reason: string };

export interface FetchPaymentStatusInput {
  kind: "CHARGE" | "REFUND";
  /** merchantOrderId (charge) / merchantRefundId (refund). */
  providerOrderId?: string | null;
  providerPaymentId?: string | null;
}

export interface FetchPaymentStatusResult {
  status: "SUCCEEDED" | "FAILED" | "PENDING" | "UNKNOWN";
  /** transactionId / refundId when the provider reports one. */
  providerPaymentId?: string;
  /** Settled amount, for amount-mismatch checks on the poll path. */
  amountMinor?: number;
}

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
  /** Poll provider for the authoritative status of a charge or refund (reconciliation). */
  fetchPaymentStatus(
    input: FetchPaymentStatusInput,
  ): Promise<FetchPaymentStatusResult>;
}
