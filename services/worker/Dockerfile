FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml* ./
COPY libs/shared/package.json libs/shared/
RUN pnpm install --frozen-lockfile --filter @pulseping/shared

COPY services/worker/package.json services/worker/
WORKDIR /app/services/worker
RUN pnpm install --frozen-lockfile

WORKDIR /app
COPY services/worker/ .

CMD ["pnpm", "dev"]