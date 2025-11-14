# ClearMind App

Role-based authentication starter built with Next.js App Router, NextAuth, Prisma, TailwindCSS, and shadcn/ui.

## Features
- Email + password authentication via NextAuth Credentials provider
- Prisma ORM with PostgreSQL (Supabase) for database
- Role-based access control (ADMIN / USER / BUSINESS_OWNER) and guarded routes (/dashboard, /admin, /business)
- Registration API with bcrypt password hashing and duplicate email protection
- TailwindCSS + shadcn/ui components, React Hook Form + Zod validation
- **Service Catalog & Business Services** - каталог услуг и управление услугами для бизнеса

## Dev
`
pnpm install
pnpm prisma migrate dev --name init
pnpm dev
`

## Lint
`
pnpm lint
`

## Env
`
cp .env.local.example .env.local
# заполнить NEXTAUTH_SECRET, ADMIN_EMAILS
`

## Migration Guide: SQLite → Supabase Postgres
1. Создайте проект в Supabase и возьмите connection string (Pooler, SSL required).
2. В Railway (или другом хостинге) задайте переменную DATABASE_URL со строкой подключения Postgres (Pooler).
3. Выполните Prisma миграции в окружении (pnpm prisma migrate deploy в проде / pnpm prisma migrate dev на staging).
4. NextAuth продолжает использовать JWT-сессии (без Prisma Adapter), поэтому дополнительные таблицы не требуются.
5. Для таблицы User пока не включаем RLS. Контроль доступа осуществляется через NextAuth и серверные обработчики. Настройку RLS выносим в отдельную задачу.
6. Обновите переменные окружения (NEXTAUTH_URL, NEXTAUTH_SECRET, ADMIN_EMAILS) в Railway/Supabase и прогоните сценарий /auth/register → /auth/login → /dashboard → /admin.

## Scripts
- pnpm dev – локальный dev-сервер
- pnpm build – сборка
- pnpm start – запуск production сборки
- pnpm lint – ESLint
- pnpm prisma:studio – Prisma Studio
- pnpm prisma:seed – заполнение базы данных начальными данными (города, категории услуг, типы услуг)

## Folder Highlights
- src/app/api/auth/[...nextauth]/route.ts – NextAuth handler
- src/app/api/auth/register/route.ts – регистрация пользователя
- src/app/(auth) – страницы входа и регистрации
- src/app/dashboard, src/app/admin, src/app/business – защищённые страницы
- src/app/api/services – публичный API каталога услуг
- src/app/api/business – API для управления услугами бизнеса
- middleware.ts – гварды маршрутов
- prisma/schema.prisma – схема БД

## Service Catalog Module

### Database Models
- **City** – города (СПб, Москва)
- **BusinessAccount** – аккаунты бизнеса (1:1 с User)
- **Place** – места/точки бизнеса
- **ServiceCategory** – категории услуг (Красота, Химчистка, Ключи и т.д.)
- **ServiceType** – типы услуг (Женская стрижка, Химчистка пальто и т.д.)
- **PlaceService** – услуги конкретного места с ценами и настройками

### Setup
1. Применить миграции: `pnpm prisma migrate deploy`
2. Заполнить начальные данные: `pnpm prisma:seed`
3. Создать пользователя с ролью `BUSINESS_OWNER`
4. Создать BusinessAccount и Place для тестирования

### Testing
1. Войти под BUSINESS_OWNER
2. Открыть `/business/dashboard` – увидеть список мест
3. Перейти на `/business/places/[placeId]/services` – управление услугами
4. Добавить услуги через форму "Add Service"

Подробности см. в `SERVICE_CATALOG_CHANGELOG.md`

## License
MIT
