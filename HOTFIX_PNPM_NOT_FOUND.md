# HOTFIX: Railway pnpm not found — Решение

## Проблема
```
/bin/bash: line 1: pnpm: command not found
```

Railway не может найти команду `pnpm` при запуске.

## Решение 1: nixpacks.toml (применено)

Создан файл `nixpacks.toml` с явной установкой pnpm через corepack.

**Что сделано:**
- ✅ Добавлен `nixpacks.toml` с конфигурацией для установки pnpm
- ✅ Используется `corepack enable` для активации pnpm из `packageManager` в `package.json`

**После деплоя:**
Railway должен автоматически использовать `nixpacks.toml` и установить pnpm.

## Решение 2: Переменные окружения (если nixpacks.toml не работает)

Если проблема сохраняется, добавь в Railway → Variables:

```
NIXPACKS_PKG_MANAGER=pnpm
NIXPACKS_PNPM_VERSION=9.15.9
```

## Решение 3: Использовать npm (крайний случай)

Если pnpm всё ещё не работает, можно временно использовать npm:

1. **Обновить Procfile:**
   ```
   web: npm start
   ```

2. **Обновить package.json scripts:**
   ```json
   {
     "start": "echo \"Starting migrations...\" && npm run prisma:migrate && echo \"Starting Next.js on PORT=${PORT:-3000}\" && next start -p ${PORT:-3000}",
     "prisma:migrate": "prisma migrate deploy"
   }
   ```

3. **Удалить nixpacks.toml** (чтобы Railway использовал стандартную конфигурацию)

**⚠️ Внимание:** При использовании npm нужно будет пересоздать `package-lock.json` из `pnpm-lock.yaml`:
```bash
pnpm import
npm install --package-lock-only
```

## Проверка после деплоя

1. **Build Logs** должны показать:
   ```
   Installing pnpm...
   corepack enable
   pnpm install --frozen-lockfile
   ```

2. **Runtime Logs** должны показать:
   ```
   Starting migrations...
   Starting Next.js on PORT=8080
   ```

3. **Health check:**
   ```
   curl https://echocare-production.up.railway.app/api/health
   ```

## Текущий статус

- ✅ `nixpacks.toml` создан и запушен
- ✅ `Procfile` использует `pnpm start`
- ✅ `package.json` содержит `packageManager: "pnpm@9.15.9"`

**Следующий шаг:** Сделать Redeploy в Railway и проверить логи.

