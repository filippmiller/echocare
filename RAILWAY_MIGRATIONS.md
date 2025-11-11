# Инструкции по применению миграций на Railway

## Шаг 1: Проверка статуса миграций локально

```bash
pnpm prisma migrate status
```

Ожидаемый вывод:
- `20251111232818_add_phone_field` - не применена (если еще не применена)
- `20251111214131_add_profile` - не применена

## Шаг 2: Применение миграций на Railway

### Вариант A: Через Railway CLI (рекомендуется)

```bash
# Установить Railway CLI (если еще не установлен)
npm i -g @railway/cli

# Войти в Railway
railway login

# Подключиться к проекту
railway link

# Применить миграции через one-off команду
railway run pnpm prisma migrate deploy
```

### Вариант B: Через Railway Dashboard

1. Откройте Railway Dashboard: https://railway.app
2. Выберите проект `echocare-production`
3. Перейдите в раздел "Deployments" или "Settings"
4. Найдите раздел "Deploy Hooks" или "One-off Commands"
5. Создайте новую команду:
   ```bash
   pnpm prisma migrate deploy
   ```
6. Запустите команду

### Вариант C: Автоматически при старте (уже настроено)

Миграции будут применяться автоматически при каждом старте приложения благодаря обновленному скрипту `start` в `package.json`:

```json
"start": "pnpm prisma migrate deploy && next start -p ${PORT:-3000}"
```

## Шаг 3: Проверка результата

После применения миграций проверьте:

1. **В Railway логах** должно быть:
   ```
   Applying migration `20251111232818_add_phone_field`
   Applying migration `20251111214131_add_profile`
   ```

2. **В Supabase Dashboard** проверьте таблицы:
   - `User` должна иметь поле `phone` (nullable, unique)
   - Должна существовать таблица `Profile` с полями:
     - `id`, `userId` (unique), `fullName`, `birthDate`, `city`, `phone`, `locale`, `timezone`, `gender`, `createdAt`, `updatedAt`
   - Должен существовать enum `Gender` (MALE, FEMALE, OTHER, UNKNOWN)

## Troubleshooting

### Ошибка: "Migration failed"
- Проверьте, что `DATABASE_URL` правильно настроен в Railway
- Убедитесь, что используется connection string без pgbouncer для миграций (или с правильными параметрами)
- Проверьте логи Railway для деталей ошибки

### Ошибка: "Table already exists"
- Это нормально, если миграция уже была применена ранее
- Проверьте статус: `pnpm prisma migrate status`

### Ошибка: "Connection timeout"
- Проверьте доступность Supabase из Railway
- Убедитесь, что IP Railway не заблокирован в Supabase

