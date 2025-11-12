# RLS (Row Level Security) Setup Guide

**Date:** 2025-11-12  
**Status:** ⚠️ Requires manual setup in Supabase Dashboard

---

## Overview

Row Level Security (RLS) policies ensure that users can only access their own data. This guide explains how to set up RLS policies for the ClearMind application.

---

## Tables Requiring RLS

1. **JournalEntry** - Users should only see their own entries
2. **TranscriptionJob** - Users should only see jobs for their own entries
3. **AudioAsset** - Users should only see their own audio assets
4. **Profile** - Users should only see their own profile

**Note:** `User` table doesn't need RLS as it's managed by NextAuth.js and accessed server-side only.

---

## Supabase Setup Steps

### 1. Enable RLS on Tables

In Supabase Dashboard → SQL Editor, run:

```sql
-- Enable RLS on all tables
ALTER TABLE "JournalEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TranscriptionJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AudioAsset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;
```

### 2. Create RLS Policies

**Important:** These policies assume you're using NextAuth.js with JWT tokens. If using Supabase Auth, you'll need to adjust `auth.uid()` references.

#### JournalEntry Policies

```sql
-- Users can SELECT their own entries
CREATE POLICY "Users can view their own journal entries"
ON "JournalEntry" FOR SELECT
USING (user_id = auth.uid());

-- Users can INSERT their own entries
CREATE POLICY "Users can create their own journal entries"
ON "JournalEntry" FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can UPDATE their own entries
CREATE POLICY "Users can update their own journal entries"
ON "JournalEntry" FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can DELETE their own entries
CREATE POLICY "Users can delete their own journal entries"
ON "JournalEntry" FOR DELETE
USING (user_id = auth.uid());
```

#### TranscriptionJob Policies

```sql
-- Users can SELECT jobs for their own entries
CREATE POLICY "Users can view transcription jobs for their entries"
ON "TranscriptionJob" FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "JournalEntry"
    WHERE "JournalEntry".id = "TranscriptionJob".entry_id
    AND "JournalEntry".user_id = auth.uid()
  )
);

-- System can INSERT jobs (via service role)
-- Note: This is handled server-side, so RLS might not be needed for INSERT
-- But if needed:
CREATE POLICY "System can create transcription jobs"
ON "TranscriptionJob" FOR INSERT
WITH CHECK (true); -- Service role bypasses RLS anyway

-- System can UPDATE jobs
CREATE POLICY "System can update transcription jobs"
ON "TranscriptionJob" FOR UPDATE
USING (true); -- Service role bypasses RLS anyway
```

#### AudioAsset Policies

```sql
-- Users can SELECT their own audio assets
CREATE POLICY "Users can view their own audio assets"
ON "AudioAsset" FOR SELECT
USING (user_id = auth.uid());

-- Users can INSERT their own audio assets
CREATE POLICY "Users can create their own audio assets"
ON "AudioAsset" FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can DELETE their own audio assets
CREATE POLICY "Users can delete their own audio assets"
ON "AudioAsset" FOR DELETE
USING (user_id = auth.uid());
```

#### Profile Policies

```sql
-- Users can SELECT their own profile
CREATE POLICY "Users can view their own profile"
ON "Profile" FOR SELECT
USING (user_id = auth.uid());

-- Users can INSERT their own profile
CREATE POLICY "Users can create their own profile"
ON "Profile" FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can UPDATE their own profile
CREATE POLICY "Users can update their own profile"
ON "Profile" FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

---

## Important Notes

### NextAuth.js vs Supabase Auth

**Current Setup:** The application uses NextAuth.js for authentication, not Supabase Auth. This means:

1. **RLS policies using `auth.uid()` won't work** unless you also authenticate users via Supabase Auth
2. **Current approach:** All database access goes through Prisma with server-side session checks
3. **Security:** Server-side API routes verify `session.user.id` before queries

### Recommended Approach

**Option A: Keep Current Setup (Recommended for MVP)**
- Continue using NextAuth.js
- RLS policies are **not strictly necessary** as all queries are server-side with session checks
- Simpler to maintain
- Already implemented in API routes

**Option B: Enable RLS for Defense in Depth**
- Set up Supabase Auth alongside NextAuth.js
- Use Supabase client for direct database access (if needed)
- Enable RLS policies as shown above
- More secure but more complex

### Storage RLS

**Supabase Storage** already uses signed URLs for private buckets:
- `avatars` bucket: Private, accessed via signed URLs
- `journal-audio` bucket: Private, accessed via signed URLs
- URLs expire after 1 hour (configurable)

**Storage policies** (if using Supabase Auth):

```sql
-- Allow authenticated users to read their own files
CREATE POLICY "Users can read their own files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'avatars' OR bucket_id = 'journal-audio'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to upload their own files
CREATE POLICY "Users can upload their own files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' OR bucket_id = 'journal-audio'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## Verification

After setting up RLS:

1. **Test as regular user:**
   - Try to access another user's entries → Should fail
   - Try to access your own entries → Should succeed

2. **Test as admin:**
   - Admin users might need special policies if they need to view all entries
   - Consider adding: `OR (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMIN'`

---

## Current Security Status

✅ **Server-side session checks** - All API routes verify `session.user.id`  
✅ **Private Storage buckets** - Files accessed via signed URLs only  
✅ **User-scoped queries** - All Prisma queries include `userId` filter  
⚠️ **RLS policies** - Not yet enabled (requires Supabase Auth setup)

---

**Recommendation:** For MVP, current server-side checks are sufficient. Enable RLS later if migrating to Supabase Auth or if direct database access is needed.

