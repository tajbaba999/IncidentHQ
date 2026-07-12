# Self-Hosting PulsePing

Run the whole product — dashboard, monitor scheduler, and public status pages —
on your own server with Docker. Health checks run on an in-process scheduler
inside the app container; no Vercel, Neon, or queue infrastructure needed.

## Prerequisites

- Docker with the Compose plugin (Docker Desktop, or `docker-ce` + `docker-compose-plugin` on a server)
- A free [Clerk](https://clerk.com) account for authentication (~5 minutes to set up)
- Optional: a [Resend](https://resend.com) API key if you want email alerts and
  status-page subscriber notifications

## 1. Get Clerk keys

Self-hosted PulsePing brings your own Clerk instance (the free tier is plenty):

1. Sign up at [clerk.com](https://clerk.com) and create an application.
2. Under **Configure → API Keys**, copy the **Publishable key** (`pk_...`) and
   **Secret key** (`sk_...`).
3. Under **Configure → Paths**, set sign-in to `/login` and sign-up to `/register`.
4. If you host on a real domain later, add it under **Configure → Domains**.

## 2. Configure

```bash
git clone <repo-url>
cd PulsePing
cp .env.selfhost.example .env.selfhost
```

Edit `.env.selfhost`:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` — from step 1 (required)
- `NEXT_PUBLIC_APP_URL` — the address users will reach the instance on
- `POSTGRES_PASSWORD` — pick your own; keep `DATABASE_URL` in sync
- `RESEND_API_KEY` — optional, enables email notifications

## 3. Launch

```bash
docker compose -f docker-compose.selfhost.yml --env-file .env.selfhost up -d --build
```

The first build takes a few minutes. On boot the app container applies database
migrations automatically, then starts the server and the monitor scheduler.

Open **http://localhost:3000** (or your `NEXT_PUBLIC_APP_URL`), register, and
create your first project and monitor. Published status pages are served at
`/status/<slug>`.

Check status and logs:

```bash
docker compose -f docker-compose.selfhost.yml ps
docker compose -f docker-compose.selfhost.yml logs -f app
```

## Upgrading

```bash
git pull
docker compose -f docker-compose.selfhost.yml --env-file .env.selfhost up -d --build
```

Migrations run automatically on container start, so a pull + rebuild is the
whole upgrade path.

> **Note:** the `NEXT_PUBLIC_*` values are baked into the build. If you change
> them in `.env.selfhost`, rebuild with `--build` for the change to take effect.

## Backups

All data lives in the `pulseping_pgdata` Docker volume. Back it up with:

```bash
docker compose -f docker-compose.selfhost.yml exec postgres \
  pg_dump -U pulseping pulseping > pulseping-backup-$(date +%F).sql
```

Restore into a fresh stack with `psql -U pulseping pulseping < backup.sql`.

## Troubleshooting

- **App exits immediately** — check `logs app`; the usual cause is a migration
  failure from a wrong `DATABASE_URL`/`POSTGRES_PASSWORD` pair.
- **Login redirects fail** — make sure your domain is registered in Clerk and
  the paths from step 1.3 are set.
- **No health checks recorded** — the scheduler logs
  `🚀 Starting Monitor Scheduler...` on boot; if it's missing, confirm
  `DEPLOY_MODE=selfhost` is set (the compose file sets it for you).
