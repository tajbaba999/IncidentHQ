FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml* ./
COPY pnpm-workspace.yaml ./
COPY libs libs/
COPY services services/

RUN pnpm install

CMD ["pnpm", "dev"]