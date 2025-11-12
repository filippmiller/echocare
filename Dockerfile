# syntax=docker/dockerfile:1
# Test micropush to Railway - 2025-11-12

# ---------- deps ----------
FROM node:20-alpine AS deps
WORKDIR /app

# Поддержим любой менеджер пакетов; pnpm предпочтителен
COPY package.json pnpm-lock.yaml* package-lock.json* yarn.lock* ./

RUN corepack enable \
 && corepack prepare pnpm@9.15.9 --activate || true

RUN if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    else npm install; fi

# ---------- build ----------
FROM node:20-alpine AS builder
WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma client + Next build
# Stub для DATABASE_URL только на build-этапе,
# чтобы prisma generate не падал (БД подключать не нужно).
ARG DATABASE_URL="postgresql://stub:stub@localhost:5432/stub?schema=public"
ENV DATABASE_URL=${DATABASE_URL}
# Отключаем проверку env для generate (подстраховка)
ENV PRISMA_GENERATE_SKIP_ENV_CHECK=1
# Stub для NEXTAUTH_SECRET на build-этапе (Next.js выполняет server-side код при сборке)
ARG NEXTAUTH_SECRET="build-stub-secret-do-not-use-in-production"
ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
ARG NEXTAUTH_URL="http://localhost:3000"
ENV NEXTAUTH_URL=${NEXTAUTH_URL}
RUN npx prisma generate
RUN npm run build || pnpm run build || yarn build

# ---------- runtime ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Railway отдаст $PORT, слушаем его
ENV PORT=3000

# Копируем собранное приложение и node_modules
COPY --from=builder /app ./

EXPOSE 3000

# Миграции в рантайме + старт Next.js
CMD sh -lc "npx prisma migrate deploy && npx next start -p ${PORT}"

