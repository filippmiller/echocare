# Проблема с деплоем Next.js приложения на Railway

**Дата:** 12 ноября 2025  
**Проект:** ClearMind App (EchoCare)  
**Репозиторий:** https://github.com/filippmiller/echocare  
**Production URL:** https://echocare-production.up.railway.app  
**Статус:** ❌ Приложение не отвечает (HTTP 404)

---

## Что случилось

После успешного merge PR #3 в `main` и деплоя на Railway приложение не отвечает на запросы. При попытке открыть https://echocare-production.up.railway.app получаем HTTP 404 ошибку.

### Симптомы

1. **HTTP 404** на всех URL (`/`, `/dashboard`, `/api/*`)
2. **В логах Railway** видны только логи от **Caddy** (прокси-сервера Railway), но **нет логов от Next.js приложения**
3. **Статус деплоя:** зеленый (Active) в Railway Dashboard
4. **Сборка проходит успешно** (build logs показывают успешную компиляцию)

---

## Хронология событий

### Этап 1: Разработка и локальное тестирование
- ✅ Реализован Profile MVP (API + UI)
- ✅ Реализован Journal MVP (текст + аудио)
- ✅ Интеграция с Supabase Storage
- ✅ Локально все работает (`pnpm dev` на порту 3005)

### Этап 2: Подготовка к деплою
- ✅ Создан PR #3 из `feat/profile-mvp` в `main`
- ✅ Исправлены проблемы с `pnpm-lock.yaml` (синхронизация с `package.json`)
- ✅ Исправлены TypeScript ошибки (zodResolver типы)
- ✅ Исправлена проблема с Supabase клиентом (ленивая инициализация)
- ✅ Исправлена проблема с Server Components (убраны функции из пропсов)
- ✅ Исправлена проблема с миграциями (удалены дубликаты, добавлен auto-resolve)

### Этап 3: Деплой на Railway
- ✅ PR смержен в `main`
- ✅ Railway автоматически начал деплой
- ✅ Сборка прошла успешно
- ❌ **Приложение не отвечает** (HTTP 404)

---

## Технические детали

### Конфигурация проекта

**Next.js версия:** 16.0.1  
**Node.js:** (Railway определяет автоматически)  
**Package Manager:** pnpm@9.15.9

**`package.json` scripts:**
```json
{
  "build": "prisma generate && next build",
  "start": "echo 'Starting migrations...' && (pnpm prisma migrate resolve --rolled-back 20251112010000_add_journal_models || echo 'Migration resolve skipped') && echo 'Running migrations...' && pnpm prisma migrate deploy && echo 'Starting Next.js server...' && next start -p ${PORT:-3000}"
}
```

**`next.config.ts`:**
```typescript
{
  reactCompiler: true,
  // output: "standalone", // Временно отключено для диагностики
  rewrites() {
    return [
      { source: "/auth/login", destination: "/login" },
      { source: "/auth/register", destination: "/register" },
    ];
  },
}
```

### Переменные окружения на Railway

