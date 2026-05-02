# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Local Development

### Prerequisites

- Node.js 20+
- pnpm 9+ (`npm install -g pnpm`)
- Docker & Docker Compose (for local Postgres / SQS / observability stack)

### 1 — Clone and install

```bash
git clone <repo-url>
cd PulsePing
pnpm install
```

### 2 — Environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in the required values:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Neon dashboard → Connection string (use pooled URL with `?sslmode=require`) |
| `CLERK_SECRET_KEY` | Clerk dashboard → API Keys |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard → API Keys |
| `RESEND_API_KEY` | Resend dashboard → API Keys |
| `SVIX_SECRET` | Clerk dashboard → Webhooks → Signing Secret |

Clerk redirect URLs to add in `.env.local`:

```env
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

### 3 — Database setup

The production and dev database is **Neon Postgres** (serverless). Make sure `DATABASE_URL` in `.env.local` points to your Neon connection string.

```bash
# Generate Prisma client
pnpm prisma generate

# Push schema to database (first time or after schema changes)
pnpm prisma migrate dev

# Optional: open Prisma Studio to browse data
pnpm prisma studio
```

### 4 — Run the dashboard

```bash
pnpm dev
```

Opens at **http://localhost:3000**.

### 5 — Run backend services (optional for full stack)

Start infrastructure (Postgres, LocalStack SQS, Loki, Grafana):

```bash
pnpm docker:up
```

Then start the API and worker in separate terminals:

```bash
pnpm dev:api      # Fastify REST API — http://localhost:3001
pnpm dev:worker   # SQS consumer
```

Stop infrastructure:

```bash
pnpm docker:down
```

Observability:
- **Grafana**: http://localhost:3001 (admin / admin)
- **Loki**: http://localhost:3100

---

## Deployment (Vercel)

The Next.js dashboard deploys to Vercel. The Fastify API and worker are separate services (deploy to Railway, Fly, or AWS ECS).

### Deploy the dashboard to Vercel

1. Push to GitHub.
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the repo.
3. Framework preset: **Next.js** (auto-detected).
4. Root directory: leave as `.` (the project root IS the Next.js app).
5. Add all environment variables from `.env.local` in the Vercel dashboard under **Settings → Environment Variables**:
   - `DATABASE_URL`
   - `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `RESEND_API_KEY`
   - `SVIX_SECRET`
   - All `NEXT_PUBLIC_CLERK_*` redirect variables
6. Click **Deploy**.

After deploy, add the production URL to:
- **Clerk dashboard** → Allowed redirect URLs
- **Clerk dashboard** → Webhooks → add endpoint `https://<your-domain>/api/webhooks/clerk`

### Build commands (Vercel auto-detects these from package.json)

```
Build command:   pnpm build:web   (or: next build)
Output dir:      .next
Install command: pnpm install
```

### Database on production

Use [Neon](https://neon.tech) — create a project, copy the **pooled connection string**, and set it as `DATABASE_URL` in Vercel env vars. Run migrations from local:

```bash
# Point DATABASE_URL at production Neon URL, then:
pnpm prisma migrate deploy
```

---

## Project Structure

```
app/                  Next.js 15 App Router (dashboard UI + API routes)
  api/                Route handlers (health-check cron, billing, integrations, webhooks)
  dashboard/          Protected dashboard pages
  login/ register/    Auth pages (Clerk)
components/           Shared React components (ui/, dashboard/, auth/)
lib/                  Utilities (Prisma client, email, health-check logic)
prisma/               Schema + migrations (generated client → lib/generated/prisma/)
libs/shared/          @pulseping/shared — logger, SQS queue, config (backend only)
services/api/         Fastify REST API (:3001)
services/worker/      SQS consumer — processes health-check jobs
config/               Docker configs for Loki/Promtail/Grafana
terraform/            AWS infra IaC
```

## Architecture

PulsePing is an **uptime/health monitoring SaaS** — users create Projects containing Monitors (HTTP endpoints), and the system periodically pings them and fires Alerts when they go down.

### Data flow

1. **Dashboard → API routes**: Next.js route handlers in `app/api/` hit the database directly via Prisma
2. **Cron jobs**: `app/api/cron/health-check/route.ts` triggers monitor checks on a schedule
3. **Worker ← SQS** (optional backend): polls every 5 s, processes jobs, writes `MonitorRun` records
4. **Email alerts**: Resend sends emails when monitors go down
5. **Logs**: Pino JSON → Promtail → Loki → Grafana

### Key domain models

- `User` — Clerk-backed, owns Projects and Alerts
- `Project` → `Monitor` → `MonitorRun` (cascade delete)
- `Alert` — created when a monitor fails; has `resolved` flag
- `Postmortem` — attached to a Monitor, has DRAFT/PUBLISHED status
- `Subscription` — per-user plan (FREE/PRO/TEAM/ENTERPRISE) with `monitorsLimit` and `intervalSeconds`

### Authentication

Clerk handles all auth. Frontend uses `@clerk/nextjs`. The `proxy.ts` file (Next.js 16 middleware) protects all `/dashboard` and `/api` routes except public paths.

### Shared library (`@pulseping/shared`)

Used only by the backend services (api, worker). Import via sub-path exports:

```ts
import { logger } from '@pulseping/shared/logger';
import { config } from '@pulseping/shared/config';
import { SqsQueue, QUEUE_NAMES } from '@pulseping/shared/queue';
import { prisma } from '@pulseping/shared/db';
```

The shared lib must be built before api or worker: `pnpm build` handles this order automatically.

---

## Common Commands

```bash
pnpm dev                          # Start Next.js dashboard (port 3000)
pnpm dev:api                      # Start Fastify API (port 3001)
pnpm dev:worker                   # Start SQS worker
pnpm build:web                    # Production build of dashboard
pnpm build                        # Build all services (shared → api → worker)
pnpm docker:up                    # Start Postgres + LocalStack + Loki + Grafana
pnpm docker:down                  # Stop all containers
pnpm prisma generate              # Regenerate Prisma client after schema changes
pnpm prisma migrate dev           # Run migrations in development
pnpm prisma migrate deploy        # Run migrations in production (CI/CD)
pnpm prisma studio                # Browse database in browser UI
```
