import type { Config } from "@netlify/functions";

// Scheduled trigger for the payment reconciliation sweep. Netlify scheduled
// functions can't invoke Next.js route handlers directly, so this pings the
// app's cron endpoint with the shared secret. Requires APP_BASE_URL and
// CRON_SECRET in the site's environment.

export default async function handler() {
  const base = process.env.APP_BASE_URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) {
    console.error(
      "reconcile-payments: APP_BASE_URL / CRON_SECRET not configured; skipping",
    );
    return;
  }
  const res = await fetch(`${base}/api/cron/reconcile-payments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });
  const body = await res.text();
  if (!res.ok) {
    console.error(`reconcile-payments: HTTP ${res.status} — ${body}`);
    return;
  }
  console.log(`reconcile-payments: ${body}`);
}

export const config: Config = {
  schedule: "*/10 * * * *",
};
