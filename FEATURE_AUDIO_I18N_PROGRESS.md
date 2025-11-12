# Feature: Audio Playback & i18n (Russian/English) - Progress Log

**Branch:** `feature/audio-playback-i18n`  
**Created:** 2025-11-12  
**Status:** 🟡 In Testing

---

## 📋 Overview

This feature adds:
1. Audio playback functionality for voice messages
2. Internationalization (i18n) support for Russian and English
3. Language switcher component
4. Preparation for AI transcription with language detection

---

## ✅ Completed Features

### 1. Audio Playback
- ✅ Created `AudioPlayer` component with Play/Pause controls
- ✅ Created API endpoint `/api/journal/audio/[id]` for signed URLs from Supabase Storage
- ✅ Integrated audio player into journal entries list
- ✅ Added audio metadata (duration, mime type) to API responses

### 2. i18n Infrastructure
- ✅ Installed and configured `next-intl`
- ✅ Created translation files (`en.json`, `ru.json`)
- ✅ Set up middleware for locale detection
- ✅ Created `LanguageSwitcher` component
- ✅ Added API endpoint `/api/profile/locale` for saving language preference
- ✅ Updated profile validation to support `locale: "en" | "ru"`
- ✅ Updated components to use translations:
  - `journal-entries-list.tsx`
  - `audio-player.tsx`

### 3. Database & API
- ✅ Updated Prisma schema to include `avatarUrl` field
- ✅ Created migration for avatar URL and locale support
- ✅ Updated API endpoints to handle locale preferences

---

## 🐛 Known Issues & Bugs

### Critical Issues

#### 1. Avatar Display Broken
**Status:** 🔴 Critical  
**Description:** Avatar image is not displaying correctly. Shows "2 issues" and JavaScript/Supabase errors in console.

**Steps to Reproduce:**
1. Log in to dashboard
2. View profile section
3. Avatar shows error or broken image

**Expected Behavior:** Avatar should display correctly if `avatarUrl` is set in profile.

**Investigation Needed:**
- Check browser console for JavaScript errors
- Verify Supabase Storage bucket configuration
- Check if signed URLs are being generated correctly
- Verify CORS settings for Supabase Storage

---

#### 2. Audio Playback Failing
**Status:** 🔴 Critical  
**Description:** When clicking "Play" on audio entries, shows error "Failed to play audio".

**Steps to Reproduce:**
1. Log in to dashboard
2. Find an audio entry in "My Entries"
3. Click "Play" button
4. Error message appears: "Failed to play audio"

**Expected Behavior:** Audio should play when clicking Play button.

**Investigation Needed:**
- Check browser console for errors
- Verify API endpoint `/api/journal/audio/[id]` is working
- Check if signed URLs are being generated correctly
- Verify audio file format compatibility
- Check CORS settings for Supabase Storage
- Verify audio file exists in Supabase Storage bucket

---

### UX/UI Issues

#### 3. Language Switcher UX
**Status:** 🟡 Medium Priority  
**Description:** Language switcher shows both languages (English and Русский) simultaneously. Should only show the alternative language option.

**Current Behavior:**
- User sees both "English" and "Русский" buttons
- If user is in English session, they see both buttons

**Expected Behavior:**
- If user is in English session → show only "Русский" button
- If user is in Russian session → show only "English" button
- Modern websites typically use a dropdown or single toggle button

**Research Needed:**
- Research modern language switcher patterns
- Examples: Dropdown with current language + flag icon, single toggle button, etc.
- Consider using icons (flags) instead of text

**Files to Update:**
- `src/components/language-switcher.tsx`

---

#### 4. Navigation Bar Logic Broken
**Status:** 🟡 Medium Priority  
**Description:** Navigation bar shows "Sign in" and "Sign up" buttons even when user is already logged in.

**Current Behavior:**
- User logs in → redirected to dashboard
- Header still shows "Sign in" and "Sign up" buttons
- Should only show "Dashboard", "Sign out", and language switcher

**Expected Behavior:**
- When logged in: Show "Dashboard", "Sign out", language switcher
- When logged out: Show "Sign in", "Sign up", language switcher

**Investigation Needed:**
- Check `src/components/header-nav.tsx` logic
- Verify session detection is working correctly
- Check if session state is being passed correctly to HeaderNav component

**Files to Update:**
- `src/components/header-nav.tsx`

---

#### 5. Modern Navigation Bar Research Needed
**Status:** 🟡 Medium Priority  
**Description:** Need to research and implement modern navigation bar patterns that:
- Properly handle authentication state
- Show appropriate navigation items based on login status
- Integrate language switcher elegantly
- Follow modern UX best practices

**Research Areas:**
- Modern navigation bar patterns (2024-2025)
- Language switcher best practices
- Responsive design considerations
- Accessibility requirements

---

## 📝 Technical Details

