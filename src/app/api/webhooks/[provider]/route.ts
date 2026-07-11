import { NextResponse } from "next/server";
import { handleApi, notFound } from "@/server/http";
import { processWebhook } from "@/server/services/paymentService";

// Gateway-agnostic webhook sink. When a real gateway adapter is registered,
// its events land here: signature validation and parsing happen inside the
// adapter, dedupe + financial posting inside the payment service.

export const POST = handleApi(
  async (request: Request, ctx: { params: Promise<{ provider: string }> }) => {
    const { provider } = await ctx.params;
    const rawBody = await request.text();
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    try {
      const result = await processWebhook(provider, rawBody, headers);
      return NextResponse.json(result);
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("Unknown payment provider")
      ) {
        throw notFound("Unknown payment provider");
      }
      throw err;
    }
  },
);
