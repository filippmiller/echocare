# UI Refresh Progress Log

**Branch:** `feat/ui-refresh-nav-lang`  
**Started:** 2025-11-12  
**Status:** 🟢 Ready for Testing

**Last Updated:** 2025-11-12

---

## 📋 Plan Overview

**Goal:** Modern navbar (FB/VK style), proper language switcher, correct auth logic, fix avatar & audio playback, unified form styling.

**Approach:** PLAN → APPLY → VERIFY (step by step, commit after each step)

---

## 🕐 Timeline & Progress

### 2025-11-12 - Initial Setup
**Time:** Starting implementation

#### Step 1: Branch Creation
- [x] Created branch `feat/ui-refresh-nav-lang`
- [x] Created progress log file
- [x] Committed progress log

#### Step 2: Dependencies Check
**Time:** 2025-11-12
- [x] Verified lucide-react installed ✅
- [x] Verified next-intl installed ✅
- [x] Installed sonner for toasts ✅
- [x] Verified shadcn/ui partially installed (button, card, form, input, label exist)
- [x] Added DropdownMenu component ✅
- [x] Added Select component ✅
- [x] Committed dependencies

#### Step 3: Creating New Header Component
**Time:** 2025-11-12
- [x] Create `src/components/layout/Header.tsx` with modern design ✅
- [x] Create `src/components/layout/LanguageSwitcher.tsx` (show only alternative) ✅
- [x] Create `src/components/layout/UserMenu.tsx` (avatar dropdown with Profile, Settings, Sign out) ✅
- [x] Fix auth logic (no Sign in/Sign up when logged in) ✅
- [x] Integrate into layout ✅
- [x] Added Avatar component ✅
- [x] Committed Header implementation

**Status:** ✅ Header component created with:
- Modern sticky header design
- Proper auth logic (Sign in/Sign up only when NOT logged in)
- Language switcher showing only alternative language
- User menu with avatar dropdown
- Navigation links for logged-in users

#### Step 4: Fix Avatar Display
**Time:** 2025-11-12
- [x] Check Supabase Storage bucket configuration ✅
- [x] Verify avatar upload creates correct path ✅
- [x] Fix avatar URL generation (use publicUrl or signedUrl) ✅
- [x] Create avatarUtils.ts helper function ✅
- [x] Update layout to use getAvatarUrl helper ✅
- [x] Store path instead of full URL in database ✅
- [x] Committed avatar fixes ✅

**Status:** ✅ Avatar now stores path, generates URL on demand with fallback

#### Step 5: Fix Audio Playback
**Time:** 2025-11-12
- [x] Check audio API endpoint for signed URLs ✅
- [x] Add fallback to public URL if signed URL fails ✅
- [x] Improve error handling in audio endpoint ✅
- [x] Add error handling with toasts in AudioPlayer ✅
- [x] Better error messages with audio error codes ✅
- [x] Committed audio fixes ✅

**Status:** ✅ Audio playback improved with better error handling and fallbacks

#### Step 6: Refactor Forms
**Time:** 2025-11-12 - Deferred
- [x] Forms already use shadcn/ui components ✅
- [x] Toasts added to profile form ✅
- [x] Toasts added to audio player ✅
- [ ] Further styling improvements can be done later

**Note:** Forms are functional with shadcn/ui. Further styling refinements can be done in next iteration.

---

## 📝 Detailed Steps

### PLAN Phase

#### 1. UI Stack & Base Style
- [ ] Verify Tailwind is configured
- [ ] Add shadcn/ui components
- [ ] Add lucide-react icons
- [ ] Add sonner for toasts
- [ ] Connect Inter font via next/font
- [ ] Introduce unified card/form style: rounded-2xl, soft shadows, equal spacing

#### 2. Navbar
- [ ] Create `src/components/layout/Header.tsx`
- [ ] Left: logo/name
- [ ] Center/Left: navigation (Dashboard, Journal, etc.)
- [ ] Right: Language switcher (Globe icon + current locale), notifications icon (placeholder), avatar with dropdown menu (Profile, Settings, Sign out)
- [ ] Mobile: burger menu for sections, Globe and avatar on right

#### 3. Auth Logic in Header
- [ ] Use @supabase/auth-helpers-nextjs for session
- [ ] No session → show "Sign in" and "Sign up"
- [ ] Session exists → show only avatar menu (NO Sign in/Sign up visible)
- [ ] Sign out button inside avatar menu

