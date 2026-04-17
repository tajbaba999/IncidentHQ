FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml* ./
COPY libs/shared/package.json libs/shared/
RUN pnpm install --frozen-lockfile --filter @pulseping/shared

COPY services/api/package.json services/api/
WORKDIR /app/services/api
RUN pnpm install --frozen-lockfile

WORKDIR /app
COPY services/api/ .

EXPOSE 3000

CMD ["pnpm", "dev"]