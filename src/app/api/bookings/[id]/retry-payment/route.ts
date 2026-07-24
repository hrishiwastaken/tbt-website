import { NextResponse } from "next/server";
import { rateLimiter } from "@/lib/rateLimit";
import { clientIp, handleApi } from "@/server/http";
import { retryCharge } from "@/server/services/paymentStatusService";

// Retry a failed payment while the reservation TTL is still alive. Never
// creates a second live gateway order: a provider-PENDING attempt returns
// its existing checkout URL, and concurrent retriers converge on one
// attempt via the idempotency key.

export const POST = handleApi(
  async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
    // Namespaced key so status polling can't exhaust the retry budget.
    const { isBlocked } = rateLimiter(
      `payretry:${clientIp(request)}`,
      5,
      60000,
    );
    if (isBlocked) {
      return NextResponse.json(
        { error: "Too many retry attempts. Please wait a minute." },
        { status: 429 },
      );
    }
    const { id } = await ctx.params;
    const result = await retryCharge(id);
    return NextResponse.json(result);
  },
);
