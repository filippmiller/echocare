# Проблема с деплоем Next.js на Railway — Описание для консультации

**Дата:** 12 ноября 2025  
**Проект:** ClearMind App (EchoCare)  
**Репозиторий:** https://github.com/filippmiller/echocare  
**Production URL:** https://echocare-production.up.railway.app  
**Ветка:** `fix/railway-start`

---

## Суть проблемы

Next.js приложение не запускается на Railway. После успешной сборки при попытке запуска получаем ошибку:

```
/bin/bash: line 1: pnpm: command not found
```

Railway не может найти команду `pnpm` при выполнении `pnpm start` из Procfile.

---

## Технический контекст

### Стек проекта
- **Next.js:** 16.0.1
- **Node.js:** >=20 <23 (указано в `engines`)
- **Package Manager:** pnpm@9.15.9 (указано в `packageManager`)
- **База данных:** Supabase PostgreSQL
- **Деплой:** Railway (использует Nixpacks для сборки)

### Структура проекта
```
clear-mind-app/
├── Procfile              # web: pnpm start
├── nixpacks.toml         # конфигурация для Railway
├── package.json          # packageManager: "pnpm@9.15.9"
├── pnpm-lock.yaml        # lockfile для pnpm
├── next.config.ts        # output: "standalone"
└── src/
    └── app/
        └── api/
            └── health/route.ts  # health check endpoint
```

### Конфигурационные файлы

**Procfile:**
```
web: pnpm start
```

**package.json (start script):**
```json
{
  "packageManager": "pnpm@9.15.9",
  "engines": {
    "node": ">=20 <23"
  },
  "scripts": {
    "start": "echo \"Starting migrations...\" && pnpm prisma migrate deploy && echo \"Starting Next.js on PORT=${PORT:-3000}\" && next start -p ${PORT:-3000}"
  }
}
```

**nixpacks.toml:**
```toml
[phases.setup]
nixPkgs = ["nodejs_20", "pnpm"]

[phases.install]
cmds = ["corepack enable", "pnpm install --frozen-lockfile"]

[phases.build]
cmds = ["pnpm run build"]

[start]
cmd = "pnpm start"
```

---

## Хронология событий

### Этап 1: Первоначальная проблема (404)
- ✅ Сборка проходит успешно
- ❌ Приложение не отвечает (HTTP 404)
- ❌ В runtime logs только логи от Caddy, нет логов от Next.js

**Гипотеза:** Railway запускал Static сервис вместо Web Service, или не видел Start Command.

**Решение:** Создан Procfile, включен standalone режим, добавлен /api/health endpoint.

### Этап 2: Текущая проблема (pnpm not found)
После применения Procfile и настройки Railway:
- ✅ Сборка проходит успешно
- ✅ Railway видит Start Command (`pnpm start`)
- ❌ **Ошибка при запуске:** `pnpm: command not found`

**Гипотеза:** Railway не устанавливает pnpm автоматически, несмотря на `packageManager` в `package.json`.

**Решение:** Создан `nixpacks.toml` с явной установкой pnpm через Nix и corepack.

---

## Что было сделано для исправления

### Попытка 1: Procfile + standalone
- ✅ Создан `Procfile` с `web: pnpm start`
- ✅ Включен `output: "standalone"` в `next.config.ts`
- ✅ Добавлен `/api/health` endpoint
- ✅ Упрощен `start` скрипт в `package.json`
- ✅ Добавлен `engines: { "node": ">=20 <23" }`

**Результат:** Railway увидел Start Command, но не нашел pnpm.

### Попытка 2: nixpacks.toml
- ✅ Создан `nixpacks.toml` с явной установкой pnpm
- ✅ Использован `corepack enable` для активации pnpm из `packageManager`
- ✅ Указаны явные команды для install, build и start

**Результат:** Ожидается после следующего деплоя.

---

## Текущий статус

### Что работает:
- ✅ Локальная разработка (`pnpm dev` на порту 3005)
- ✅ Сборка на Railway проходит успешно
- ✅ Railway видит конфигурацию (Procfile, nixpacks.toml)

### Что не работает:
- ❌ Railway не может выполнить `pnpm start` — команда `pnpm` не найдена
- ❌ Приложение не запускается
- ❌ Health check недоступен (приложение не запущено)

### Логи Railway:

**Build Logs:**
```
✓ Compiled successfully
✓ Generating static pages
✓ Build completed
```

**Runtime Logs:**
```
{"message":"Starting Container","attributes":{"level":"info"},"timestamp":"2025-11-12T01:00:31.000000000Z"}
{"message":"/bin/bash: line 1: pnpm: command not found","attributes":{"level":"error"},"timestamp":"2025-11-12T01:00:33.987933369Z"}
{"message":"/bin/bash: line 1: pnpm: command not found","attributes":{"level":"error"},"timestamp":"2025-11-12T01:00:40.250883768Z"}
```

