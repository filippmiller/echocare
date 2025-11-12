# Railway Deploy Error Analysis Checklist

## ✅ Что должно работать

### Build Stage (Dockerfile)
1. ✅ **Prisma Generate** - должен пройти с stub DATABASE_URL
   - Ожидаемый лог: `Generating Prisma Client...`
   - Не должно быть ошибок подключения к БД

2. ✅ **Next.js Build** - должен собраться успешно
   - Ожидаемый лог: `Creating an optimized production build...`
   - Не должно быть ошибок компиляции

### Runtime Stage
1. ✅ **Prisma Migrate Deploy** - должен использовать реальный DATABASE_URL
   - Ожидаемый лог: `Running migrations...`
   - Должен подключиться к Supabase PostgreSQL

2. ✅ **Next.js Start** - должен запуститься на порту из Railway
   - Ожидаемый лог: `Ready on http://0.0.0.0:${PORT}`

## 🔍 Возможные ошибки и решения

### Error 1: Prisma Generate Failed
**Симптом:** `Error: Can't reach database server` или `P1001`
**Причина:** Prisma пытается подключиться к stub URL
**Решение:** Проверить что `PRISMA_GENERATE_SKIP_ENV_CHECK=1` установлен

### Error 2: Build Failed - Missing Environment Variables
**Симптом:** `Error: supabaseUrl is required` или `Missing Supabase configuration`
**Причина:** Next.js пытается инициализировать Supabase на build этапе
**Решение:** Проверить что `src/lib/supabaseServer.ts` использует lazy initialization

### Error 3: Migrate Deploy Failed
**Симптом:** `P3009 migrate found failed migrations` или `P1001 Can't reach database server`
**Причина:** 
- Неправильный DATABASE_URL в Railway Variables
- SSL mode не установлен
- Failed migrations в БД
**Решение:**
- Проверить DATABASE_URL в Railway (должен быть с `?sslmode=require`)
- Проверить failed migrations: `railway run npx prisma migrate status`
- Если нужно: `railway run npx prisma migrate resolve --applied <migration_name>`

### Error 4: Next.js Start Failed
**Симптом:** `Error: listen EADDRINUSE` или `Port already in use`
**Причина:** Конфликт портов
**Решение:** Проверить что Railway устанавливает PORT переменную

### Error 5: Health Check Failed
**Симптом:** `GET /api/health` возвращает 404 или 500
**Причина:** 
- Next.js не запустился
- Роутинг не работает
**Решение:** Проверить логи Railway на ошибки старта

## 📋 Checklist для проверки Railway Variables

Убедись что в Railway → Variables установлены:

- [ ] `DATABASE_URL` - PostgreSQL connection string с `?sslmode=require`
- [ ] `NEXTAUTH_SECRET` - случайная строка для JWT
- [ ] `NEXTAUTH_URL` - URL приложения (https://echocare-production.up.railway.app)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- [ ] `SUPABASE_BUCKET` - имя bucket (journal-audio)
- [ ] `ALLOWED_AUDIO_MIME` - разрешенные MIME типы
- [ ] `MAX_AUDIO_MB` - максимальный размер файла (20)

## 🔧 Команды для диагностики

```bash
# Проверить статус миграций
railway run npx prisma migrate status

# Проверить подключение к БД
railway run npx prisma db pull --print

# Проверить переменные окружения (без секретов)
railway variables

# Посмотреть логи в реальном времени
railway logs --follow
```

## 📊 Ожидаемые логи успешного деплоя

```
# Build Stage
Step 7/10 : RUN npx prisma generate
Generating Prisma Client...
✔ Generated Prisma Client

Step 8/10 : RUN npm run build
Creating an optimized production build...
✔ Compiled successfully

# Runtime Stage
Running migrations...
Prisma Migrate Deploy
✔ Applied migration: 20251112000000_add_profile
✔ Applied migration: 20251112010000_add_journal_models

Starting Next.js on PORT=8080
Ready on http://0.0.0.0:8080
```

---

**Когда получишь ошибки - пришли логи из Railway, и я помогу их разобрать!**

