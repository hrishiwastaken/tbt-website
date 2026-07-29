import crypto from "crypto";
import { unauthorized } from "../http";
import type {
  CreateIntentInput,
  FetchPaymentStatusInput,
  FetchPaymentStatusResult,
  PaymentIntentResult,
  PaymentProvider,
  RefundInput,
  RefundResult,
  VerificationResult,
  VerifyPaymentInput,
  WebhookParseResult,
} from "./types";

// PhonePe Payment Gateway (v2 Standard Checkout) adapter.
//
// Flow: createIntent opens a PhonePe order and returns the hosted checkout
// URL — there the payer picks ANY UPI app (GPay/PhonePe/Paytm/BHIM…) via
// UPI Intent/collect/QR with the amount pre-filled. Confirmation reaches us
// through dashboard-configured webhooks (validated below) and through the
// order-status API used by the status poll + reconciliation sweep. Refunds
// are asynchronous: initiation returns PENDING/CONFIRMED and completion
// arrives via pg.refund.* webhooks or the refund-status API.
//
// Env (read lazily so tests can stub):
//   PHONEPE_CLIENT_ID / PHONEPE_CLIENT_SECRET / PHONEPE_CLIENT_VERSION
//   PHONEPE_ENV                "sandbox" | "production" (default sandbox)
//   PHONEPE_BASE_URL           override PG base (required for mocked e2e)
//   PHONEPE_AUTH_BASE_URL      override OAuth base
//   PHONEPE_WEBHOOK_USERNAME / PHONEPE_WEBHOOK_PASSWORD
//   APP_BASE_URL               public origin for redirect URLs

interface PhonePeConfig {
  clientId: string;
  clientSecret: string;
  clientVersion: string;
  pgBase: string;
  authUrl: string;
  webhookUsername: string;
  webhookPassword: string;
  appBaseUrl: string;
}

function getConfig(): PhonePeConfig {
  const env =
    process.env.PHONEPE_ENV === "production" ? "production" : "sandbox";
  const defaults =
    env === "production"
      ? {
          pgBase: "https://api.phonepe.com/apis/pg",
          authUrl:
            "https://api.phonepe.com/apis/identity-manager/v1/oauth/token",
        }
      : {
          pgBase: "https://api-preprod.phonepe.com/apis/pg-sandbox",
          authUrl:
            "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token",
        };
  const config: PhonePeConfig = {
    clientId: process.env.PHONEPE_CLIENT_ID ?? "",
    clientSecret: process.env.PHONEPE_CLIENT_SECRET ?? "",
    clientVersion: process.env.PHONEPE_CLIENT_VERSION ?? "1",
    pgBase: process.env.PHONEPE_BASE_URL || defaults.pgBase,
    authUrl: process.env.PHONEPE_AUTH_BASE_URL || defaults.authUrl,
    webhookUsername: process.env.PHONEPE_WEBHOOK_USERNAME ?? "",
    webhookPassword: process.env.PHONEPE_WEBHOOK_PASSWORD ?? "",
    appBaseUrl: process.env.APP_BASE_URL ?? "",
  };
  if (!config.clientId || !config.clientSecret) {
    throw new Error(
      "PhonePe is not configured: set PHONEPE_CLIENT_ID and PHONEPE_CLIENT_SECRET",
    );
  }
  return config;
}

// ── OAuth token cache (per lambda instance, single-flight) ───────────────

let tokenCache: {
  token: string;
  expiresAtMs: number;
  inflight: Promise<string> | null;
} = { token: "", expiresAtMs: 0, inflight: null };

/** Test hook: drop the cached token. */
export function __resetPhonePeTokenCache(): void {
  tokenCache = { token: "", expiresAtMs: 0, inflight: null };
}

