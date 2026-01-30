
# Logo Animation & Feed UI Integration Plan

## Overview
This plan addresses two issues:
1. The search bar branding logo slides too quickly (currently 2.5s, needs to be slower)
2. Posts and reviews in the feed have stark white backgrounds that clash with the warm frosted glass aesthetic (`#F5F1EA`)

---

## Change 1: Slower Logo Animation

**Current State:**
- Animation duration: 2500ms (2.5 seconds)
- Initial delay: 500ms

**New State:**
- Animation duration: 4000ms (4 seconds) — 60% slower, creating a more elegant reveal
- Initial delay: 800ms — slightly longer pause before slide begins

**File:** `src/components/home/SearchDrawer.tsx`

---

## Change 2: Integrated Feed Post Styling

The goal is to make posts feel like they belong on the frosted glass background rather than floating on stark white cards.

### Option A: Glassmorphism Card Style (Recommended)
Transform post cards to use semi-transparent backgrounds with subtle borders, matching the `UserVisitedCard` which already uses:
```
bg-white/60 dark:bg-white/10 backdrop-blur-md 
border border-white/40 dark:border-white/20 
rounded-xl shadow-lg shadow-black/5
```

This creates a cohesive "floating glass" aesthetic across the entire feed.

### Visual Comparison

| Current | Proposed |
|---------|----------|
| Solid white `bg-background` | Semi-transparent `bg-white/70 dark:bg-white/10` |
| No blur effect | `backdrop-blur-sm` for subtle depth |
| Sharp contrast with page | Soft border `border-white/40` |
| No rounding | Rounded corners `rounded-2xl` with shadow |

### Files to Modify

**1. FeedPostItem.tsx** (main feed posts)
- Change `bg-background` to glassmorphism styling
- Add subtle margin for card separation
- Add rounded corners and soft shadow

**2. FeedPostSkeleton.tsx** (loading state)
- Match the glassmorphism styling of actual posts
- Keep shimmer animation intact

**3. FeedListsCarousel.tsx** (Lists section)
- Add subtle section background using glassmorphism card wrapper
- Creates visual separation while maintaining the frosted aesthetic

---

## Technical Implementation

### FeedPostItem Changes
```tsx
// Before (line 287)
className="post-compact bg-background"

// After
className="post-compact bg-white/70 dark:bg-zinc-900/70 
           backdrop-blur-sm mx-4 my-3 rounded-2xl 
           border border-white/40 dark:border-white/20 
           shadow-sm overflow-hidden"
```

### FeedPostSkeleton Changes
```tsx
// Match the glassmorphism styling
<article className="post-compact bg-white/70 dark:bg-zinc-900/70 
                    backdrop-blur-sm mx-4 my-3 rounded-2xl 
                    border border-white/40 dark:border-white/20 
                    shadow-sm overflow-hidden">
```

### FeedListsCarousel Section Wrapper
```tsx
// Wrap in a glassmorphism container
<div className="mx-4 my-3 py-4 bg-white/60 dark:bg-zinc-900/60 
                backdrop-blur-sm rounded-2xl 
                border border-white/40 dark:border-white/20">
  {/* Existing content */}
</div>
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `SearchDrawer.tsx` | Increase animation duration from 2500ms → 4000ms, delay from 500ms → 800ms |
| `FeedPostItem.tsx` | Replace `bg-background` with glassmorphism card styling |
| `FeedPostSkeleton.tsx` | Match glassmorphism styling for loading states |
| `FeedListsCarousel.tsx` | Wrap section in glassmorphism container for visual cohesion |

---

## Visual Result
- Posts will appear as floating glass cards on the warm frosted background
- Consistent aesthetic with `UserVisitedCard` which already uses this style
- The "Liste per te" section will have a subtle glass container
- Logo animation will feel more elegant and deliberate
