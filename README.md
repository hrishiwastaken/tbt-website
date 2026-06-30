# Madhumati Clinic - Emotional Wellness Sanctuary

A premium, modern, fully functional Next.js App Router website for a therapy and psychology practice. This project implements "Quiet Luxury" aesthetics using optimized brand design tokens, structured layouts, and robust, compliant clinical components.

---

## 🛠️ Technology Stack

- **Frontend & Backend API**: Next.js (App Router)
- **Styling**: Tailwind CSS v4 (configured with Sage-grey, Alabaster, Linen, and Rosewood CTA tokens)
- **Database ORM**: Prisma ORM with native SQLite for zero-dependency local development (compatible with PostgreSQL/Supabase for production)
- **Authentication**: JWT & HTTP-Only Secure Cookies session management
- **Payment Gateway**: Razorpay (India-specific gateway with simulated test checkout bypasses)
- **SMS/WhatsApp notifications**: Twilio WhatsApp API
- **Encryption**: AES-256-GCM encryption at rest for sensitive patient notes

---

## ⚙️ Local Setup Instructions

Follow these steps to run the clinic website locally:

### 1. Install Dependencies
Run the package installation using the `--legacy-peer-deps` flag:
```bash
npm install --legacy-peer-deps
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in the required keys:
```bash
cp .env.example .env
```
Ensure you generate a secure 32-byte hex encryption key for protecting notes at rest:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Initialize and Seed the Database
Synchronize the Prisma models to your local SQLite file and populate mock therapists, services, admin users, and transactions:
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

---

## 🔒 Demo Portal Credentials

To test the secure dashboards, log in using the following accounts:

### Admin Portal
- **URL**: `/admin/login`
- **Email**: `admin@madhumaticlinic.com`
- **Password**: `AdminPass123!`

### Therapist Portal
- **URL**: `/therapist/login`
- **Email**: `madhumati@madhumaticlinic.com` (Dr. Madhumati Halande) OR `rohan@madhumaticlinic.com` (Dr. Rohan Gupta)
- **Password**: `DrMadhumati123!` OR `DrRohan123!`

---

## 💸 Razorpay Gateway & Webhook Setup

1. **Dashboard Setup**:
   - Register a merchant account at [Razorpay](https://razorpay.com).
   - Switch to **Test Mode** on your dashboard.
   - Go to **Settings -> API Keys** and click **Generate Key**. Update `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `.env`.

2. **Webhook Setup**:
   - Navigate to **Settings -> Webhooks -> Add New Webhook**.
   - Set Webhook URL to: `https://yourdomain.com/api/webhooks/razorpay`
   - Set Secret: Define a string and assign it to `RAZORPAY_WEBHOOK_SECRET` in `.env`.
   - Active Events: Select `order.paid` and `payment.captured`.

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
