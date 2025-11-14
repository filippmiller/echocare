# Codebase Analysis - ClearMind Application

**Date:** 2025-01-27  
**Branch:** `feat/ui-refresh-nav-lang`  
**Status:** ✅ Indexed and Ready for Development

---

## 📋 Project Overview

**ClearMind** (also referred to as EcoCare) is a secure journaling application with the following core features:

- **User Authentication**: NextAuth.js with JWT strategy, role-based access (ADMIN/USER)
- **Journal Entries**: Text and audio-based journal entries with transcription
- **Profile Management**: User profiles with avatar, location, preferences
- **Audio Transcription**: OpenAI Whisper API integration for voice-to-text
- **Internationalization**: English/Russian language support (next-intl)
- **Admin Panel**: API key management, transcription job monitoring

---

## 🏗️ Architecture

### Technology Stack

- **Framework**: Next.js 16.0.1 (App Router)
- **Language**: TypeScript 5
- **Database**: PostgreSQL (Supabase) with Prisma ORM 6.19.0
- **Authentication**: NextAuth.js 4.24.13 (Credentials provider, JWT)
- **Storage**: Supabase Storage (avatars, audio files)
- **UI**: Tailwind CSS 4, shadcn/ui components, Radix UI
- **Forms**: React Hook Form 7.66.0 + Zod 4.1.12
- **i18n**: next-intl 4.5.1
- **Notifications**: sonner 2.0.7
- **AI/ML**: OpenAI API 6.8.1 (Whisper, GPT-4o-mini)

### Project Structure

```
clear-mind-app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Auth routes (login, register)
│   │   ├── admin/              # Admin pages (API keys, transcriptions)
│   │   ├── dashboard/          # Main user dashboard
│   │   ├── api/                # API routes
│   │   │   ├── auth/           # Authentication endpoints
│   │   │   ├── journal/        # Journal CRUD, audio upload, transcription
│   │   │   ├── profile/        # Profile management
│   │   │   ├── admin/          # Admin endpoints (API keys, transcriptions)
│   │   │   └── cron/           # Cron jobs (transcription worker)
│   │   └── layout.tsx          # Root layout with Header
│   ├── components/             # React components
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── layout/             # Header, LanguageSwitcher, UserMenu
│   │   ├── audio-recorder.tsx  # Audio recording component
│   │   ├── audio-player.tsx    # Audio playback component
│   │   ├── new-entry-form.tsx  # Text entry form
│   │   ├── journal-entries-list.tsx
│   │   ├── journal-search.tsx
│   │   ├── quick-record.tsx    # FAB for quick recording
│   │   └── profile-form.tsx
│   ├── lib/                    # Utilities and helpers
│   │   ├── auth.ts             # NextAuth configuration
│   │   ├── prisma.ts           # Prisma client singleton
│   │   ├── supabaseServer.ts   # Supabase admin client
│   │   ├── transcription.ts    # OpenAI transcription functions
│   │   ├── apiKeys.ts          # API key management
│   │   ├── avatarUtils.ts      # Avatar URL helpers
│   │   └── validations/        # Zod schemas
│   ├── i18n/                   # Internationalization
│   │   ├── config.ts
│   │   ├── request.ts
│   │   └── messages/           # en.json, ru.json
│   ├── workers/                # Background workers
│   │   └── transcription-worker.ts
│   └── types/                  # TypeScript types
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/             # Migration history
├── public/                     # Static assets
└── scripts/                    # Utility scripts

```

---

## 🗄️ Database Schema

### Models

1. **User**
   - Authentication: email, phone, passwordHash
   - Role: ADMIN/USER
   - Relations: Profile (1:1), JournalEntry (1:N)

2. **Profile**
   - Personal info: fullName, birthDate, city, phone, locale
   - Avatar: avatarUrl (Supabase Storage path)
   - Gender: MALE/FEMALE/OTHER/UNKNOWN

3. **JournalEntry**
   - Type: TEXT/AUDIO
   - Content: title, text, summary, mood, energy, tags[]
   - Relations: User, AudioAsset (optional), TranscriptionJob[]
   - Indexes: userId+createdAt, tags (GIN)

4. **AudioAsset**
   - Storage: bucket, path, mime, size, duration
   - Relations: JournalEntry[]

5. **TranscriptionJob**
   - Status: PENDING/RUNNING/DONE/ERROR
   - Provider: openai (default)
   - Tracking: attempts, error, timestamps
   - Relations: JournalEntry

6. **ApiKey**
   - Management: name, provider, keyValue (encrypted)
   - Status: isActive, lastUsedAt
   - Created by: User ID

---

## 🔐 Authentication Flow

1. **Registration**: `/api/auth/register`
   - Email/password validation (Zod)
   - Bcrypt password hashing
   - Duplicate email protection
   - Role assignment (ADMIN if email in ADMIN_EMAILS env)

2. **Login**: NextAuth Credentials provider
   - Email normalization (lowercase)
   - Password verification (bcrypt)
   - JWT token generation with user data

3. **Session**: JWT strategy
   - Token includes: id, email, name, role
   - Middleware protects `/dashboard` and `/admin`
   - Admin routes require role === "ADMIN"

---

## 📝 Journal System

### Text Entries
- Form: title, text, mood, energy, tags
- API: `POST /api/journal/entries`
- Display: List with pagination (cursor-based)

### Audio Entries
- Recording: MediaRecorder API (WebM format)
- Upload: `POST /api/journal/upload` → Supabase Storage
- Playback: Signed URLs from Supabase
- Transcription: Automatic via OpenAI Whisper API

