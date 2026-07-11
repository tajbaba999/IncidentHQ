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

⚠️ `pnpm prisma migrate deploy` FAILS on a fresh DB — migration history never
creates the `Severity` enum (schema drift from an old `db push`). Until fixed,
use `pnpm prisma db push --accept-data-loss` instead (`--skip-generate` no
longer exists in Prisma 7).

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
