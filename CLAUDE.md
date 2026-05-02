# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development

```bash
# Start the Next.js dashboard (root)
pnpm dev

# Start individual backend services
pnpm dev:api       # Fastify API on :3000
pnpm dev:worker    # SQS worker

# Start all infrastructure (Postgres, LocalStack, Loki, Grafana)
pnpm docker:up
pnpm docker:down
```

### Build

```bash
# Build all services (shared → api → worker)
pnpm build

# Build only the Next.js dashboard
pnpm build:web

# Build a single package
pnpm --filter @pulseping/shared build
pnpm --filter @pulseping/api build
pnpm --filter @pulseping/worker build
```

### Database

```bash
# Run migrations
pnpm prisma migrate dev

# Generate Prisma client (output: lib/generated/prisma/)
pnpm prisma generate

# Open Prisma Studio
pnpm prisma studio
```

### Docker / Observability

```bash
docker-compose logs -f api
docker-compose logs -f worker
# Grafana: http://localhost:3001  (admin/admin)
# Loki:    http://localhost:3100
```

## Architecture

PulsePing is a **uptime/health monitoring SaaS** — users create Projects containing Monitors (HTTP endpoints), and the system periodically pings them and fires Alerts when they go down.

### Monorepo layout

```
libs/shared/          @pulseping/shared — logger, SQS queue, config, Prisma client, utils
services/api/         Fastify REST API (:3000)
services/worker/      SQS consumer that processes health-check jobs
app/                  Next.js 15 dashboard (App Router) — auth via Clerk
prisma/               Single Prisma schema, migrations, generated client at lib/generated/prisma/
config/               Docker configs for Loki/Promtail/Grafana
terraform/            AWS infra IaC
```

### Data flow

1. **Dashboard → API**: HTTP REST calls (`/api/monitors`, `/api/projects`, `/api/alerts`)
2. **API → SQS**: Enqueues `HEALTH_CHECK` jobs via `@pulseping/shared/queue`
3. **Worker ← SQS**: Polls every 5 s, processes jobs, executes HTTP checks, writes `MonitorRun` records
4. **Logs**: Pino JSON → Promtail → Loki → Grafana

### Key domain models (Prisma)

- `User` — Clerk-backed, owns Projects and Alerts
- `Project` → `Monitor` → `MonitorRun` (cascade delete chain)
- `Alert` — created when a monitor fails; has `resolved` flag
- `Postmortem` — attached to a Monitor, has DRAFT/PUBLISHED status
- `Subscription` — per-user plan (FREE/PRO/TEAM/ENTERPRISE) with `monitorsLimit` and `intervalSeconds`

### Shared library exports (`@pulseping/shared`)

Import paths use sub-path exports:
```ts
import { logger } from '@pulseping/shared/logger';
import { config } from '@pulseping/shared/config';
import { SqsQueue, QUEUE_NAMES, getQueueUrl } from '@pulseping/shared/queue';
import { prisma } from '@pulseping/shared/db';
```

The shared lib **must be built before** the api or worker, which is why `pnpm build` runs them in order.

### Infrastructure dependencies

| Service    | Port | Purpose                          |
|------------|------|----------------------------------|
| API        | 3000 | Fastify REST                     |
| Dashboard  | 3001 | Next.js (also Grafana uses 3001) |
| PostgreSQL | 5432 | Primary database                 |
| LocalStack | 4566 | SQS mock (dev only)              |
| Loki       | 3100 | Log aggregation                  |
| Grafana    | 3001 | Log/metrics visualization        |

> Note: Dashboard and Grafana share port 3001 — run them separately, not together.

### Authentication

Clerk handles auth on the frontend. The API receives the Clerk user ID and resolves it to the internal `User.clerkId` field. `CLERK_SECRET_KEY` / `CLERK_PUBLISHABLE_KEY` are required.

### Environment setup

Copy `.env.example` to `.env`. For local dev, the SQS `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` can both be `test` (LocalStack). The `DATABASE_URL` must point to the running Postgres container.
