# syntax=docker/dockerfile:1
# Self-host image for PulsePing (see SELF_HOSTING.md).
# Build args marked NEXT_PUBLIC_* are baked into the client bundle at build
# time — pass your real values when building (docker-compose.selfhost.yml
# wires them from .env.selfhost). Server-side secrets are runtime env only.

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
# pinned to the version the lockfile was written with
RUN npm install -g pnpm@10.18.3
# non-interactive pnpm (it aborts on confirmation prompts without a TTY)
ENV CI=true
WORKDIR /app

# Download every package in the lockfile into the pnpm store. This layer only
# invalidates when the lockfile changes, not on source edits.
FROM base AS deps
COPY pnpm-lock.yaml ./
RUN pnpm fetch

FROM deps AS builder
COPY . .
# hoisted linker = flat node_modules without symlinks, so the runner stage can
# copy the prisma toolchain subtrees directly (image-only; the repo .npmrc is
# left alone so local installs keep their layout)
RUN echo "node-linker=hoisted" >> .npmrc && pnpm install --frozen-lockfile --offline

ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
ARG NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
ARG NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY} \
    NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} \
    NEXT_PUBLIC_CLERK_SIGN_IN_URL=${NEXT_PUBLIC_CLERK_SIGN_IN_URL} \
    NEXT_PUBLIC_CLERK_SIGN_UP_URL=${NEXT_PUBLIC_CLERK_SIGN_UP_URL} \
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=${NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL} \
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=${NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL} \
    # Build-time placeholders so `next build` can prerender; real values come
    # from the container environment at runtime.
    DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder \
    CLERK_SECRET_KEY=sk_test_placeholder_build_only \
    DEPLOY_MODE=selfhost

RUN pnpm prisma generate
RUN pnpm next build

# Standalone install of the migration toolchain. The prisma CLI has its own
# transitive dependency tree (valibot, @prisma/dev, ...) — an npm install here
# resolves all of it, instead of hand-copying subtrees from the builder.
FROM base AS migrator
WORKDIR /migrate
RUN npm install prisma@7.1.0 dotenv@17.4.2

FROM base AS runner
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# ISR (`revalidate` on the public status pages) writes to .next/cache
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma migration toolchain — the entrypoint runs `migrate deploy` on boot.
# Merged over the standalone bundle's node_modules (no overlapping packages).
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=migrator /migrate/node_modules ./node_modules

COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
