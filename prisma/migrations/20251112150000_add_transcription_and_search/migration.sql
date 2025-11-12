-- Add transcription and search features to journal entries

-- Add new fields to journal_entries
ALTER TABLE "JournalEntry" ADD COLUMN IF NOT EXISTS "summary" TEXT;
ALTER TABLE "JournalEntry" ADD COLUMN IF NOT EXISTS "transcribedAt" TIMESTAMPTZ;

-- Ensure text field is TEXT type (if not already)
ALTER TABLE "JournalEntry" ALTER COLUMN "text" TYPE TEXT;

-- Create TranscriptionJob table
CREATE TABLE IF NOT EXISTS "TranscriptionJob" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMPTZ,
    "finishedAt" TIMESTAMPTZ,

    CONSTRAINT "TranscriptionJob_pkey" PRIMARY KEY ("id")
);

-- Add foreign key
ALTER TABLE "TranscriptionJob" ADD CONSTRAINT "TranscriptionJob_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS "TranscriptionJob_status_createdAt_idx" ON "TranscriptionJob"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "TranscriptionJob_entryId_idx" ON "TranscriptionJob"("entryId");

-- Add index for tags (GIN index for array search)
CREATE INDEX IF NOT EXISTS "journal_entries_tags_idx" ON "JournalEntry" USING GIN ("tags");

-- Add composite index for user + created_at (for pagination and sorting)
CREATE INDEX IF NOT EXISTS "JournalEntry_userId_createdAt_idx" ON "JournalEntry"("userId", "createdAt" DESC);

-- Add full-text search index (using simple text search)
-- Note: Prisma doesn't support GENERATED columns directly, so we'll create a trigger-based solution
-- For now, we'll create a regular index on text+summary concatenation
CREATE INDEX IF NOT EXISTS "JournalEntry_text_summary_idx" ON "JournalEntry" USING GIN (to_tsvector('simple', COALESCE("text", '') || ' ' || COALESCE("summary", '')));

-- Add check constraint for TranscriptionJob status
ALTER TABLE "TranscriptionJob" ADD CONSTRAINT "TranscriptionJob_status_check" CHECK ("status" IN ('PENDING', 'RUNNING', 'DONE', 'ERROR'));

