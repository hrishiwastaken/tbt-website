import crypto from "crypto";
import { NextResponse } from "next/server";
import { handleApi, unauthorized } from "@/server/http";
import { sendUpcomingReminders } from "@/server/services/emailNotificationService";

function assertCronAuth(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret ?? ""}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (!secret || a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw unauthorized();
}

const run = handleApi(async (request: Request) => {
  assertCronAuth(request);
  return NextResponse.json(await sendUpcomingReminders());
});

export const GET = run;
export const POST = run;
