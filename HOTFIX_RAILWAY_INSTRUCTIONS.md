# HOTFIX: Railway 404 — Инструкция по применению

## ✅ Что сделано в коде

1. ✅ Создан `Procfile` с командой `web: pnpm start`
2. ✅ Обновлен `package.json`:
   - Добавлен `engines: { "node": ">=20 <23" }`
   - Упрощен `start` скрипт (убрана логика resolve миграций)
3. ✅ Включен `output: "standalone"` в `next.config.ts`
4. ✅ Создан `/api/health` endpoint для проверки живости
5. ✅ Ветка `fix/railway-start` создана и запушена

## 📋 Следующие шаги в Railway Dashboard

### 1. Проверь тип сервиса
**Railway Dashboard → [Service] → Settings → General**
- Убедись, что тип сервиса: **Web Service** (не Static)

### 2. Установи Start Command
**Railway Dashboard → [Service] → Settings → Deploy**
- **Start Command:** `pnpm start`
- **Build Command:** оставить пустым (используется `package.json` scripts)
- **Root Directory:** оставить пустым (корень репо)

### 3. Проверь переменные окружения
**Railway Dashboard → [Service] → Variables**

Убедись, что установлены:
- `DATABASE_URL` (с `?sslmode=require`)
- `NEXTAUTH_URL=https://echocare-production.up.railway.app`
- `NEXTAUTH_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BUCKET=journal-audio`
- `ALLOWED_AUDIO_MIME=audio/webm,audio/ogg,audio/m4a,audio/mp3`
- `MAX_AUDIO_MB=20`

**⚠️ НЕ устанавливай PORT вручную** — Railway выставляет его автоматически.

### 4. Подключи ветку для деплоя
**Railway Dashboard → [Service] → Settings → Source**
- Выбери ветку: `fix/railway-start`
- Или сделай Redeploy после merge в `main`

### 5. Запусти Redeploy
**Railway Dashboard → [Service] → Deployments → [Latest] → Redeploy**

## 🔍 Проверка после деплоя

### 1. Runtime Logs
**Railway Dashboard → [Service] → Deployments → [Latest] → Runtime Logs**

Должны появиться логи:
```
Starting migrations...
Starting Next.js on PORT=8080
```

### 2. Health Check
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

### 3. Основные страницы
- `https://echocare-production.up.railway.app/` — главная
- `https://echocare-production.up.railway.app/dashboard` — дашборд (после логина)
- `https://echocare-production.up.railway.app/api/profile` — API профиля

## 🚨 Если всё ещё 404

### Проверь ещё раз:
1. ✅ Service type = **Web Service** (не Static)
2. ✅ Start Command = `pnpm start`
3. ✅ Procfile существует в корне репо
4. ✅ Новый деплой действительно подтянулся (проверь время деплоя)

### Альтернатива (если UI недоступен)
Добавь в Variables:
- `NIXPACKS_START_CMD=pnpm start`
- `NIXPACKS_BUILD_CMD=pnpm run build`

## 📝 Чек-лист успешного деплоя

- [ ] В Runtime Logs видны echo-сообщения от start скрипта
- [ ] `/api/health` отдаёт `{ ok: true }`
- [ ] Главная страница открывается без 404
- [ ] Caddy-логи больше не доминируют; видны логи Next.js
- [ ] Приложение отвечает на запросы

---

**Ветка:** `fix/railway-start`  
**Коммит:** `0bdf2d2`  
**Дата:** 12 ноября 2025

