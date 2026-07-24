# Madhumati Clinic - Emotional Wellness Sanctuary

A premium, modern, fully functional Next.js App Router website for a therapy and psychology practice. This project implements "Quiet Luxury" aesthetics using optimized brand design tokens, structured layouts, and robust, compliant clinical components.

---

## 🛠️ Technology Stack

- **Frontend & Backend API**: Next.js (App Router), TypeScript service layer under `src/server`
- **Styling**: Tailwind CSS with The Brain Tea design tokens (ocean/ivory palette, neumorphic surfaces)
- **Database ORM**: Prisma ORM on PostgreSQL
- **Financials**: append-only double-entry-style ledger (`LedgerEntry`), integer paise money, commission snapshots per booking, payout settlement records
- **Payments**: provider-agnostic abstraction (`src/server/payments`) — a `manual` UPI-reference provider ships today; a real gateway (Razorpay/Stripe/…) plugs in later as one adapter without touching booking or revenue logic
- **Authentication**: JWT & HTTP-Only Secure Cookies, role-based access (ADMIN / THERAPIST)
- **Encryption**: AES-256-GCM encryption at rest for sensitive patient notes
- **Testing**: Vitest — pure domain unit tests plus Postgres-backed integration tests (double-booking concurrency, payment idempotency, refund reversal, payout guards)

---

## 🏗️ Backend Architecture

```
Booking → PaymentRecord → Charge success → LedgerEntry postings
        → Commission (snapshotted bps) → Consultant payable balance
        → Payout (PENDING → PAID) → PAYOUT_PAID ledger settlement
```

- **Booking state machine** (`src/server/domain/bookingStatus.ts`): `PENDING → AWAITING_PAYMENT → CONFIRMED → COMPLETED / CANCELLED / NO_SHOW / REFUND_PENDING → REFUNDED`, journalled in `BookingStatusHistory`.
- **Double-booking prevention**: a `BookingSlot` row per live hold with a DB unique constraint on `(therapistId, startAt)`, created inside the booking transaction — races lose at the database level.
- **Idempotency**: unique `idempotencyKey` on payment records, replay-safe charge/refund recording, deduped `WebhookEvent` journal for future gateway webhooks.
- **Immutable ledger**: refunds and corrections post reversal entries; historical rows are never edited. All dashboard KPIs and charts aggregate these persisted records.
- **Commission**: platform default (30–35% policy bounds, append-only history) with per-consultant overrides; every booking freezes its rate at creation.

---

## ⚙️ Local Setup Instructions

Follow these steps to run the clinic platform locally:

### 1. Install Dependencies

Run the package installation using the `--legacy-peer-deps` flag:

```bash
npm install --legacy-peer-deps
```

### 2. Configure Environment Variables

Create `.env` with your PostgreSQL connection and secrets:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/braintea"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/braintea"
NEXTAUTH_SECRET="change-me"
ENCRYPTION_KEY="<32-byte hex key>"
```

Generate a secure 32-byte hex encryption key for protecting notes at rest:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Initialize and Seed the Database

Synchronize the Prisma models and populate a realistic 90-day operating history (consultants, bookings, ledger entries, payouts):

```bash
npx prisma db push
node prisma/seed.js
```

### 4. Start Local Server

Launch the Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser.

### 5. Run Tests

```bash
npm test
```

Domain unit tests always run; the integration suite uses the database from `DATABASE_URL`.

---

## 🔒 Demo Portal Credentials

To test the secure dashboards, log in using the following accounts:

### Admin Portal

- **URL**: `/admin/login`
- **Email**: `admin@thebraintea.com`
- **Password**: `AdminPass123!`

### Therapist Portal

- **URL**: `/therapist/login`
- **Email**: `madhumati@thebraintea.com` (Dr. Madhumati Halande) OR `rohan@thebraintea.com` (Dr. Rohan Gupta)
- **Password**: `DrMadhumati123!` OR `DrRohan123!`

---

## 💸 Payment Gateway Integration (Future)

No gateway is integrated yet — payments run through the provider-agnostic layer in `src/server/payments` using the `manual` provider (staff-verified UPI references). To integrate a real gateway later:

1. Implement the `PaymentProvider` interface (`src/server/payments/types.ts`): intent creation, verification, webhook parsing/signature validation, refunds, status reconciliation.
2. Register the adapter in `src/server/payments/registry.ts` and set `PAYMENT_PROVIDER=<name>` in `.env`.
3. Point the gateway's webhooks at `https://yourdomain.com/api/webhooks/<name>` — dedupe, idempotent financial posting and ledger entries are already handled by the payment service.

Booking, revenue, commission and payout logic require **no changes**.

---

## 📱 Twilio WhatsApp Integration

1. Go to your **Twilio Console** and retrieve `ACCOUNT_SID` and `AUTH_TOKEN`.
2. Navigate to **Messaging -> Try it Out -> Send a WhatsApp Message** to configure your Twilio Sandbox.
3. Update `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_WHATSAPP_FROM` inside `.env`.
4. The system automatically triggers WhatsApp reminders 24 hours and 1 hour prior to scheduled appointments.

---

## 🚀 Deployment Guide

### Vercel Deployment (Preferred)

1. Commit your changes and push them to a Git repository (GitHub/GitLab).
2. Go to [Vercel](https://vercel.com) and click **Add New Project**.
3. Import your clinic repository.
4. Add all environment variables from `.env` inside the Vercel **Environment Variables** panel.
5. In **Prisma Build Command**, make sure your build script runs `npx prisma generate` before compilation. (Your `package.json` script can be configured as `"build": "prisma generate && next build"`).
6. Click **Deploy**.