---

## Вопросы для консультации

### 1. Почему Railway не устанавливает pnpm автоматически?

**Контекст:**
- В `package.json` указано `"packageManager": "pnpm@9.15.9"`
- Railway должен автоматически определять и устанавливать pnpm через corepack
- Но в runtime окружении команда `pnpm` недоступна

**Вопросы:**
- Должен ли Railway автоматически устанавливать pnpm из `packageManager`?
- Нужно ли явно указывать установку pnpm в `nixpacks.toml`?
- Правильно ли настроен `nixpacks.toml`?

### 2. Правильна ли конфигурация nixpacks.toml?

**Текущая конфигурация:**
```toml
[phases.setup]
nixPkgs = ["nodejs_20", "pnpm"]

[phases.install]
cmds = ["corepack enable", "pnpm install --frozen-lockfile"]

[phases.build]
cmds = ["pnpm run build"]

[start]
cmd = "pnpm start"
```

**Вопросы:**
- Правильно ли указаны фазы (`phases.setup`, `phases.install`, `phases.build`)?
- Нужно ли устанавливать pnpm через `nixPkgs` или достаточно `corepack enable`?
- Должен ли `[start]` быть в `nixpacks.toml` или Railway использует Procfile?

### 3. Альтернативные решения

**Вариант A: Использовать npm вместо pnpm**
- Преимущества: npm точно установлен в Railway
- Недостатки: нужно пересоздать `package-lock.json` из `pnpm-lock.yaml`

**Вариант B: Установить pnpm через переменные окружения**
- Добавить в Railway Variables:
  ```
  NIXPACKS_PKG_MANAGER=pnpm
  NIXPACKS_PNPM_VERSION=9.15.9
  ```

**Вариант C: Использовать Dockerfile**
- Создать явный Dockerfile с установкой pnpm
- Railway будет использовать Dockerfile вместо Nixpacks

**Вопросы:**
- Какой вариант предпочтительнее?
- Есть ли другие способы решения проблемы?

### 4. Диагностика проблемы

**Что проверить:**
- Build Logs — устанавливается ли pnpm во время сборки?
- Runtime Logs — доступна ли команда `pnpm` в runtime окружении?
- Переменные окружения — правильно ли настроены?

**Вопросы:**
- Как проверить, что pnpm установлен в контейнере?
- Можно ли подключиться к контейнеру Railway для диагностики?
- Есть ли способ увидеть полный PATH в runtime окружении?

---

## Ожидаемое поведение

После успешного деплоя:

1. **Build Logs должны показать:**
   ```
   Installing pnpm...
   corepack enable
   pnpm install --frozen-lockfile
   pnpm run build
   ```

2. **Runtime Logs должны показать:**
   ```
   Starting migrations...
   Starting Next.js on PORT=8080
   ```

3. **Health check должен работать:**
   ```bash
   curl https://echocare-production.up.railway.app/api/health
   # Ожидаемый ответ: {"ok":true,"ts":"...","port":"8080"}
   ```

---

## Дополнительная информация

### Railway Settings
- **Service Type:** Web Service (не Static)
- **Start Command:** `pnpm start` (явно указан в Settings → Deploy)
- **Build Command:** пусто (используется из `package.json`)
- **Root Directory:** пусто (корень репо)

### Переменные окружения
Все необходимые переменные установлены:
- `DATABASE_URL` (Supabase Postgres)
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BUCKET`, `ALLOWED_AUDIO_MIME`, `MAX_AUDIO_MB`

**⚠️ PORT не установлен явно** — Railway устанавливает автоматически.

### Последние коммиты
- `3dcde38` - docs: add pnpm not found troubleshooting guide
- `5b10363` - fix: add nixpacks.toml to explicitly install pnpm for Railway
- `0bdf2d2` - fix: enforce web start via Procfile + standalone + /api/health

---

## Резюме

**Проблема:** Railway не может найти команду `pnpm` при запуске приложения, несмотря на наличие `packageManager` в `package.json` и созданный `nixpacks.toml`.

**Симптомы:** Ошибка `pnpm: command not found` в runtime logs после успешной сборки.

**Гипотеза:** Railway не устанавливает pnpm автоматически в runtime окружении, или `nixpacks.toml` не применяется корректно.

**Следующие шаги:** 
1. Проверить, применяется ли `nixpacks.toml` (посмотреть Build Logs)
2. Попробовать альтернативные решения (npm, переменные окружения, Dockerfile)
3. Обратиться в поддержку Railway, если проблема сохраняется

---

**Дата создания:** 12 ноября 2025  
**Для консультации с:** [Имя специалиста]

