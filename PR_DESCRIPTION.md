# PR: Profile MVP + Journal MVP (text + audio)

## Что сделано

### Профиль пользователя (MVP)
- ✅ Prisma schema: enum `Gender`, модель `Profile` (1:1 с User)
- ✅ API: `GET /api/profile`, `PUT /api/profile` с валидацией Zod
- ✅ UI: форма редактирования профиля на `/dashboard` (SSR + react-hook-form)
- ✅ Автоматическое создание пустого профиля при первом запросе

### Журнал (текст + аудио) - MVP без ИИ
- ✅ Prisma schema: модели `JournalEntry`, `AudioAsset`, `Job` + enums `EntryType`, `JobStatus`
- ✅ API:
  - `POST /api/journal/entries` - создать текстовую запись
  - `GET /api/journal/entries` - список записей с cursor-based пагинацией
  - `POST /api/journal/upload` - загрузка аудио в Supabase Storage
- ✅ UI на `/dashboard`:
  - Форма создания текстовой записи
  - Компонент записи аудио (MediaRecorder API)
  - Список записей с пагинацией

### Инфраструктура
- ✅ Стандартизатор ошибок API (`src/lib/apiErrors.ts`): 400, 401, 403, 404, 413, 415, 500
- ✅ Supabase admin client (`src/lib/supabaseServer.ts`) - server-only
- ✅ Production deploy hook: автоматическое применение миграций при старте
- ✅ Документация: `IMPLEMENTATION_REPORT.md`, `RAILWAY_MIGRATIONS.md`, `SETUP_STORAGE.md`, `CREDENTIALS.md`

## Новые API эндпоинты

### Профиль
- `GET /api/profile` - получить профиль текущего пользователя
- `PUT /api/profile` - обновить профиль

### Журнал
- `POST /api/journal/entries` - создать текстовую запись
- `GET /api/journal/entries?limit=20&cursor=...` - получить список записей (пагинация)
- `POST /api/journal/upload` - загрузить аудио файл

## Результаты смоук-теста

### Auth
- ✅ Логин под USER работает
- ✅ Логин под ADMIN работает (email из ADMIN_EMAILS)
- ✅ `/admin` доступен только для ADMIN (USER редиректится на `/dashboard`)

### Профиль
- ✅ `/dashboard` загружает профиль SSR
- ✅ Редактирование `fullName`, `locale`, `timezone`, `phone` сохраняется (200)
- ✅ Неавторизованный запрос к `/api/profile` → 401

### Журнал - текст
- ✅ Текстовая запись создается через форму
- ✅ Запись появляется в списке сразу после создания
- ✅ Перезагрузка страницы сохраняет состояние
- ✅ `GET /api/journal/entries` возвращает только записи текущего пользователя

### Журнал - аудио
- ✅ Запись 5-10 сек через MediaRecorder работает
- ✅ Файл загружается в Supabase Storage по пути `user/<userId>/<yyyy>/<mm>/<dd>/<cuid>.<ext>`
- ✅ В БД создается `AudioAsset` и `JournalEntry` (type=AUDIO)
- ✅ Запись отображается в списке как "Audio note"
- ✅ Неподдерживаемый MIME → 415
- ✅ Размер > MAX_AUDIO_MB → 413
- ✅ Отсутствие bucket → 503 (проверено до создания bucket)

### Безопасность
- ✅ `SUPABASE_SERVICE_ROLE_KEY` используется только в серверных модулях
- ✅ Логи не содержат секретов
- ✅ Все API проверяют сессию; доступ только по `session.user.id`

## Известные ограничения

- RLS (Row Level Security) пока выключен на таблицах (доступ контролируется в API)
- Транскрипция аудио отложена (Job создается со статусом PENDING, воркер будет добавлен отдельно)
- MediaRecorder требует HTTPS (кроме localhost)

## Миграции

Применены миграции:
- `20251111232818_add_phone_field` - добавлено поле `phone` в User
- `20251111214131_add_profile` - создана таблица Profile
- `20251111222336_add_journal_models` - созданы таблицы JournalEntry, AudioAsset, Job

## Storage

Bucket `journal-audio` создан в Supabase Storage (Private).

## Бэклог на следующий спринт

- Transcription воркер (Railway): очередь Job(type='transcription'), signed URL из Storage, вызов STT, запись текста в JournalEntry.text
- Рейт-лимиты/защита API: лимит по пользователю (60 req/мин для записи журнала)
- RLS-план: включить RLS на Profile, JournalEntry, AudioAsset с политиками user_id = auth.uid()
- Аудит-лог: AuditEvent(userId, action, entity, meta, createdAt)
- Экспорт/резервное копирование: генерация ZIP с JSON записей + аудио
- i18n каркас: заготовка словарей (ru, en)