#### 4. Language Switcher
- [ ] Set up next-intl with locale prefixes /[locale]/*
- [ ] In Header: show only alternative language
- [ ] If EN → show "Русский" in menu
- [ ] If RU → show "English" in menu
- [ ] Switching: save choice in cookie, change locale, keep current path and query

#### 5. Avatar Fixes
- [ ] Store path in bucket avatars (e.g., avatars/<uid>/<filename>), not full URL
- [ ] If bucket public → use getPublicUrl()
- [ ] If private → generate createSignedUrl(path, 3600) and update on demand
- [ ] Types: use Supabase types Database['public']['Tables']['user_profiles']['Update']
- [ ] On avatar update: upload → get URL → update profile → update UI state (toast "Avatar updated")

#### 6. Audio: "Failed to play" Fix
- [ ] On click: get fresh URL (getPublicUrl or createSignedUrl)
- [ ] Create new Audio(url) and play()
- [ ] If reading blob from storage → URL.createObjectURL(blob)
- [ ] Verify correct MIME types on storage files (audio/mpeg, audio/wav, etc.)
- [ ] Show toast with clear error, log console.error with response code

#### 7. Profile Forms
- [ ] Convert forms to shadcn cards: Card, CardHeader, CardContent, Form, FormField, Input, Select, Textarea, Button
- [ ] Grid: 1 column on mobile, 2-3 on desktop
- [ ] Save button → right bottom area of card
- [ ] Toast on success/error

#### 8. Accessibility & Dark Theme
- [ ] Add focus rings, aria-labels for switcher/menu
- [ ] Support dark mode (Tailwind dark: classes), check contrast

---

## 🔧 Technical Details

### Dependencies to Add
- shadcn/ui (via npx shadcn@latest init)
- lucide-react (already installed)
- sonner (for toasts)
- @supabase/auth-helpers-nextjs (if not already)

### Files to Create/Modify
- `src/components/layout/Header.tsx` (new)
- `src/components/layout/LanguageSwitcher.tsx` (new)
- `src/components/layout/UserMenu.tsx` (new)
- `src/components/header-nav.tsx` (modify or replace)
- `src/components/language-switcher.tsx` (modify)
- Avatar upload logic (fix)
- Audio player logic (fix)
- Profile forms (refactor)

---

## 🐛 Issues to Fix

### Critical
1. **Navbar shows Sign in/Sign up when logged in** - Auth logic broken
2. **Language switcher shows both languages** - Should show only alternative
3. **Avatar broken** - Not displaying, Supabase errors
4. **Audio playback failing** - "Failed to play audio" error

### UX
5. **Forms look outdated** - Different sizes/spacing, no unified visual language
6. **Sign out button separate** - Should be in avatar menu

---

## ✅ Verification Checklist

### Navbar
- [ ] Screenshot/video: Header in "guest" state (Sign in/Sign up visible)
- [ ] Screenshot/video: Header in "logged in" state (only avatar menu, NO Sign in/Sign up)
- [ ] Mobile: burger menu works, Globe and avatar visible

### Language Switcher
- [ ] On EN: only "Русский" visible in switcher
- [ ] On RU: only "English" visible in switcher
- [ ] After switching: path preserved, cookie set
- [ ] Locale persists after page refresh

### Avatar
- [ ] Avatar loads from profile
- [ ] Preview visible immediately after upload
- [ ] After page reload: image not broken
- [ ] No console errors related to avatar
- [ ] Toast shows "Avatar updated" on success

### Audio
- [ ] Track plays successfully
- [ ] Network tab: no 401/403 errors
- [ ] Headers: correct MIME type
- [ ] Toast shows clear error if playback fails

### Forms
- [ ] Cards with rounded-2xl
- [ ] Equal spacing
- [ ] Unified fields/buttons
- [ ] Dark theme doesn't break contrast
- [ ] Toast on save success/error

---

## 📦 Commits Log

### 2025-11-12
- [ ] `cursor: deps(ui + i18n + toasts)` - Install packages
- [ ] `cursor: feat(header with auth state, lang switch, avatar menu)` - Create Header component
- [ ] `cursor: fix(nav auth conditions)` - Fix auth logic
- [ ] `cursor: feat(i18n routes + switcher UX)` - Fix language switcher
- [ ] `cursor: fix(avatar upload + typed update)` - Fix avatar
- [ ] `cursor: fix(audio playback via signed/public URL)` - Fix audio playback
- [ ] `cursor: ui(forms → shadcn, spacing, typography)` - Refactor forms

---

## 🔍 Debugging Notes

### Avatar Issues
- Check Supabase Storage bucket `avatars` exists
- Verify bucket is public OR use signed URLs
- Check RLS policies: `user_id = auth.uid()` on UPDATE/SELECT
- Verify MIME types are correct
- Check CORS settings

### Audio Issues
- Check signed URL expiration (3600 seconds = 1 hour)
- Verify Content-Type in storage (audio/mpeg, audio/wav, etc.)
- Check CORS headers for frontend domain
- Verify file exists in storage bucket
- Check Network tab for 401/403 errors

### Auth Issues
- Verify session is being passed correctly to Header
- Check `@supabase/auth-helpers-nextjs` integration
- Verify conditional rendering logic

---

## 📚 References

- Supabase Storage: https://supabase.com/docs/guides/storage
- next-intl: https://next-intl-docs.vercel.app/
- shadcn/ui: https://ui.shadcn.com/
- Tailwind CSS: https://tailwindcss.com/

---

**Last Updated:** 2025-11-12  
**Next Step:** Install dependencies and start with Header component