### Transcription Flow
1. Audio uploaded → `AudioAsset` created
2. `JournalEntry` created with `audioId`
3. `TranscriptionJob` created (status: PENDING)
4. Cron job (`/api/cron/transcription`) processes queue
5. Worker calls OpenAI Whisper API
6. GPT-4o-mini generates summary and tags
7. Entry updated with transcription text, summary, tags

### Search & Export
- Search API: `/api/journal/search`
  - Full-text search (PostgreSQL)
  - Tags filter
  - Date range filter
- Export API: `/api/journal/export`
  - CSV export
  - PDF export (jsPDF)

---

## 🌐 Internationalization

- **Locales**: `en` (default), `ru`
- **Config**: `src/i18n/config.ts`
- **Messages**: `src/i18n/messages/{locale}.json`
- **Components**: `LanguageSwitcher` in Header
- **Middleware**: Locale detection and routing

---

## 🔧 Key API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/[...nextauth]` - NextAuth handler

### Journal
- `POST /api/journal/entries` - Create text entry
- `GET /api/journal/entries` - List entries (paginated)
- `POST /api/journal/upload` - Upload audio
- `GET /api/journal/audio/[id]` - Get audio file
- `POST /api/journal/transcribe/[entryId]` - Trigger transcription
- `GET /api/journal/transcribe/status/[jobId]` - Check transcription status
- `GET /api/journal/search` - Search entries
- `POST /api/journal/export` - Export entries

### Profile
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update profile
- `POST /api/profile/avatar` - Upload avatar
- `GET /api/profile/avatar/url` - Get avatar URL
- `PUT /api/profile/locale` - Update locale

### Admin
- `GET /api/admin/api-keys` - List API keys
- `POST /api/admin/api-keys` - Create API key
- `PUT /api/admin/api-keys/[id]` - Update API key
- `DELETE /api/admin/api-keys/[id]` - Delete API key
- `GET /api/admin/transcriptions` - List transcription jobs
- `POST /api/admin/transcriptions/[jobId]/retry` - Retry failed job
- `POST /api/admin/transcriptions/[jobId]/cancel` - Cancel job

### System
- `GET /api/health` - Health check
- `POST /api/cron/transcription` - Transcription worker (cron)

---

## 🎨 UI Components

### Core Components
- **Header**: Navigation, user menu, language switcher
- **ProfileForm**: Edit profile with avatar upload
- **NewEntryForm**: Create text journal entry
- **AudioRecorder**: Record audio with MediaRecorder
- **AudioPlayer**: Play audio from Supabase Storage
- **JournalEntriesList**: Display entries with pagination
- **JournalSearch**: Search and filter entries
- **QuickRecord**: Floating action button for quick recording

### shadcn/ui Components
- Button, Card, Form, Input, Label, Select
- Avatar, Badge, Dropdown Menu

---

## ⚙️ Configuration Files

- `package.json`: Dependencies, scripts (dev on port 3005)
- `tsconfig.json`: TypeScript config (strict mode)
- `next.config.ts`: Next.js config (standalone output, i18n plugin)
- `tailwind.config.ts`: Tailwind CSS config
- `prisma/schema.prisma`: Database schema
- `middleware.ts`: Route protection, locale handling

---

## 🚀 Development Workflow

### Scripts
- `pnpm dev` - Start dev server (port 3005)
- `pnpm build` - Build for production
- `pnpm start` - Start production server (runs migrations first)
- `pnpm lint` - Run ESLint
- `pnpm typecheck` - TypeScript type checking
- `pnpm prisma:studio` - Open Prisma Studio
- `pnpm prisma:generate` - Generate Prisma client

### Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - JWT secret
- `NEXTAUTH_URL` - App URL
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `SUPABASE_BUCKET` - Storage bucket name (default: "journal-audio")
- `OPENAI_API_KEY` - OpenAI API key (fallback if no DB keys)
- `ADMIN_EMAILS` - Comma-separated admin emails

---

## 📊 Current Status

### ✅ Working Features
- User authentication (register/login)
- Text journal entries
- Audio recording and playback
- Profile management
- Audio transcription (OpenAI Whisper)
- Search and filtering
- Export (CSV, PDF)
- Admin panel (API keys, transcriptions)
- Internationalization (EN/RU)

### ⚠️ Known Issues (from STATUS.md)
1. **Audio playback**: Some issues with src URL handling (recently fixed)
2. **Avatar loading**: 404 errors (needs Supabase Storage verification)
3. **Language switching**: Needs testing

### 🔄 Recent Changes
- Branch: `feat/ui-refresh-nav-lang`
- UI refresh with new navigation
- Language switcher implementation
- Audio player bug fixes
- Header improvements for unauthenticated users

---

## 📚 Documentation Files

- `README.md` - Basic setup guide
- `STATUS.md` - Current development status
- `APPLICATION_REVIEW.md` - Complete feature review
- `TESTING_GUIDE.md` - Testing instructions
- `SPRINT_PROGRESS.md` - Sprint tracking
- Various deployment and migration guides

---

## 🎯 Next Steps / Areas for Improvement

1. **Testing**
   - Test language switching functionality
   - Verify avatar upload/display
   - End-to-end testing with Playwright

2. **Features**
   - Enhanced search with full-text indexing
   - Entry editing/deletion
   - Entry sharing/privacy settings
   - Mobile app (React Native?)

3. **Performance**
   - Optimize audio file sizes
   - Implement caching for transcriptions
   - Database query optimization

4. **Security**
   - Rate limiting on API endpoints
   - File upload validation improvements
   - API key encryption review

---

**Last Updated:** 2025-01-27  
**Prepared by:** AI Assistant (Cursor)


