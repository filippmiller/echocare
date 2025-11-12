# HOTFIX: Railway Docker — Инструкция по применению

## ✅ Что сделано в коде

1. ✅ Создан `Dockerfile` с multi-stage build:
   - **deps stage:** Устанавливает зависимости через pnpm/npm/yarn
   - **builder stage:** Генерирует Prisma Client и собирает Next.js
   - **runner stage:** Запускает миграции и стартует Next.js

2. ✅ Создан `.dockerignore` для исключения ненужных файлов

3. ✅ Удалён `nixpacks.toml` (больше не нужен, Dockerfile всё контролирует)

4. ✅ Ветка `fix/railway-docker` создана и запушена

## 📋 КРИТИЧЕСКИ ВАЖНО: Root Directory

**Railway Dashboard → [Service] → Settings → Deploy → Root Directory**

### Проверь Root Directory!

Если `package.json` и `Dockerfile` находятся в подпапке (например, `clear-mind-app`), укажи путь:
```
clear-mind-app
```

Если они в корне репозитория, оставь пустым.

**⚠️ Неправильный Root Directory — самая частая причина проблем!**

## 📋 Настройки Railway Dashboard

### 1. Root Directory

**Railway Dashboard → [Service] → Settings → Deploy**

- **Root Directory:** 
  - Если `package.json` в корне репо → оставь пустым
  - Если `package.json` в подпапке → укажи путь (например, `clear-mind-app`)

### 2. Start Command

**Railway Dashboard → [Service] → Settings → Deploy**

- **Start Command:** **ОЧИСТИТЬ (оставить пустым)**
  - Dockerfile сам задаёт команду запуска через `CMD`

### 3. Build Command

**Railway Dashboard → [Service] → Settings → Deploy**

- **Build Command:** **ОЧИСТИТЬ (оставить пустым)**
  - Dockerfile сам выполняет сборку

### 4. Service Type

**Railway Dashboard → [Service] → Settings → General**

- **Service Type:** **Web Service** (не Static)

### 5. Подключи ветку

**Railway Dashboard → [Service] → Settings → Source**

- Выбери ветку: `fix/railway-docker`
- Или сделай Redeploy после merge в `main`

### 6. Запусти Redeploy

**Railway Dashboard → [Service] → Deployments → [Latest] → Redeploy**

## 🔍 Проверка после деплоя

### 1. Build Logs

**Railway Dashboard → [Service] → Deployments → [Latest] → Build Logs**

Должны появиться логи:
```
Step 1/10 : FROM node:20-alpine AS deps
Step 2/10 : WORKDIR /app
Step 3/10 : COPY package.json pnpm-lock.yaml* ...
Step 4/10 : RUN corepack enable ...
Step 5/10 : RUN if [ -f pnpm-lock.yaml ]; then pnpm install ...
Step 6/10 : FROM node:20-alpine AS builder
Step 7/10 : RUN npx prisma generate
Step 8/10 : RUN npm run build
Step 9/10 : FROM node:20-alpine AS runner
Step 10/10 : CMD sh -lc "npx prisma migrate deploy && npx next start -p ${PORT}"
```

### 2. Runtime Logs

**Railway Dashboard → [Service] → Deployments → [Latest] → Runtime Logs**

Должны появиться логи:
```
Running migrations...
prisma migrate deploy
Starting Next.js on PORT=8080
next start -p 8080
```

### 3. Health Check

Открой в браузере:
```
https://echocare-production.up.railway.app/api/health
```

Ожидаемый ответ:
```json
{
  "ok": true,
  "ts": "2025-11-12T...",
  "port": "8080"
}
```

### 4. Основные страницы

- `https://echocare-production.up.railway.app/` — главная
- `https://echocare-production.up.railway.app/dashboard` — дашборд (после логина)
- `https://echocare-production.up.railway.app/api/profile` — API профиля

## 🚨 План Б (если всё ещё не работает)

### 1. Проверь Root Directory ещё раз

**Самая частая причина проблем!**

Убедись, что Railway билдит именно папку с `Dockerfile` и `package.json`:
- Если проект в корне репо → Root Directory пусто
- Если проект в подпапке → Root Directory = путь к подпапке

### 2. Ручной прогон миграций

Если миграции мешают запуску, выполни их отдельно:

```bash
railway run npx prisma migrate deploy
```

### 3. Локальная проверка

Проверь, что Dockerfile работает локально:

```bash
# Собери образ
docker build -t clear-mind-app .

# Запусти контейнер
docker run -p 3000:3000 -e PORT=3000 -e DATABASE_URL="..." clear-mind-app
```

### 4. Проверь переменные окружения

**Railway Dashboard → [Service] → Variables**

Убедись, что установлены:
- `DATABASE_URL` (Supabase Postgres с `?sslmode=require`)
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BUCKET`, `ALLOWED_AUDIO_MIME`, `MAX_AUDIO_MB`

**⚠️ PORT не устанавливай явно** — Railway устанавливает автоматически, Dockerfile его читает.

## 📝 Чек-лист успешного деплоя

- [ ] Root Directory указан правильно (пусто или путь к папке с Dockerfile)
- [ ] Start Command очищен (пусто)
- [ ] Build Command очищен (пусто)
- [ ] Service Type = Web Service
- [ ] В Build Logs видны этапы Docker build
- [ ] В Runtime Logs видны логи миграций и Next.js старта
- [ ] `/api/health` отдаёт `{ ok: true }`
- [ ] Главная страница открывается без 404
- [ ] Приложение отвечает на запросы

## 💡 Как работает Dockerfile

**Stage 1: deps**
- Устанавливает Node.js 20 Alpine
- Активирует corepack для pnpm
- Устанавливает зависимости через pnpm (если есть `pnpm-lock.yaml`)

**Stage 2: builder**
- Копирует зависимости из deps stage
- Копирует исходный код
- Генерирует Prisma Client (`npx prisma generate`)
- Собирает Next.js (`npm run build`)

**Stage 3: runner**
- Создаёт минимальный runtime образ
- Копирует собранное приложение
- Запускает миграции (`npx prisma migrate deploy`)
- Запускает Next.js (`npx next start -p ${PORT}`)

**Преимущества:**
- ✅ Детерминированная среда (Node 20 Alpine всегда одинаковый)
- ✅ npm/npx всегда доступны в runtime
- ✅ Не зависит от Railway/Nixpacks конфигурации
- ✅ Multi-stage build уменьшает размер финального образа

---

**Ветка:** `fix/railway-docker`  
**Коммит:** `9873970`  
**Дата:** 12 ноября 2025


