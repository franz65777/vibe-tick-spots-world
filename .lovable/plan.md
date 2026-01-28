

# Map Loading Optimization & Animation UI Improvement

## Issues Identified

### 1. Blank Screen After Video

**Root Cause Analysis:**
The console log shows `⏰ Preloader: Timeout reached, proceeding anyway` - meaning:
- The preloader is hitting its 5-second timeout
- Data isn't fully cached when splash ends
- The map component (`HomeMapContainer`) is **lazy-loaded** which adds additional loading time
- The map tiles themselves need time to render

**Current Flow:**
```
Video ends → SplashScreen unmounts → Index renders HomePage → 
HomePage lazy-loads HomeMapContainer → Map initializes → Tiles load
```

This creates a visible gap.

### 2. Animation Needs Polish

The current "falling from sky" animation works but needs refinement:
- Scale transition from 2.5x to 1x is good
- The bounce at the end could be more pronounced
- Adding a subtle blur effect during descent would enhance the "perspective" illusion
- The shadow timing could sync better with the landing

---

## Implementation Plan

### Task 1: Eliminate Map Loading Delay

**Goal:** Ensure map is ready to render the instant splash ends.

**Changes:**

**1. Remove Lazy Loading for Map (`src/components/HomePage.tsx`)**
- Change `HomeMapContainer` from lazy import to eager import
- The map is always needed immediately - lazy loading adds unnecessary delay

**2. Pre-initialize Map During Splash (`src/services/homePagePreloader.ts`)**
- Add prefetch hint for map tiles URL
- Trigger Leaflet CSS preload

**3. Optimize Splash Completion Logic (`src/components/SplashScreen.tsx`)**
- Reduce timeout from 5s to 3s (data should load faster)
- Add a "ready gate" that ensures minimum preload conditions are met
- Consider proceeding even if only essential data (stories, profile) is loaded

### Task 2: Improve Drop-in Animation

**Goal:** Create a more polished "falling from the sky" effect.

**Changes (`src/utils/leafletMarkerCreator.ts`):**

**1. Enhanced Scale Animation**
- Start larger (3x instead of 2.5x) for more dramatic entrance
- Add blur effect at start that clears as marker "lands"
- More pronounced bounce at landing

**2. Better Timing Curve**
- Use physics-based easing for natural falling motion
- Faster descent, slower landing

**3. Landing Effects**
- More visible shadow that appears as marker approaches ground
- Subtle "ripple" or pulse effect on landing

**New Keyframes Concept:**
```css
@keyframes user-drop-in {
  0% {
    transform: scale(3) translateY(-30px);
    opacity: 0;
    filter: blur(4px);
  }
  15% {
    opacity: 1;
    filter: blur(2px);
  }
  50% {
    transform: scale(1.5) translateY(0);
    filter: blur(0);
  }
  75% {
    transform: scale(0.9) translateY(5px);
  }
  90% {
    transform: scale(1.05) translateY(-2px);
  }
  100% {
    transform: scale(1) translateY(0);
  }
}
```

### Task 3: Add Transitional Loading State

**Goal:** If any loading is still needed, show a graceful transition instead of blank screen.

**Changes (`src/components/HomePage.tsx`):**

- Add a brief "map skeleton" that shows instantly
- Use CSS animation to fade from skeleton to actual map
- This ensures something is always visible

---

## Technical Summary

| Issue | Solution | File(s) |
|-------|----------|---------|
| Map lazy loading adds delay | Remove lazy import for HomeMapContainer | `HomePage.tsx` |
| Preloader timeout too long | Reduce to 3s, prioritize critical data | `SplashScreen.tsx`, `homePagePreloader.ts` |
| Animation not dramatic enough | Enhanced scale/blur/bounce keyframes | `leafletMarkerCreator.ts` |
| Blank screen flash | Add instant map skeleton/transition | `HomePage.tsx` or `MapSection.tsx` |

---

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Blank screen duration | 1-2 seconds | 0 seconds (skeleton visible instantly) |
| Map visible after splash | ~1.5s delay | <0.3s (eager loaded) |
| Animation impact | Subtle | Dramatic with blur + bounce |

