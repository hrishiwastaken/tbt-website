import crypto from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  phonepeProvider,
  __resetPhonePeTokenCache,
} from "../phonepeProvider";

// Adapter unit tests with a mocked fetch: request shapes, token lifecycle,
// webhook signature validation and event mapping, status mapping.

const AUTH_URL = "http://phonepe.test/auth/token";
const PG_BASE = "http://phonepe.test/pg";

interface MockCall {
  url: string;
  init?: RequestInit;
}

let calls: MockCall[] = [];

type RouteHandler = (
  url: string,
  init?: RequestInit,
) => { status?: number; json?: unknown };

function mockRoutes(routes: Record<string, RouteHandler>) {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: unknown, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      for (const [fragment, handler] of Object.entries(routes)) {
        if (url.includes(fragment)) {
          const result = handler(url, init);
          return new Response(JSON.stringify(result.json ?? {}), {
            status: result.status ?? 200,
            headers: { "Content-Type": "application/json" },
          });
        }
      }
      return new Response("{}", { status: 404 });
    }),
  );
}

const tokenRoute: RouteHandler = () => ({
  json: {
    access_token: "tok_1",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  },
});

const intentInput = {
  bookingId: "booking-123",
  amountMinor: 250000,
  currency: "INR",
  customer: { name: "T", email: "t@example.com", phone: "+911234567890" },
  idempotencyKey: "charge:booking-123:1",
  metadata: {
    bookingId: "booking-123",
    bookingExpiresAt: new Date(Date.now() + 30 * 60000).toISOString(),
  },
};

