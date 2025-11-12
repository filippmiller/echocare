# План реализации фоновой транскрипции аудио

**Дата:** 2025-11-12  
**Статус:** План готов к реализации  
**Источник:** Рекомендации от умного друга

---

## Архитектура решения

### Подход: Фоновая обработка через Railway Worker

**Преимущества:**
- ✅ Не тормозит UI (обработка в фоне)
- ✅ Масштабируется (можно добавить несколько воркеров)
- ✅ Надёжно (очередь задач, retry на ошибки)
- ✅ Пользователь видит статус в реальном времени

---

## 1. Обновление схемы базы данных

### Новая таблица: `journal_audio`

**Файл:** `prisma/schema.prisma`

```prisma
enum TranscriptionStatus {
  UPLOADED    // Аудио загружено, но ещё не поставлено в очередь
  QUEUED      // В очереди на обработку
  PROCESSING  // Обрабатывается воркером
  DONE        // Транскрипция завершена успешно
  ERROR       // Ошибка при транскрипции
}

model JournalAudio {
  id             String              @id @default(cuid())
  userId         String
  user           User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Связь с существующим AudioAsset
  audioAssetId   String              @unique
  audioAsset     AudioAsset          @relation(fields: [audioAssetId], references: [id], onDelete: Cascade)
  
  // Статус транскрипции
  status         TranscriptionStatus @default(UPLOADED)
  
  // Параметры транскрипции
  lang           String?             // "ru", "en", null = auto
  prompt         String?             // Подсказка для модели (имена, топонимы, тематика)
  
  // Результаты
  transcriptText String?             @db.Text // Текст транскрипции
  transcriptJson Json?               // Расширенный результат с временными метками (опционально)
  
  // Ошибки
  errorMessage   String?             @db.Text
  
  // Метаданные
  createdAt      DateTime            @default(now())
  updatedAt      DateTime            @updatedAt
  processedAt    DateTime?           // Когда завершена обработка
  
  @@index([status]) // Для быстрого поиска задач в очереди
  @@index([userId])
}
```

**Обновление существующих моделей:**

```prisma
model AudioAsset {
  // ... существующие поля
  journalAudio  JournalAudio?  // Один-к-одному с транскрипцией
}

model User {
  // ... существующие поля
  journalAudios JournalAudio[]
}
```

---

## 2. API Endpoints

### 2.1. Создание записи транскрипции при загрузке аудио

**Файл:** `src/app/api/journal/upload/route.ts`

**Изменения:**
После создания `AudioAsset` и `JournalEntry`, создаём `JournalAudio` со статусом `QUEUED`:

```typescript
// После создания AudioAsset
const journalAudio = await prisma.journalAudio.create({
  data: {
    userId: session.user.id,
    audioAssetId: audioAsset.id,
    status: "QUEUED",
    lang: "ru", // Можно брать из Profile.locale или определять автоматически
    prompt: null, // Можно добавить в будущем поле для prompt в форме
  },
});
```

### 2.2. Получение статуса транскрипции

**Файл:** `src/app/api/journal/transcription/[audioAssetId]/route.ts`

```typescript
export async function GET(
  request: Request,
  { params }: { params: Promise<{ audioAssetId: string }> }
) {
  const session = await getServerAuthSession();
  if (!session) return unauthorized();

  const { audioAssetId } = await params;

  const journalAudio = await prisma.journalAudio.findUnique({
    where: { audioAssetId },
    select: {
      id: true,
      status: true,
      transcriptText: true,
      errorMessage: true,
      updatedAt: true,
    },
  });

  if (!journalAudio || journalAudio.userId !== session.user.id) {
    return notFound();
  }

  return NextResponse.json(journalAudio);
}
```

### 2.3. Повторная попытка транскрипции (retry)

**Файл:** `src/app/api/journal/transcription/[audioAssetId]/retry/route.ts`

```typescript
export async function POST(
  request: Request,
  { params }: { params: Promise<{ audioAssetId: string }> }
) {
  const session = await getServerAuthSession();
  if (!session) return unauthorized();

  const { audioAssetId } = await params;

  const journalAudio = await prisma.journalAudio.findUnique({
    where: { audioAssetId },
  });

  if (!journalAudio || journalAudio.userId !== session.user.id) {
    return notFound();
  }

  // Сбрасываем статус на QUEUED для повторной обработки
  await prisma.journalAudio.update({
    where: { audioAssetId },
    data: {
      status: "QUEUED",
      errorMessage: null,
    },
  });

  return NextResponse.json({ success: true });
}
```

