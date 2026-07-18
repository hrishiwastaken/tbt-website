import { NextResponse } from "next/server";
import { rateLimiter } from "@/lib/rateLimit";
import { clientIp, handleApi } from "@/server/http";
import { resolveBookingPaymentStatus } from "@/server/services/paymentStatusService";

// Payment state for the post-checkout polling page. Unauthenticated — the
// unguessable booking UUID is the capability (same model as the public
// booking-confirmed page) and the response carries state only, no PII.
// Rate-limited because unresolved states trigger a provider status call.

export const GET = handleApi(
  async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
    // Namespaced key: this endpoint polls frequently and must not drain the
    // shared per-IP budget used by booking creation (and vice versa).
    const { isBlocked } = rateLimiter(
      `paystatus:${clientIp(request)}`,
      30,
      60000,
    );
    if (isBlocked) {
      return NextResponse.json(
        { error: "Too many status checks. Please slow down." },
        { status: 429 },
      );
    }
    const { id } = await ctx.params;
    const status = await resolveBookingPaymentStatus(id);
    return NextResponse.json(status);
  },
);