### Files Changed
- `src/app/api/journal/audio/[id]/route.ts` - New API endpoint for audio URLs
- `src/app/api/profile/locale/route.ts` - New API endpoint for locale preference
- `src/components/audio-player.tsx` - New audio playback component
- `src/components/language-switcher.tsx` - New language switcher component
- `src/components/journal-entries-list.tsx` - Updated with translations
- `src/i18n/` - i18n configuration and translation files
- `src/middleware.ts` - Locale detection middleware
- `next.config.ts` - Updated with next-intl plugin
- `prisma/schema.prisma` - Updated with locale support

### Dependencies Added
- `next-intl@4.5.1` - Internationalization library

### Database Changes
- Migration: `20251112105749_add_avatar_url_remove_timezone`
- Added `avatarUrl` field to Profile model
- Updated `locale` field validation to accept only "en" | "ru"

---

## 🧪 Testing Checklist

### Audio Playback
- [ ] Record audio successfully
- [ ] Audio appears in "My Entries" list
- [ ] Play button works correctly
- [ ] Pause button works correctly
- [ ] Audio plays without errors
- [ ] Duration displays correctly

### Language Switching
- [ ] Language switcher appears in header
- [ ] Clicking language button switches interface language
- [ ] Language preference saves to profile
- [ ] Language persists after page refresh
- [ ] Only alternative language shows (not current language)

### Navigation Bar
- [ ] Shows correct items when logged in
- [ ] Shows correct items when logged out
- [ ] Language switcher integrated properly
- [ ] Responsive on mobile devices

### Avatar
- [ ] Avatar uploads successfully
- [ ] Avatar displays correctly after upload
- [ ] Avatar persists after page refresh
- [ ] No console errors related to avatar

---

## 🔍 Debugging Steps

### For Audio Playback Issue:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Try to play audio
4. Check for errors:
   - CORS errors
   - Network errors (404, 403, 500)
   - JavaScript errors
5. Go to Network tab
6. Check request to `/api/journal/audio/[id]`
7. Verify response contains valid `url` field
8. Check if URL is accessible

### For Avatar Issue:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Check for Supabase-related errors
4. Check Network tab for avatar image requests
5. Verify Supabase Storage bucket `avatars` exists
6. Check bucket permissions (should be public or have proper RLS)

### For Navigation Bar Issue:
1. Check `src/components/header-nav.tsx`
2. Verify `session` prop is being passed correctly
3. Check if `session?.user` exists when logged in
4. Verify conditional rendering logic

---

## 📚 Research Needed

### Modern Language Switcher Patterns
- [ ] Research current best practices (2024-2025)
- [ ] Look at examples from popular websites
- [ ] Consider accessibility requirements
- [ ] Consider mobile responsiveness
- [ ] Consider icon vs text options

### Modern Navigation Bar Patterns
- [ ] Research authentication-aware navigation patterns
- [ ] Look at examples from modern web apps
- [ ] Consider responsive design
- [ ] Consider accessibility
- [ ] Consider user experience flow

---

## 🎯 Next Steps

1. **Wait for feedback from smart friend** on navigation bar and language switcher design
2. **Fix avatar display issue** - investigate Supabase Storage configuration
3. **Fix audio playback issue** - investigate API endpoint and CORS
4. **Fix language switcher UX** - implement modern pattern (show only alternative)
5. **Fix navigation bar logic** - ensure correct items show based on auth state
6. **Complete translations** - translate remaining components:
   - `new-entry-form.tsx`
   - `audio-recorder.tsx`
   - `profile-form.tsx`
   - `dashboard/page.tsx`
   - Login/Register pages
7. **Test thoroughly** - go through all functionality
8. **Prepare for AI transcription** - add language field to Job model

---

## 📞 Notes for Smart Friend

**Questions:**
1. What is the best modern pattern for language switcher? (Dropdown? Toggle? Icon-based?)
2. What is the best pattern for authentication-aware navigation bar?
3. Any suggestions for fixing Supabase Storage CORS/access issues?
4. Any suggestions for audio playback issues?

**Current Architecture:**
- Next.js 16 with App Router
- NextAuth for authentication
- Supabase for Storage (avatars, audio files)
- Prisma + PostgreSQL for database
- next-intl for internationalization

**Environment:**
- Development: http://localhost:3005
- Production: Railway (currently on `fix/docker-prisma-stub` branch)

---

## 📅 Changelog

### 2025-11-12
- Created feature branch `feature/audio-playback-i18n`
- Implemented audio playback functionality
- Set up i18n infrastructure
- Created language switcher component
- Identified critical bugs (avatar, audio playback)
- Identified UX issues (language switcher, navigation bar)

---

## 🔗 Related Files

- Branch: `feature/audio-playback-i18n`
- Commit: `1f98418` - "feat: add audio playback and i18n support (ru/en)"
- GitHub: https://github.com/filippmiller/echocare/tree/feature/audio-playback-i18n

---

**Last Updated:** 2025-11-12  
**Maintained By:** Development Team  
**Status:** Awaiting feedback and bug fixes