---

## 3. Ядро транскрипции (Core Function)

**Файл:** `src/lib/transcription.ts`

```typescript
import OpenAI from "openai";
import { getSupabaseAdmin } from "./supabaseServer";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const JOURNAL_AUDIO_BUCKET = "journal-audio";

export interface TranscribeOptions {
  path: string;
  lang?: string; // "ru", "en", null = auto
  prompt?: string; // Подсказка для модели
}

export async function transcribeSupabaseAudio({
  path,
  lang = "ru",
  prompt = "",
}: TranscribeOptions): Promise<{ text: string; json?: any }> {
  const supabaseAdmin = getSupabaseAdmin();

  // 1) Получаем подписанный URL на файл в приватном бакете
  const { data, error } = await supabaseAdmin.storage
    .from(JOURNAL_AUDIO_BUCKET)
    .createSignedUrl(path, 60 * 30); // 30 минут

  if (error || !data?.signedUrl) {
    throw new Error(`Signed URL failed: ${error?.message ?? "Unknown error"}`);
  }

  // 2) Качаем байты и создаём File (Node 18+ поддерживает Web File)
  const res = await fetch(data.signedUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch audio: ${res.statusText}`);
  }

  const blob = await res.blob();
  const file = new File(
    [await blob.arrayBuffer()],
    path.split("/").pop() || "note.webm",
    {
      type: blob.type || "audio/webm",
    }
  );

  // 3) Отправляем в OpenAI STT
  const transcription = await openai.audio.transcriptions.create({
    model: "gpt-4o-mini-transcribe", // или "gpt-4o-transcribe" для более точной транскрипции
    file,
    language: lang || undefined, // null = auto-detect
    prompt: prompt || undefined, // Подсказка для улучшения качества
    response_format: "verbose_json", // Для получения временных меток (опционально)
  });

  return {
    text: transcription.text,
    json: transcription, // Расширенный результат с временными метками
  };
}
```

---

## 4. Railway Worker

**Файл:** `src/workers/transcription-worker.ts`

```typescript
import { prisma } from "@/lib/prisma";
import { transcribeSupabaseAudio } from "@/lib/transcription";

const BATCH_SIZE = 5; // Обрабатываем до 5 задач за раз
const POLL_INTERVAL_MS = 10000; // Проверяем каждые 10 секунд

async function processTranscriptionQueue() {
  try {
    // Берём задачи со статусом QUEUED (SELECT FOR UPDATE SKIP LOCKED)
    const tasks = await prisma.$transaction(
      async (tx) => {
        // Находим задачи
        const queued = await tx.journalAudio.findMany({
          where: { status: "QUEUED" },
          take: BATCH_SIZE,
          orderBy: { createdAt: "asc" },
          include: {
            audioAsset: {
              select: {
                path: true,
                mime: true,
              },
            },
          },
        });

        // Обновляем статус на PROCESSING
        const ids = queued.map((t) => t.id);
        if (ids.length > 0) {
          await tx.journalAudio.updateMany({
            where: { id: { in: ids } },
            data: { status: "PROCESSING" },
          });
        }

        return queued;
      },
      {
        isolationLevel: "ReadCommitted",
      }
    );

    // Обрабатываем каждую задачу
    for (const task of tasks) {
      try {
        console.log(`[Transcription Worker] Processing task ${task.id}`);

        const result = await transcribeSupabaseAudio({
          path: task.audioAsset.path,
          lang: task.lang || undefined,
          prompt: task.prompt || undefined,
        });

        // Сохраняем результат
        await prisma.journalAudio.update({
          where: { id: task.id },
          data: {
            status: "DONE",
            transcriptText: result.text,
            transcriptJson: result.json || null,
            processedAt: new Date(),
          },
        });

        console.log(`[Transcription Worker] Task ${task.id} completed successfully`);
      } catch (error) {
        console.error(`[Transcription Worker] Task ${task.id} failed:`, error);
        
        // Сохраняем ошибку
        await prisma.journalAudio.update({
          where: { id: task.id },
          data: {
            status: "ERROR",
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          },
        });
      }
    }
  } catch (error) {
    console.error("[Transcription Worker] Queue processing error:", error);
  }
}