✅ Установлены:
- `DATABASE_URL` (Supabase Postgres с `sslmode=require`)
- `NEXTAUTH_SECRET` (сгенерирован)
- `NEXTAUTH_URL` (`https://echocare-production.up.railway.app`)
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BUCKET` (`journal-audio`)
- `ALLOWED_AUDIO_MIME`
- `MAX_AUDIO_MB`

### Логи Railway (Runtime)

**Что видно:**
- Логи от **Caddy** (прокси-сервера Railway)
- Caddy слушает на порту `:8080`
- Caddy возвращает 404 для всех запросов
- **Нет логов от Next.js приложения** (нет сообщений "Starting migrations...", "Starting Next.js server...")

**Пример логов:**
```json
{"message":"server running","attributes":{"level":"info","logger":"http.log","name":"srv0","protocols":["h1","h2","h3"],"ts":1762907357.553125},"timestamp":"2025-11-12T00:29:18.816484788Z"}
{"message":"error handling handler error","attributes":{"error":"fileserver.(*FileServer).notFound (staticfiles.go:721): HTTP 404",...},"timestamp":"2025-11-12T00:29:38.231703815Z"}
```

---

## Анализ проблемы

### Гипотеза 1: Next.js сервер не запускается
**Вероятность:** Высокая

**Признаки:**
- Нет логов от start скрипта в runtime logs
- Caddy не может проксировать запросы к Next.js (возвращает 404)

**Возможные причины:**
1. Сервер падает при запуске из-за ошибок (но нет логов об ошибках)
2. Сервер запускается на неправильном порту
3. Railway не может найти команду запуска
4. Проблема с переменными окружения при старте

### Гипотеза 2: Проблема с PORT
**Вероятность:** Средняя

**Признаки:**
- Railway устанавливает PORT автоматически
- Next.js может не читать PORT правильно
- Caddy проксирует на порт 8080, но Next.js может слушать на другом

**Проверка:**
- Нужно проверить логи сборки (build logs), а не runtime logs
- Нужно проверить, что Next.js действительно запускается

### Гипотеза 3: Проблема с командой запуска
**Вероятность:** Средняя

**Признаки:**
- Railway может не использовать `pnpm start` из `package.json`
- Может быть установлена явная Start Command в Railway Settings

**Проверка:**
- Railway Dashboard → Settings → Deploy → Start Command
- Если пусто, Railway должен использовать `package.json` scripts

### Гипотеза 4: Проблема с миграциями
**Вероятность:** Низкая

**Признаки:**
- `prisma migrate deploy` может падать с ошибкой
- Но нет логов об ошибках миграций

**Проверка:**
- Нужно проверить логи сборки, где должны быть логи миграций

---

## Что было сделано для исправления

### Попытки исправления

1. **Исправлен `pnpm-lock.yaml`** — синхронизирован с `package.json`
2. **Исправлены TypeScript ошибки** — изменены типы в zodResolver
3. **Ленивая инициализация Supabase** — клиент создается только при использовании
4. **Убраны функции из Server Components** — исправлена ошибка "Event handlers cannot be passed to Client Component props"
5. **Исправлены миграции** — удалены дубликаты, добавлен auto-resolve
6. **Отключен standalone режим** — временно переключились на стандартный `next start`
7. **Добавлено логирование** — добавлены echo команды в start скрипт для отладки

### Текущее состояние

- ✅ Код коммитится и пушится в `main`
- ✅ Railway автоматически деплоит изменения
- ✅ Сборка проходит успешно
- ❌ Приложение не отвечает (HTTP 404)
- ❌ Нет логов от Next.js в runtime logs

---

## Что нужно проверить

### 1. Логи сборки (Build Logs)
**Где:** Railway Dashboard → Deployments → [Latest Deployment] → Build Logs

**Что искать:**
- Выполняется ли `pnpm run build`
- Успешно ли проходит `prisma generate`
- Успешно ли проходит `next build`
- Есть ли ошибки при сборке

### 2. Логи запуска (Runtime Logs)
**Где:** Railway Dashboard → Deployments → [Latest Deployment] → Runtime Logs

**Что искать:**
- Выполняется ли `pnpm start`
- Появляются ли сообщения "Starting migrations...", "Running migrations...", "Starting Next.js server..."
- Есть ли ошибки при запуске
- На каком порту запускается Next.js

### 3. Настройки Railway
**Где:** Railway Dashboard → Settings → Deploy

**Что проверить:**
- **Start Command:** Должен быть пустым (используется `package.json` scripts) ИЛИ явно указан `pnpm start`
- **Root Directory:** Должен быть пустым (корень репозитория) ИЛИ указан правильный путь
- **Build Command:** Должен быть пустым (используется `package.json` scripts) ИЛИ явно указан `pnpm run build`

### 4. Переменные окружения
**Где:** Railway Dashboard → Variables

**Что проверить:**
- Все переменные установлены (см. список выше)
- `PORT` не установлен явно (Railway устанавливает автоматически)
- `NEXTAUTH_URL` правильный (с `https://`)

