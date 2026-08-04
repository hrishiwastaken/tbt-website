# Netlify Deploy Checklist

## 1. Add Environment Variables

In Netlify, open Site configuration > Environment variables.

Set:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
NEXTAUTH_SECRET="<long random secret>"
ENCRYPTION_KEY="<64-character hex key>"
PAYMENT_PROVIDER="manual"

# UPI payments via PhonePe PG (see section 5 before flipping PAYMENT_PROVIDER)
APP_BASE_URL="https://<your-site>.netlify.app"
CRON_SECRET="<long random secret>"
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="The Brain Tea <appointments@thebraintea.co.in>"
GOOGLE_MEET_LINK="https://meet.google.com/your-clinic-room"
PHONEPE_ENV="sandbox"                      # "production" when live
PHONEPE_CLIENT_ID="<from PhonePe business dashboard>"
PHONEPE_CLIENT_SECRET="<from PhonePe business dashboard>"
PHONEPE_CLIENT_VERSION="1"
PHONEPE_WEBHOOK_USERNAME="<choose one; also set in PhonePe dashboard>"
PHONEPE_WEBHOOK_PASSWORD="<choose one; also set in PhonePe dashboard>"
```

Verify the domain used by `RESEND_FROM_EMAIL` in Resend. `GOOGLE_MEET_LINK`
is included in the booking and reminder emails so either party can switch to
an online consultation. The `send-appointment-reminders` scheduled function
runs hourly and uses the existing `APP_BASE_URL` and `CRON_SECRET` settings.

Generate `ENCRYPTION_KEY` locally:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use a managed PostgreSQL database. `DIRECT_URL` can match `DATABASE_URL` when your provider gives only one connection string.

## 2. Push Schema And Seed

The Netlify build runs `prisma db push` automatically (see `netlify.toml`),
so schema changes sync to the live database on every deploy — the admin panel
can never fall behind the code. You only need to seed once:

```bash
npm ci --legacy-peer-deps
npx prisma db push   # optional locally; the deploy already does this
node prisma/seed.js
```

Seed creates admin login:

```bash
admin@thebraintea.com
AdminPass123!
```

## 3. Netlify Build Settings

Build command:

```bash
npm run build
```

Publish directory:

```bash
.next
```

Plugin:

```bash
@netlify/plugin-nextjs
```

## 4. Push Flow

Commit changes.
Push to GitHub or GitLab.
Netlify redeploys automatically.
Open `/admin/login` after deploy.

## 5. Enabling UPI Payments (PhonePe PG)

Ship with `PAYMENT_PROVIDER="manual"` first — online payment stays hidden
from clients until the gateway round-trip is verified.

1. Get merchant API credentials (client id/secret) from the PhonePe Business
   dashboard and set the `PHONEPE_*` variables above (start with
   `PHONEPE_ENV="sandbox"`).
2. In the PhonePe dashboard, configure the webhook:
   - URL: `https://<your-site>/api/webhooks/phonepe`
   - Username/password: the same values as `PHONEPE_WEBHOOK_USERNAME` /
     `PHONEPE_WEBHOOK_PASSWORD`.
3. Sandbox test: set `PAYMENT_PROVIDER="phonepe"` on a preview/staging site,
   make a test booking with "Pay Online via UPI", complete + fail one payment
   each, and confirm the booking flips to CONFIRMED/PAID only on success.
4. Flip `PHONEPE_ENV="production"` + production credentials, redeploy, and
   run one small live payment followed by an admin refund to verify the full
   loop.

The scheduled function `netlify/functions/reconcile-payments.mts` runs every
10 minutes and needs `APP_BASE_URL` + `CRON_SECRET` set; it resolves any
payment/refund whose webhook was missed and releases expired holds. (Without
Netlify scheduled functions, point any external cron at
`POST /api/cron/reconcile-payments` with `Authorization: Bearer $CRON_SECRET`.)

Notes:

- Refunds executed from the admin console go back through PhonePe to the
  payer's UPI account; they show as "processing" until PhonePe confirms.
- Admin-scheduled appointments with "fee already paid" always record through
  the manual provider (money collected in person) regardless of
  `PAYMENT_PROVIDER`.
