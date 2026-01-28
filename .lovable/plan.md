
# Intro Video & Home Page Preloading Optimization

## Overview

This plan addresses two key UX improvements:
1. **Instant video playback** - The intro video must play immediately when the app opens, with no loading delay or "start" button
2. **Seamless transition to home** - The home page content must be fully preloaded during video playback so users see zero loading after the video ends

## Current Architecture Analysis

### Video Loading Flow
- `SplashScreen.tsx` imports the video as a static asset (`intro_finale.mp4`)
- Video uses `autoPlay`, `muted`, and `playsInline` attributes
- The video should auto-play, but browser restrictions and asset loading can cause delays

### Home Page Data Dependencies
The following data must be ready when the splash ends:
1. **Authentication state** - Already handled by `AuthContext`, resolves during video
2. **Map locations** - Fetched by `useMapLocations` hook
3. **Stories** - Fetched via coalesced fetcher (`fetchStoriesCoalesced`)
4. **User profile** - For onboarding check (`fetchOnboardingStatus`)
5. **Feed data** - Pre-cached for instant tab switching

### Current Preloading
`SplashScreen.tsx` preloads page **code** via lazy imports but does NOT preload:
- Actual database queries (map pins, stories, etc.)
- Critical images and assets

---

## Implementation Plan

### Task 1: Ensure Video Instant Playback

**File:** `src/components/SplashScreen.tsx`

Changes:
- Add `preload="auto"` attribute to the video element for eager buffering
- Ensure video container has a solid background to prevent flash-of-content
- Add a loading state that shows the app background color until video can play (`onCanPlay`)
- This prevents any visual "loading" indicator or blank screen before video starts

### Task 2: Create Data Preloading Service

**New File:** `src/services/homePagePreloader.ts`

Purpose: Centralized preloading of all home page data during splash screen

Functions:
- `preloadHomePageData(userId)` - Master function that orchestrates all preloads in parallel
- Fetches: onboarding status, stories, user profile, initial map locations, feed data
- Writes results directly to React Query cache using `queryClient.setQueryData()`
- This ensures data is instantly available when `HomePage` mounts

### Task 3: Integrate Preloading into Splash Screen

**File:** `src/components/SplashScreen.tsx`

Changes:
- Import and call `preloadHomePageData()` as soon as splash mounts (parallel with video)
- Track preload completion state alongside video completion
- The splash only completes when BOTH video ends AND data is ready
- Add a fallback timeout (e.g., 5 seconds) to prevent infinite loading if network is slow

### Task 4: Warm the React Query Cache

**File:** `src/lib/queryClient.ts`

Changes:
- Export a utility function to pre-populate cache keys from preloaded data
- Ensure `staleTime` is sufficient so cached data isn't immediately refetched

### Task 5: Preload Video Asset at App Startup

**File:** `src/main.tsx`

Changes:
- Add video preload using `<link rel="preload">` in the document head dynamically
- This starts buffering the video before the React app even mounts
- Alternatively, use `new Audio()` / `fetch()` to warm the browser cache

---

## Technical Details

### Video Preloading Strategy
```text
1. main.tsx loads → injects <link rel="preload" as="video" href="intro.mp4">
2. React mounts → SplashScreen renders with video already cached
3. Video plays instantly (no buffering delay)
```

### Data Preloading Strategy
```text
1. SplashScreen mounts → calls preloadHomePageData(userId)
2. Parallel fetches: stories, locations, profile, feed
3. Results written to queryClient cache
4. When HomePage mounts, useQuery hooks return cached data instantly
```

### Completion Logic
```text
SplashScreen completes when:
- Video has ended (onEnded event)
- minDisplayTime has elapsed (2.5s)
- Data preload is complete (or timeout reached)
```

---

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Video start delay | 200-500ms | 0ms (preloaded) |
| Home page loading spinner | Visible for 1-2s | Never visible |
| Time to interactive | ~3.5s after splash | ~0.1s after splash |

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/services/homePagePreloader.ts` | Create |
| `src/components/SplashScreen.tsx` | Modify |
| `src/main.tsx` | Modify |
| `src/lib/queryClient.ts` | Minor update |

