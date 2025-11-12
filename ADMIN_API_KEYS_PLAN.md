# Admin API Keys Management - Implementation Plan

**Branch:** `feat/admin-api-keys`  
**Date:** 2025-11-12  
**Goal:** Allow administrators to manage API keys (OpenAI, etc.) through admin panel

---

## Current State

✅ **Roles System:**
- `Role` enum exists: `ADMIN`, `USER`
- User model has `role Role @default(USER)`
- Admin checks implemented in admin pages
- Registration assigns ADMIN role based on email list

✅ **Admin Pages:**
- `/admin` - Main admin dashboard
- `/admin/transcriptions` - Transcription jobs management

❌ **Missing:**
- API keys storage model
- API endpoints for key management
- UI for managing keys

---

## Implementation Plan

### 1. Database Schema

**Add `ApiKey` model to Prisma:**

```prisma
model ApiKey {
  id          String   @id @default(cuid())
  name        String   // Display name (e.g., "OpenAI Production", "OpenAI Staging")
  provider    String   // Provider name (e.g., "openai", "anthropic")
  keyValue    String   @db.Text // Encrypted or hashed key value
  isActive    Boolean  @default(true)
  lastUsedAt  DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdBy   String   // User ID who created it
  
  @@index([provider])
  @@index([isActive])
}
```

**Security Considerations:**
- Store keys encrypted (use `crypto` for encryption at rest)
- Never expose full key in API responses (show only last 4 chars)
- Track last usage for monitoring

### 2. API Endpoints

**`GET /api/admin/api-keys`**
- List all API keys (admin only)
- Return: `{ keys: ApiKey[] }` (masked values)

**`POST /api/admin/api-keys`**
- Create new API key
- Body: `{ name, provider, keyValue }`
- Encrypt keyValue before storing
- Return: `{ id, name, provider, maskedValue }`

**`PUT /api/admin/api-keys/[id]`**
- Update API key (name, isActive)
- Body: `{ name?, isActive? }`
- Return: Updated key

**`DELETE /api/admin/api-keys/[id]`**
- Delete API key (soft delete or hard delete)
- Return: `{ success: true }`

**`POST /api/admin/api-keys/[id]/test`**
- Test API key (e.g., make test call to OpenAI)
- Return: `{ success: boolean, message: string }`

### 3. UI Components

**`/admin/api-keys` Page:**
- List of all API keys in table
- Columns: Name, Provider, Status, Last Used, Actions
- "Add New Key" button
- Edit/Delete/Test actions per key

**`ApiKeysForm` Component:**
- Form for creating/editing keys
- Fields: Name, Provider (dropdown), Key Value (password input)
- Validation

**`ApiKeyCard` Component:**
- Display single key with masked value
- Show/hide toggle for key value
- Status indicator
- Action buttons

### 4. Integration with Existing Code

**Update `src/lib/transcription.ts`:**
- Instead of `process.env.OPENAI_API_KEY`, fetch from database
- Query active OpenAI key from `ApiKey` table
- Use that key for transcription

**Update Worker:**
- Same - fetch key from DB instead of env var

### 5. Migration Strategy

**Option A: Hybrid (Recommended)**
- Keep `OPENAI_API_KEY` env var as fallback
- If API key exists in DB, use it; otherwise use env var
- Allows gradual migration

**Option B: DB Only**
- Remove env var dependency
- Require admin to set key via UI
- More secure, but requires setup

---

## Security Features

1. **Encryption:**
   - Use AES-256-GCM for key encryption
   - Store encryption key in env var: `API_KEYS_ENCRYPTION_KEY`
   - Never log full keys

2. **Access Control:**
   - Only ADMIN role can access endpoints
   - Audit log: track who created/updated/deleted keys

3. **Key Masking:**
   - Show only last 4 characters: `sk-...xxxx`
   - Full key only shown during creation/edit (with confirmation)

4. **Validation:**
   - Validate key format per provider
   - Test key before saving (optional but recommended)

---

## UI/UX Flow

1. **Admin logs in** → Sees "Admin" link in header
2. **Clicks Admin** → Sees dashboard with "API Keys" card
3. **Clicks API Keys** → Sees list of keys
4. **Clicks "Add New"** → Form opens
5. **Fills form** → Key is encrypted and saved
6. **Key appears in list** → Can edit/delete/test

---

## Files to Create/Modify

**New Files:**
- `prisma/migrations/XXXXXX_add_api_keys/migration.sql`
- `src/app/admin/api-keys/page.tsx`
- `src/app/api/admin/api-keys/route.ts`
- `src/app/api/admin/api-keys/[id]/route.ts`
- `src/app/api/admin/api-keys/[id]/test/route.ts`
- `src/components/admin/api-keys-form.tsx`
- `src/components/admin/api-keys-list.tsx`
- `src/lib/apiKeys.ts` (encryption utilities)

**Modified Files:**
- `prisma/schema.prisma` (add ApiKey model)
- `src/lib/transcription.ts` (use DB key instead of env)
- `src/workers/transcription-worker.ts` (use DB key)
- `src/app/admin/page.tsx` (add API Keys card)
- `src/components/layout/Header.tsx` (ensure Admin link visible)

---

## Testing Checklist

- [ ] Admin can create API key
- [ ] Admin can edit API key (name, status)
- [ ] Admin can delete API key
- [ ] Admin can test API key
- [ ] Non-admin cannot access endpoints
- [ ] Keys are encrypted in database
- [ ] Keys are masked in API responses
- [ ] Transcription uses DB key when available
- [ ] Fallback to env var works if no DB key

---

## Next Steps

1. Create branch ✅
2. Add ApiKey model to Prisma schema
3. Create migration
4. Implement encryption utilities
5. Create API endpoints
6. Create UI components
7. Integrate with transcription code
8. Test end-to-end
9. Update documentation