async function fetchToken(config: PhonePeConfig): Promise<string> {
  const res = await fetch(config.authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_version: config.clientVersion,
      client_secret: config.clientSecret,
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) {
    throw new Error(`PhonePe auth failed: HTTP ${res.status}`);
  }
  const data = (await res.json()) as {
    access_token?: string;
    expires_at?: number;
  };
  if (!data.access_token) {
    throw new Error("PhonePe auth response carried no access_token");
  }
  tokenCache.token = data.access_token;
  // expires_at is epoch seconds; refresh 60s early. Fall back to 10 min.
  tokenCache.expiresAtMs = data.expires_at
    ? data.expires_at * 1000 - 60000
    : Date.now() + 10 * 60000;
  return data.access_token;
}

async function getToken(config: PhonePeConfig): Promise<string> {
  if (tokenCache.token && Date.now() < tokenCache.expiresAtMs) {
    return tokenCache.token;
  }
  if (!tokenCache.inflight) {
    tokenCache.inflight = fetchToken(config).finally(() => {
      tokenCache.inflight = null;
    });
  }
  return tokenCache.inflight;
}

/**
 * Authenticated PG API call. Invalidates the cached token and retries once
 * on 401; retries once on network error / 5xx for idempotent GETs.
 */
async function pgFetch(
  config: PhonePeConfig,
  path: string,
  init: { method: "GET" | "POST"; body?: unknown },
  { retryOn5xx = false } = {},
): Promise<Response> {
  const attempt = async (): Promise<Response> => {
    const token = await getToken(config);
    return fetch(`${config.pgBase}${path}`, {
      method: init.method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `O-Bearer ${token}`,
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  };

  let res: Response;
  try {
    res = await attempt();
  } catch (err) {
    if (!retryOn5xx) throw err;
    res = await attempt(); // one retry on network failure
  }
  if (res.status === 401) {
    tokenCache.token = "";
    tokenCache.expiresAtMs = 0;
    res = await attempt();
  } else if (retryOn5xx && res.status >= 500) {
    res = await attempt();
  }
  return res;
}

// ── Helpers ───────────────────────────────────────────────────────────────

/** PhonePe merchant ids: alphanumeric/_/- only, ≤63 chars. Our idempotency
 *  keys contain colons, so ids are derived deterministically via SHA-256 —
 *  the same key can never mint two provider-side orders. */
function derivedId(prefix: string, idempotencyKey: string): string {
  return (
    prefix +
    crypto
      .createHash("sha256")
      .update(idempotencyKey)
      .digest("hex")
      .slice(0, 32)
  );
}

function clampExpireAfterSeconds(bookingExpiresAt: string | undefined): number {
  const fallback = 1200; // 20 min
  if (!bookingExpiresAt) return fallback;
  const ms = new Date(bookingExpiresAt).getTime() - Date.now();
  if (isNaN(ms)) return fallback;
  return Math.min(1800, Math.max(300, Math.floor(ms / 1000)));
}

type PhonePeOrderState = "COMPLETED" | "FAILED" | "PENDING" | string;

function mapOrderState(
  state: PhonePeOrderState,
): FetchPaymentStatusResult["status"] {
  switch (state) {
    case "COMPLETED":
      return "SUCCEEDED";
    case "FAILED":
      return "FAILED";
    case "PENDING":
      return "PENDING";
    default:
      return "UNKNOWN";
  }
}

function mapRefundState(
  state: PhonePeOrderState,
): FetchPaymentStatusResult["status"] {
  switch (state) {
    case "COMPLETED":
      return "SUCCEEDED";
    case "FAILED":
      return "FAILED";
    case "PENDING":
    case "CONFIRMED":
    case "ACCEPTED":
      return "PENDING";
    default:
      return "UNKNOWN";
  }
}

interface OrderStatusResponse {
  state?: PhonePeOrderState;
  amount?: number;
  paymentDetails?: { transactionId?: string }[];
}

async function fetchOrderStatus(
  config: PhonePeConfig,
  merchantOrderId: string,
): Promise<FetchPaymentStatusResult> {
  const res = await pgFetch(
    config,
    `/checkout/v2/order/${encodeURIComponent(merchantOrderId)}/status?details=false`,
    { method: "GET" },
    { retryOn5xx: true },
  );
  if (res.status === 404) return { status: "UNKNOWN" };
  if (!res.ok) {
    throw new Error(`PhonePe order status failed: HTTP ${res.status}`);
  }
  const data = (await res.json()) as OrderStatusResponse;
  return {
    status: mapOrderState(data.state ?? ""),
    providerPaymentId: data.paymentDetails?.[0]?.transactionId,
    amountMinor: typeof data.amount === "number" ? data.amount : undefined,
  };
}

// ── The provider ──────────────────────────────────────────────────────────

export const phonepeProvider: PaymentProvider = {
  name: "phonepe",

  async createIntent(input: CreateIntentInput): Promise<PaymentIntentResult> {
    const config = getConfig();
    if (input.currency !== "INR") {
      throw new Error(`PhonePe only supports INR, got ${input.currency}`);
    }
    const merchantOrderId = derivedId("TBT", input.idempotencyKey);
    const bookingId = input.metadata?.bookingId ?? input.bookingId;

    const res = await pgFetch(config, "/checkout/v2/pay", {
      method: "POST",
      body: {
        merchantOrderId,
        amount: input.amountMinor,
        expireAfter: clampExpireAfterSeconds(input.metadata?.bookingExpiresAt),
        metaInfo: { udf1: bookingId },
        paymentFlow: {
          type: "PG_CHECKOUT",
          message: "The Brain Tea session fee",
          merchantUrls: {
            redirectUrl: `${config.appBaseUrl}/booking/payment-status?bookingId=${bookingId}`,
          },
        },
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `PhonePe order creation failed: HTTP ${res.status} — ${body.slice(0, 300)}`,
      );
    }
    const data = (await res.json()) as {
      orderId?: string;
      redirectUrl?: string;
      expireAt?: number;
    };
    if (!data.redirectUrl) {
      throw new Error("PhonePe order response carried no checkout URL");
    }
    return {
      providerOrderId: merchantOrderId,
      clientAction: {
        type: "checkout",
        payload: { checkoutUrl: data.redirectUrl, expireAt: data.expireAt },
      },
      metadata: {
        checkoutUrl: data.redirectUrl,
        expireAt: data.expireAt,
        phonepeOrderId: data.orderId,
      },
    };
  },

  // The redirect back from checkout is untrusted; verification is an
  // authoritative server-to-server order-status check.
  async verifyPayment(input: VerifyPaymentInput): Promise<VerificationResult> {
    const config = getConfig();
    const status = await fetchOrderStatus(config, input.providerOrderId);
    if (status.status === "SUCCEEDED") {
      return {
        ok: true,
        providerPaymentId: status.providerPaymentId ?? input.providerOrderId,
      };
    }
    return { ok: false, reason: `Payment not completed (${status.status})` };
  },

  async parseWebhook(
    rawBody: string,
    headers: Record<string, string>,
  ): Promise<WebhookParseResult> {
    const config = getConfig();
    if (!config.webhookUsername || !config.webhookPassword) {
      throw unauthorized("PhonePe webhook credentials are not configured");
    }
    // PhonePe sends Authorization: SHA256(username:password) as hex,
    // matching the credentials configured in the merchant dashboard.
    const received = (headers["authorization"] ?? "")
      .replace(/^SHA256\s+/i, "")
      .trim()
      .toLowerCase();
    const expected = crypto
      .createHash("sha256")
      .update(`${config.webhookUsername}:${config.webhookPassword}`)
      .digest("hex");
    const a = Buffer.from(received);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw unauthorized("Invalid PhonePe webhook signature");
    }

    const body = JSON.parse(rawBody) as {
      event?: string;
      payload?: {
        merchantOrderId?: string;
        orderId?: string;
        merchantRefundId?: string;
        refundId?: string;
        amount?: number;
        paymentDetails?: { transactionId?: string }[];
      };
    };
    const event = body.event ?? "unknown";
    const payload = body.payload ?? {};
    const amountMinor =
      typeof payload.amount === "number" ? payload.amount : undefined;

    // PhonePe webhooks carry no event id; terminal events fire once per
    // order/refund and each retry attempt has its own merchant id, so
    // event+merchant-id is a stable dedupe key.
    const subject =
      payload.merchantOrderId ?? payload.merchantRefundId ?? "unknown";
    const base = {
      externalId: `${event}:${subject}`,
      eventType: event,
      amountMinor,
    };

    switch (event) {
      case "checkout.order.completed":
        return {
          ...base,
          status: "SUCCEEDED",
          providerOrderId: payload.merchantOrderId,
          providerPaymentId:
            payload.paymentDetails?.[0]?.transactionId ?? payload.orderId,
        };
      case "checkout.order.failed":
        return {
          ...base,
          status: "FAILED",
          providerOrderId: payload.merchantOrderId,
        };
      case "pg.refund.completed":
        return {
          ...base,
          status: "REFUNDED",
          providerOrderId: payload.merchantRefundId,
          providerPaymentId: payload.refundId,
        };
      case "pg.refund.failed":
        return {
          ...base,
          status: "REFUND_FAILED",
          providerOrderId: payload.merchantRefundId,
          providerPaymentId: payload.refundId,
        };
      default:
        // e.g. pg.refund.accepted — journal, no state change.
        return { ...base, status: "IGNORED" };
    }
  },

  async refund(input: RefundInput): Promise<RefundResult> {
    const config = getConfig();
    if (!input.providerOrderId) {
      return {
        ok: false,
        reason: "Missing original order id for PhonePe refund",
      };
    }
    const merchantRefundId =
      input.merchantRefundId ?? derivedId("RF", input.idempotencyKey);

    const res = await pgFetch(config, "/payments/v2/refund", {
      method: "POST",
      body: {
        merchantRefundId,
        originalMerchantOrderId: input.providerOrderId,
        amount: input.amountMinor,
      },
    });
    if (!res.ok) {
      const body = await res.text();
      return {
        ok: false,
        reason: `PhonePe refund failed: HTTP ${res.status} — ${body.slice(0, 300)}`,
      };
    }
    const data = (await res.json()) as {
      refundId?: string;
      state?: PhonePeOrderState;
    };
    const mapped = mapRefundState(data.state ?? "PENDING");
    if (mapped === "FAILED") {
      return { ok: false, reason: "PhonePe rejected the refund" };
    }
    return {
      ok: true,
      providerRefundId: data.refundId ?? merchantRefundId,
      status: mapped === "SUCCEEDED" ? "SUCCEEDED" : "PROCESSING",
      merchantRefundId,
    };
  },

  async fetchPaymentStatus(
    input: FetchPaymentStatusInput,
  ): Promise<FetchPaymentStatusResult> {
    const config = getConfig();
    if (!input.providerOrderId) return { status: "UNKNOWN" };

    if (input.kind === "CHARGE") {
      return fetchOrderStatus(config, input.providerOrderId);
    }

    const res = await pgFetch(
      config,
      `/payments/v2/refund/${encodeURIComponent(input.providerOrderId)}/status`,
      { method: "GET" },
      { retryOn5xx: true },
    );
    if (res.status === 404) return { status: "UNKNOWN" };
    if (!res.ok) {
      throw new Error(`PhonePe refund status failed: HTTP ${res.status}`);
    }
    const data = (await res.json()) as {
      state?: PhonePeOrderState;
      refundId?: string;
      amount?: number;
    };
    return {
      status: mapRefundState(data.state ?? ""),
      providerPaymentId: data.refundId,
      amountMinor: typeof data.amount === "number" ? data.amount : undefined,
    };
  },
};
