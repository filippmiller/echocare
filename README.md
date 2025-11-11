# ClearMind App

Role-based authentication starter built with Next.js App Router, NextAuth, Prisma, TailwindCSS, and shadcn/ui.

## Features
- Email + password authentication via NextAuth Credentials provider
- Prisma ORM with SQLite for local development
- Role-based access control (ADMIN / USER) and guarded routes (/dashboard, /admin)
- Registration API with bcrypt password hashing and duplicate email protection
- TailwindCSS + shadcn/ui components, React Hook Form + Zod validation

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

## Folder Highlights
- src/app/api/auth/[...nextauth]/route.ts – NextAuth handler
- src/app/api/auth/register/route.ts – регистрация пользователя
- src/app/(auth) – страницы входа и регистрации
- src/app/dashboard, src/app/admin – защищённые страницы
- middleware.ts – гварды маршрутов
- prisma/schema.prisma – схема БД

## License
MIT