beforeEach(() => {
  process.env.PHONEPE_CLIENT_ID = "client";
  process.env.PHONEPE_CLIENT_SECRET = "secret";
  process.env.PHONEPE_CLIENT_VERSION = "1";
  process.env.PHONEPE_AUTH_BASE_URL = AUTH_URL;
  process.env.PHONEPE_BASE_URL = PG_BASE;
  process.env.PHONEPE_WEBHOOK_USERNAME = "hookuser";
  process.env.PHONEPE_WEBHOOK_PASSWORD = "hookpass";
  process.env.APP_BASE_URL = "https://clinic.test";
  __resetPhonePeTokenCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("phonepeProvider.createIntent", () => {
  it("creates an order with a provider-safe deterministic merchantOrderId and paise amount", async () => {
    mockRoutes({
      "/auth/token": tokenRoute,
      "/checkout/v2/pay": () => ({
        json: {
          orderId: "OMO123",
          redirectUrl: "https://mercury.phonepe.com/checkout/xyz",
          expireAt: Date.now() + 1200000,
        },
      }),
    });

    const result = await phonepeProvider.createIntent(intentInput);

    expect(result.providerOrderId).toMatch(/^TBT[0-9a-f]{32}$/);
    expect(result.clientAction).toMatchObject({
      type: "checkout",
      payload: { checkoutUrl: "https://mercury.phonepe.com/checkout/xyz" },
    });
    expect(result.metadata).toMatchObject({
      checkoutUrl: "https://mercury.phonepe.com/checkout/xyz",
      phonepeOrderId: "OMO123",
    });

    const payCall = calls.find((c) => c.url.includes("/checkout/v2/pay"))!;
    const body = JSON.parse(String(payCall.init?.body));
    expect(body.amount).toBe(250000);
    expect(body.merchantOrderId).toBe(result.providerOrderId);
    expect(body.paymentFlow.merchantUrls.redirectUrl).toBe(
      "https://clinic.test/booking/payment-status?bookingId=booking-123",
    );
    // expireAfter clamped into [300, 1800] and aligned to the ~30min TTL
    expect(body.expireAfter).toBeGreaterThanOrEqual(300);
    expect(body.expireAfter).toBeLessThanOrEqual(1800);
    // Same idempotency key ⇒ same order id (deterministic)
    const again = await phonepeProvider.createIntent(intentInput);
    expect(again.providerOrderId).toBe(result.providerOrderId);
  });

  it("rejects non-INR currencies", async () => {
    mockRoutes({ "/auth/token": tokenRoute });
    await expect(
      phonepeProvider.createIntent({ ...intentInput, currency: "USD" }),
    ).rejects.toThrow(/INR/);
  });

  it("fails loudly when the order response has no checkout URL", async () => {
    mockRoutes({
      "/auth/token": tokenRoute,
      "/checkout/v2/pay": () => ({ json: { orderId: "OMO1" } }),
    });
    await expect(phonepeProvider.createIntent(intentInput)).rejects.toThrow(
      /no checkout URL/,
    );
  });
});

describe("phonepeProvider token lifecycle", () => {
  it("caches the token across calls and refreshes on 401", async () => {
    let tokenFetches = 0;
    let firstStatusCall = true;
    mockRoutes({
      "/auth/token": () => {
        tokenFetches++;
        return {
          json: {
            access_token: `tok_${tokenFetches}`,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
          },
        };
      },
      "/checkout/v2/order/": (url, init) => {
        const auth = (init?.headers as Record<string, string>)?.Authorization;
        if (firstStatusCall && auth === "O-Bearer tok_1") {
          firstStatusCall = false;
          return { status: 401, json: {} }; // simulate expiry server-side
        }
        return { json: { state: "PENDING" } };
      },
    });

    // First call: token fetch → 401 → refresh → retry.
    const first = await phonepeProvider.fetchPaymentStatus({
      kind: "CHARGE",
      providerOrderId: "TBTabc",
    });
    expect(first.status).toBe("PENDING");
    expect(tokenFetches).toBe(2);

    // Second call: cached token, no new fetch.
    await phonepeProvider.fetchPaymentStatus({
      kind: "CHARGE",
      providerOrderId: "TBTabc",
    });
    expect(tokenFetches).toBe(2);
  });
});

describe("phonepeProvider.fetchPaymentStatus", () => {
  const statusOf = (state: string, extra: Record<string, unknown> = {}) => {
    mockRoutes({
      "/auth/token": tokenRoute,
      "/checkout/v2/order/": () => ({ json: { state, ...extra } }),
      "/payments/v2/refund/": () => ({ json: { state, ...extra } }),
    });
  };

  it("maps charge states and extracts transactionId + amount", async () => {
    statusOf("COMPLETED", {
      amount: 250000,
      paymentDetails: [{ transactionId: "TXN9" }],
    });
    const result = await phonepeProvider.fetchPaymentStatus({
      kind: "CHARGE",
      providerOrderId: "TBTabc",
    });
    expect(result).toEqual({
      status: "SUCCEEDED",
      providerPaymentId: "TXN9",
      amountMinor: 250000,
    });

    statusOf("FAILED");
    expect(
      (
        await phonepeProvider.fetchPaymentStatus({
          kind: "CHARGE",
          providerOrderId: "TBTabc",
        })
      ).status,
    ).toBe("FAILED");
  });

  it("maps refund states (CONFIRMED/ACCEPTED are still pending)", async () => {
    for (const [state, expected] of [
      ["COMPLETED", "SUCCEEDED"],
      ["FAILED", "FAILED"],
      ["PENDING", "PENDING"],
      ["CONFIRMED", "PENDING"],
      ["ACCEPTED", "PENDING"],
    ] as const) {
      statusOf(state);
      const result = await phonepeProvider.fetchPaymentStatus({
        kind: "REFUND",
        providerOrderId: "RFabc",
      });
      expect(result.status).toBe(expected);
    }
  });

  it("returns UNKNOWN on 404 and for a missing correlation id", async () => {
    mockRoutes({ "/auth/token": tokenRoute }); // status routes 404
    expect(
      (
        await phonepeProvider.fetchPaymentStatus({
          kind: "CHARGE",
          providerOrderId: "TBTmissing",
        })
      ).status,
    ).toBe("UNKNOWN");
    expect(
      (await phonepeProvider.fetchPaymentStatus({ kind: "CHARGE" })).status,
    ).toBe("UNKNOWN");
  });
});

describe("phonepeProvider.refund", () => {
  it("submits under the caller-chosen merchantRefundId with the original order id", async () => {
    mockRoutes({
      "/auth/token": tokenRoute,
      "/payments/v2/refund": () => ({
        json: { refundId: "RFD1", state: "PENDING" },
      }),
    });
    const result = await phonepeProvider.refund({
      providerPaymentId: "TXN9",
      providerOrderId: "TBTorder1",
      merchantRefundId: "RFcaller",
      amountMinor: 100000,
      idempotencyKey: "refund:b:100000:1",
    });
    expect(result).toEqual({
      ok: true,
      providerRefundId: "RFD1",
      status: "PROCESSING",
      merchantRefundId: "RFcaller",
    });
    const call = calls.find((c) => c.url.endsWith("/payments/v2/refund"))!;
    const body = JSON.parse(String(call.init?.body));
    expect(body).toEqual({
      merchantRefundId: "RFcaller",
      originalMerchantOrderId: "TBTorder1",
      amount: 100000,
    });
  });

  it("fails without the original order id and on provider rejection", async () => {
    mockRoutes({
      "/auth/token": tokenRoute,
      "/payments/v2/refund": () => ({ status: 400, json: {} }),
    });
    const missing = await phonepeProvider.refund({
      providerPaymentId: "TXN9",
      amountMinor: 1,
      idempotencyKey: "k",
    });
    expect(missing.ok).toBe(false);

    const rejected = await phonepeProvider.refund({
      providerPaymentId: "TXN9",
      providerOrderId: "TBTorder1",
      amountMinor: 1,
      idempotencyKey: "k",
    });
    expect(rejected.ok).toBe(false);
  });
});

describe("phonepeProvider.parseWebhook", () => {
  const validAuth = crypto
    .createHash("sha256")
    .update("hookuser:hookpass")
    .digest("hex");

  const completedBody = JSON.stringify({
    event: "checkout.order.completed",
    payload: {
      merchantOrderId: "TBTabc",
      orderId: "OMO1",
      amount: 250000,
      paymentDetails: [{ transactionId: "TXN9" }],
    },
  });

  it("accepts a correctly signed webhook and maps a completed order", async () => {
    const parsed = await phonepeProvider.parseWebhook(completedBody, {
      authorization: validAuth,
    });
    expect(parsed).toEqual({
      externalId: "checkout.order.completed:TBTabc",
      eventType: "checkout.order.completed",
      status: "SUCCEEDED",
      providerOrderId: "TBTabc",
      providerPaymentId: "TXN9",
      amountMinor: 250000,
    });
    // Optional "SHA256 " prefix is tolerated
    await expect(
      phonepeProvider.parseWebhook(completedBody, {
        authorization: `SHA256 ${validAuth}`,
      }),
    ).resolves.toBeTruthy();
  });

  it("rejects missing or wrong signatures", async () => {
    await expect(
      phonepeProvider.parseWebhook(completedBody, {}),
    ).rejects.toThrow();
    await expect(
      phonepeProvider.parseWebhook(completedBody, {
        authorization: "deadbeef",
      }),
    ).rejects.toThrow();
  });

  it("maps failure, refund and unknown events", async () => {
    const parse = (event: string, payload: Record<string, unknown>) =>
      phonepeProvider.parseWebhook(JSON.stringify({ event, payload }), {
        authorization: validAuth,
      });

    expect(
      await parse("checkout.order.failed", { merchantOrderId: "TBTabc" }),
    ).toMatchObject({ status: "FAILED", providerOrderId: "TBTabc" });

    expect(
      await parse("pg.refund.completed", {
        merchantRefundId: "RFabc",
        refundId: "RFD1",
        amount: 100000,
      }),
    ).toMatchObject({
      status: "REFUNDED",
      providerOrderId: "RFabc",
      providerPaymentId: "RFD1",
      externalId: "pg.refund.completed:RFabc",
    });

    expect(
      await parse("pg.refund.failed", { merchantRefundId: "RFabc" }),
    ).toMatchObject({ status: "REFUND_FAILED", providerOrderId: "RFabc" });

    expect(
      await parse("pg.refund.accepted", { merchantRefundId: "RFabc" }),
    ).toMatchObject({ status: "IGNORED" });
  });
});