// Запускаем воркер в цикле
async function startWorker() {
  console.log("[Transcription Worker] Starting worker...");
  
  while (true) {
    await processTranscriptionQueue();
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

// Запуск (если запускается как отдельный процесс)
if (require.main === module) {
  startWorker().catch((error) => {
    console.error("[Transcription Worker] Fatal error:", error);
    process.exit(1);
  });
}

export { startWorker, processTranscriptionQueue };
```

### Railway Cron Job (альтернатива постоянному процессу)

**Файл:** `src/app/api/cron/transcription/route.ts`

```typescript
import { NextResponse } from "next/server";
import { processTranscriptionQueue } from "@/workers/transcription-worker";

// Защита от несанкционированного доступа (Railway Cron secret)
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await processTranscriptionQueue();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Cron] Transcription error:", error);
    return NextResponse.json(
      { error: "Processing failed" },
      { status: 500 }
    );
  }
}
```

**Railway Cron настройка:**
- URL: `https://your-app.railway.app/api/cron/transcription`
- Schedule: `*/10 * * * *` (каждые 10 секунд) или `*/1 * * * *` (каждую минуту)
- Headers: `Authorization: Bearer ${CRON_SECRET}`

---

## 5. UI Обновления

### 5.1. Компонент статуса транскрипции

**Файл:** `src/components/transcription-status.tsx`

