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
```

Generate `ENCRYPTION_KEY` locally:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use a managed PostgreSQL database. `DIRECT_URL` can match `DATABASE_URL` when your provider gives only one connection string.

## 2. Push Schema And Seed

Run once against live database:

```bash
npm ci --legacy-peer-deps
npx prisma db push
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
