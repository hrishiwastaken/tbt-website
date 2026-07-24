import crypto from "crypto";
import { NextResponse } from "next/server";
import { handleApi, unauthorized } from "@/server/http";
import { reconcilePayments } from "@/server/services/paymentStatusService";

// Reconciliation sweep endpoint — the scheduled backstop that resolves
// gateway payments/refunds whose webhooks were missed and expires dead
// reservations. Invoked by the Netlify scheduled function (or any external
// cron) with `Authorization: Bearer ${CRON_SECRET}`.

function assertCronAuth(request: Request): void {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw unauthorized("CRON_SECRET is not configured");
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw unauthorized();
  }
}

const run = handleApi(async (request: Request) => {
  assertCronAuth(request);
  const summary = await reconcilePayments();
  return NextResponse.json(summary);
});

export const POST = run;
export const GET = run;