```typescript
"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";

interface TranscriptionStatusProps {
  audioAssetId: string;
}

type Status = "UPLOADED" | "QUEUED" | "PROCESSING" | "DONE" | "ERROR";

export function TranscriptionStatus({ audioAssetId }: TranscriptionStatusProps) {
  const [status, setStatus] = useState<Status | null>(null);
  const [transcriptText, setTranscriptText] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/journal/transcription/${audioAssetId}`);
      if (!res.ok) return;

      const data = await res.json();
      setStatus(data.status);
      setTranscriptText(data.transcriptText);
      setErrorMessage(data.errorMessage);
    } catch (error) {
      console.error("Failed to fetch transcription status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Polling для статусов PROCESSING и QUEUED
    if (status === "PROCESSING" || status === "QUEUED") {
      const interval = setInterval(fetchStatus, 5000); // Каждые 5 секунд
      return () => clearInterval(interval);
    }
  }, [audioAssetId, status]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const res = await fetch(`/api/journal/transcription/${audioAssetId}/retry`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Transcription queued for retry");
        await fetchStatus();
      } else {
        toast.error("Failed to retry transcription");
      }
    } catch (error) {
      toast.error("Failed to retry transcription");
    } finally {
      setIsRetrying(false);
    }
  };

  if (isLoading) {
    return <Badge variant="outline">Loading...</Badge>;
  }

  if (!status) return null;

  const statusConfig = {
    UPLOADED: { label: "Uploaded", icon: Clock, variant: "secondary" as const },
    QUEUED: { label: "Queued", icon: Clock, variant: "secondary" as const },
    PROCESSING: { label: "Transcribing...", icon: Loader2, variant: "default" as const },
    DONE: { label: "Transcribed", icon: CheckCircle2, variant: "success" as const },
    ERROR: { label: "Error", icon: XCircle, variant: "destructive" as const },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant={config.variant} className="gap-1">
          {status === "PROCESSING" ? (
            <Icon className="h-3 w-3 animate-spin" />
          ) : (
            <Icon className="h-3 w-3" />
          )}
          {config.label}
        </Badge>
        {status === "ERROR" && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            disabled={isRetrying}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isRetrying ? "animate-spin" : ""}`} />
            Retry
          </Button>
        )}
      </div>
      {transcriptText && (
        <div className="rounded-md bg-muted p-3 text-sm">
          <p className="font-medium mb-1">Transcription:</p>
          <p className="text-muted-foreground">{transcriptText}</p>
        </div>
      )}
      {errorMessage && status === "ERROR" && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <p className="font-medium mb-1">Error:</p>
          <p>{errorMessage}</p>
        </div>
      )}
    </div>
  );
}
```

### 5.2. Обновление JournalEntriesList

**Файл:** `src/components/journal-entries-list.tsx`

Добавить `TranscriptionStatus` для аудио записей:

```typescript
{entry.type === "AUDIO" && entry.audio && (
  <>
    <AudioPlayer audioId={entry.audio.id} />
    <TranscriptionStatus audioAssetId={entry.audio.id} />
  </>
)}
```

---

## 6. Улучшения качества (опционально)

### 6.1. Подсказки для модели (Prompt)

Добавить поле в форму загрузки аудио:

```typescript
// В AudioRecorder компоненте
const [transcriptionPrompt, setTranscriptionPrompt] = useState("");

// При загрузке передавать prompt:
await prisma.journalAudio.create({
  data: {
    // ...
    prompt: transcriptionPrompt || "Язык: русский. Тематика: личные заметки, имена собственные.",
  },
});
```

### 6.2. Обработка длинных файлов (>15 минут)

**Файл:** `src/lib/audio-processing.ts`

```typescript
// Использовать ffmpeg для разбивки по тишине
// Пока оставляем как есть, можно добавить позже
```

### 6.3. Пост-обработка через GPT-4o

**Файл:** `src/lib/post-process-transcription.ts`

```typescript
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function postProcessTranscription(text: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Исправь пунктуацию, добавь абзацы и сделай текст более читаемым. Сохрани оригинальный смысл.",
      },
      {
        role: "user",
        content: text,
      },
    ],
  });

  return completion.choices[0]?.message?.content || text;
}
```

---

## 7. Чек-лист запуска

### 7.1. Environment Variables

**Railway (Backend):**
```env
OPENAI_API_KEY=sk-...
CRON_SECRET=your-secret-key-for-cron-protection
```

### 7.2. Database Migration

```bash
# Создать миграцию
npx prisma migrate dev --name add_journal_audio_transcription

# Применить на production
npx prisma migrate deploy
```

### 7.3. Supabase Storage

- ✅ Bucket `journal-audio` уже существует (приватный)
- ✅ Signed URLs работают (уже реализовано)

### 7.4. Установка зависимостей

```bash
npm install openai
```

### 7.5. Запуск воркера

**Вариант A: Постоянный процесс (Railway Worker)**
- Создать отдельный сервис в Railway
- Запускать: `node src/workers/transcription-worker.js` или через `package.json` script

**Вариант B: Cron Job (Railway Cron)**
- Настроить Railway Cron на `/api/cron/transcription`
- Schedule: каждую минуту или каждые 10 секунд

### 7.6. Тестирование

1. Загрузить аудио файл
2. Проверить, что создалась запись `JournalAudio` со статусом `QUEUED`
3. Дождаться обработки воркером
4. Проверить статус `DONE` и наличие `transcriptText`
5. Проверить UI отображение статуса и текста

---

## 8. Оценка времени реализации

- **Базовая реализация (без улучшений):** 6-8 часов
  - Схема БД и миграция: 30 мин
  - Core функция транскрипции: 1 час
  - API endpoints: 1 час
  - Воркер: 2 часа
  - UI компоненты: 2 часа
  - Тестирование: 1-2 часа

- **С улучшениями качества:** +4-6 часов
  - Prompt поддержка: 1 час
  - Пост-обработка: 2-3 часа
  - Обработка длинных файлов: 2-3 часа

**Итого:** 6-14 часов в зависимости от требуемых улучшений

---

## 9. Стоимость OpenAI API

**Модель:** `gpt-4o-mini-transcribe`
- **Цена:** ~$0.006 за минуту аудио
- **Пример:** 5-минутная запись = $0.03

**Модель:** `gpt-4o-transcribe` (более точная)
- **Цена:** ~$0.015 за минуту аудио
- **Пример:** 5-минутная запись = $0.075

**Рекомендация:** Начать с `gpt-4o-mini-transcribe`, перейти на `gpt-4o-transcribe` если нужна большая точность.

---

## 10. Альтернативы (если нужно обойтись без облака)

**Faster-Whisper (локально):**
- Можно поднять на Railway или отдельном сервере
- Бесплатно, но требует больше ресурсов
- Хорошее качество для русского языка

**Рекомендация:** Начать с OpenAI API (проще и быстрее), перейти на локальное решение если нужно снизить стоимость при больших объёмах.

---

**Документ готов к реализации!** 🚀