### 5. Статус сервиса
**Где:** Railway Dashboard → [Service] → Overview

**Что проверить:**
- Статус: Active (зеленый)
- Последний деплой: успешный
- Health checks: проходят ли

---

## План действий для исправления

### Вариант 1: Проверить логи сборки и запуска
1. Открыть Railway Dashboard → Deployments → [Latest Deployment]
2. Проверить **Build Logs** — есть ли ошибки при сборке
3. Проверить **Runtime Logs** — есть ли логи от start скрипта
4. Если нет логов от start скрипта → проблема в запуске

### Вариант 2: Явно указать Start Command
1. Railway Dashboard → Settings → Deploy → Start Command
2. Установить: `pnpm start`
3. Или: `pnpm prisma migrate deploy && pnpm start`
4. Перезапустить деплой

### Вариант 3: Проверить порт
1. Добавить логирование порта в start скрипт
2. Проверить, что Next.js слушает на правильном порту
3. Убедиться, что Railway проксирует на правильный порт

### Вариант 4: Упростить start скрипт
1. Временно убрать миграции из start скрипта
2. Запустить только `next start`
3. Если заработает → проблема в миграциях
4. Если не заработает → проблема в Next.js запуске

### Вариант 5: Использовать Railway CLI для отладки
```bash
railway login
railway link
railway logs --tail 100
railway run pnpm start
```

---

## Вопросы для консультации

1. **Почему нет логов от Next.js в runtime logs?**
   - Может ли Railway скрывать логи от приложения?
   - Может ли сервер падать до того, как успевает вывести логи?

2. **Как Railway определяет команду запуска?**
   - Использует ли он `package.json` scripts автоматически?
   - Нужно ли явно указывать Start Command?

3. **Как правильно настроить PORT для Next.js на Railway?**
   - Нужно ли явно устанавливать PORT в переменных окружения?
   - Как Next.js читает PORT из переменных окружения?

4. **Может ли Caddy проксировать запросы, если Next.js не запущен?**
   - Почему Caddy возвращает 404 вместо ошибки подключения?

5. **Как проверить, что Next.js сервер действительно запущен?**
   - Есть ли способ проверить через Railway CLI?
   - Можно ли подключиться к контейнеру напрямую?

---

## Дополнительная информация

### Структура проекта
```
clear-mind-app/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── api/
│   │   ├── dashboard/
│   │   └── (auth)/
│   ├── components/
│   └── lib/
├── package.json
├── next.config.ts
└── server.js (не используется сейчас)
```

### Ключевые файлы
- `package.json` — скрипты сборки и запуска
- `next.config.ts` — конфигурация Next.js
- `src/lib/auth.ts` — NextAuth конфигурация
- `src/lib/supabaseServer.ts` — Supabase клиент (ленивая инициализация)
- `src/app/dashboard/page.tsx` — главная страница после логина

### Последние коммиты
- `82b3b0b` - fix: add explicit logging to start script for debugging
- `3cc7839` - fix: temporarily disable standalone mode and use standard next start for Railway
- `d3ed09c` - fix: remove onSuccess props from Client Components to fix Server Component error
- `1d72ab1` - fix: add detailed logging to NextAuth and require NEXTAUTH_SECRET
- `2a55e62` - fix: ignore errors when resolving already-resolved migration

---

## Резюме

**Проблема:** Next.js приложение не запускается на Railway, хотя сборка проходит успешно.

**Симптомы:** HTTP 404 на всех URL, нет логов от Next.js в runtime logs.

**Гипотеза:** Сервер не запускается из-за проблем с командой запуска, портом или переменными окружения.

**Следующие шаги:** Проверить логи сборки и запуска, явно указать Start Command в Railway, упростить start скрипт для диагностики.

---

**Дата создания:** 12 ноября 2025  
**Автор:** AI Assistant (Composer)  
**Для консультации с:** [Имя специалиста]

