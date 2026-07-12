---
name: verify
description: Build, launch, and drive the PulsePing/IncidentHQ Next.js app locally without real credentials — placeholder Clerk keys + Docker Postgres are enough for public routes, cron sweep, scheduler, and status pages.
---

# Verifying PulsePing locally (no .env.local needed)

This machine has no `.env.local`. Public surfaces (status pages, `/api/cron/*`,
`/api/health/*`) work with placeholder Clerk keys because middleware only calls
`auth.protect()` on non-public routes (see `proxy.ts`).

## Database

No native Postgres. Use the dev compose service (creds must be passed inline —
there is no `.env`):

```bash
open -a Docker   # if daemon down; up in ~5s
POSTGRES_USER=pulseping POSTGRES_PASSWORD=pulseping POSTGRES_DB=pulseping \
  docker compose up -d postgres          # host port 5432
```

`pnpm prisma migrate deploy` works on fresh DBs since the
`20260709000000_repair_schema_drift` migration (idempotent — also safe on
existing DBs). Note `--skip-generate` no longer exists in Prisma 7, and
`migrate diff` now uses `--from-config-datasource --to-schema`.

Inspect/seed with `docker exec incidenthq-postgres-1 psql -U pulseping -c '...'`.
Minimum seed chain: `"User"` → `"Project"` → `"Monitor"` (only id/FKs/name/url/
frequency/`"updatedAt"` required; quote camelCase columns).

## Build + run

```bash
ENV='NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk
     CLERK_SECRET_KEY=sk_test_placeholder_secret_key
     DATABASE_URL=postgresql://pulseping:pulseping@localhost:5432/pulseping
     RESEND_API_KEY=re_placeholder NEXT_PUBLIC_APP_URL=http://localhost:3000'
env $ENV DEPLOY_MODE=selfhost CRON_SECRET=x pnpm build:web
env $ENV DEPLOY_MODE=selfhost CRON_SECRET=x pnpm next start -p 3000
```

Gotchas:
- The in-process scheduler starts via `app/layout.tsx` → `lib/init.ts`, so it
  only starts after the FIRST PAGE request (`curl localhost:3000/status`), not
  on boot. API-route hits alone never start it.
- Observe scheduler state at `GET /api/health/scheduler-status`.
- Cron sweep: `GET /api/cron/health-check` with `Authorization: Bearer $CRON_SECRET`
  → `{totalActive, checked, failed}`; 401 wrong/missing header, 503 if env unset.
- `DEPLOY_MODE=saas` + non-Neon URL still uses the pg driver (driver picks Neon
  only when URL contains `neon.tech`), so a saas-mode instance runs fine on
  local Postgres. Scheduler stays off in saas production — expected.
- Two `next start` instances on different ports share one `.next` build but read
  their own env — handy for comparing modes side by side.
- Killing a backgrounded `pnpm next start` kills only the wrapper; the
  `next-server` child survives and squats the port. Check
  `lsof -nP -iTCP:3000 -sTCP:LISTEN` and kill the node PID.

## Self-host Docker stack

```bash
cp .env.selfhost.example .env.selfhost   # placeholder Clerk keys fine for public routes
docker compose -f docker-compose.selfhost.yml --env-file .env.selfhost up -d --build
docker compose -f docker-compose.selfhost.yml --env-file .env.selfhost logs app
```

Boot proof points: "All migrations have been successfully applied" →
"🚀 Starting Monitor Scheduler..." (instrumentation.ts starts it at boot;
a second "⏰ Scheduler already running" line is the layout import hitting the
globalThis guard — expected). Seed via
`... exec -T postgres psql -U pulseping -d pulseping -c '...'`; the scheduler
picks up new monitors within ~60s. Tear down with `down -v` to reset the DB.
Gotchas: both compose files share the `incidenthq` project name, so they reuse
the container name `incidenthq-postgres-1`; pass `--env-file .env.selfhost` to
EVERY compose command or you get blank-variable warnings; Docker build cache
grows fast (~20GB caused disk-full daemon crashes once) — `docker builder
prune -af` if the daemon gets flaky.
