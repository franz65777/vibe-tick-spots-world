
# Feed Page Improvement Plan

## Current Architecture Overview

The feed page is already well-optimized with several performance features:
- Batch engagement state fetching via `useBatchEngagementStates` (eliminates N+1 queries)
- Centralized realtime via `useRealtimeEvent` (singleton WebSocket)
- React Query caching with appropriate stale times
- Lazy-loaded components (`FeedPostItem`, `CityStatsCard`, carousels)
- Progressive image loading with blur-up effect
- Skeleton UI with shimmer animations
- Scroll position restoration

## Identified Improvements

### 1. Missing Haptic Feedback

**Current State:** Haptics are used in `PostActions.tsx` for like/pin but missing in several key feed interactions.

**Missing Haptic Touchpoints:**
- `UserVisitedCard` - Like button, save button, follow button
- `FeedListsCarousel` - Card tap
- `FeedSuggestionsCarousel` - Card tap, save location
- `FeedPage` - Feed type dropdown toggle, comment/share actions
- Caption expand/collapse toggle

**Implementation:**
```typescript
// UserVisitedCard.tsx - Add to handleLike, handleFollow, handleSaveLocation
import { haptics } from '@/utils/haptics';

const handleLike = async (e: React.MouseEvent) => {
  e.stopPropagation();
  haptics.impact('light'); // Add this
  // ... existing code
};

const handleFollow = async (e: React.MouseEvent) => {
  haptics.selection(); // Add this
  // ... existing code
};

// FeedListsCarousel.tsx - Add to card click
onClick={() => {
  haptics.selection(); // Add this
  window.dispatchEvent(new CustomEvent('feed:open-folder', {...}));
}}

// FeedSuggestionsCarousel.tsx - Add to handleLocationClick and handleSaveLocation
haptics.impact('light'); // On card click
haptics.success(); // On successful save
```

### 2. Double-Tap to Like

**Enhancement:** Instagram-style double-tap to like on post images - native feel on mobile.

**Implementation in `FeedPostItem.tsx`:**
```typescript
// Add state and ref
const lastTapRef = useRef<number>(0);

const handleDoubleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
  const now = Date.now();
  const timeSinceLastTap = now - lastTapRef.current;
  
  if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
    // Double tap detected
    haptics.impact('medium');
    if (!isLiked) {
      // Trigger like with heart animation
      onLike();
    }
    // Show heart animation overlay
    setShowHeartAnimation(true);
    setTimeout(() => setShowHeartAnimation(false), 1000);
  }
  lastTapRef.current = now;
}, [isLiked, onLike]);

// Wrap media in clickable div with double-tap handler
```

### 3. Pull-to-Refresh

**Enhancement:** Add pull-to-refresh gesture for native-like experience.

**Implementation in `FeedPage.tsx`:**
```typescript
import { useCallback, useState } from 'react';

const [isRefreshing, setIsRefreshing] = useState(false);
const pullStartY = useRef<number>(0);

const handleRefresh = useCallback(async () => {
  setIsRefreshing(true);
  haptics.impact('medium');
  
  await queryClient.invalidateQueries({ queryKey: ['feed', user?.id] });
  
  haptics.success();
  setIsRefreshing(false);
}, [queryClient, user?.id]);

// Add touch handlers to scroll container
onTouchStart={(e) => {
  if (scrollContainerRef.current?.scrollTop === 0) {
    pullStartY.current = e.touches[0].clientY;
  }
}}
onTouchMove={(e) => {
  // Track pull distance, show indicator
}}
onTouchEnd={() => {
  if (pullDistance > threshold) handleRefresh();
}}
```

### 4. Feed Type Switcher Haptics

**Enhancement:** Add selection haptics when switching between "For You" and "Promotions".

**Location:** `FeedPage.tsx` dropdown menu items

```typescript
<DropdownMenuItem 
  onClick={() => {
    haptics.selection(); // Add this
    setFeedType('forYou');
  }}
>
```

### 5. Comment Button Haptic Feedback

**Enhancement:** Add haptics when opening comment drawer.

**Location:** `FeedPage.tsx` - `handleCommentClick`

```typescript
const handleCommentClick = async (postId: string) => {
  haptics.impact('light'); // Add this
  setCommentPostId(postId);
  // ... rest
};
```

### 6. Share Button Haptic Feedback

**Location:** `FeedPage.tsx` - `handleShareClick`

```typescript
const handleShareClick = (postId: string) => {
  haptics.impact('light'); // Add this
  setSharePostId(postId);
  setShareModalOpen(true);
};
```

### 7. Caption Toggle Haptic Feedback

**Enhancement:** Subtle selection feedback when expanding/collapsing captions.

**Location:** `FeedPage.tsx` - `toggleCaption`

```typescript
const toggleCaption = (postId: string) => {
  haptics.selection(); // Add this
  setExpandedCaptions(prev => {...});
};
```

### 8. Carousel Card Haptics

**Enhancement:** Add consistent haptics to list and suggestion carousel cards.

**Files:**
- `FeedListsCarousel.tsx` - list card tap
- `FeedSuggestionsCarousel.tsx` - suggestion card tap, save action

### 9. Performance: useSocialEngagement Optimization

**Issue:** `useSocialEngagement` hook makes individual queries per post for like status, comments count, shares count. This partly duplicates the batch fetch.

**Current Flow:**
1. `useBatchEngagementStates` fetches all likes/saves in batch
2. BUT `useSocialEngagement` ALSO fetches counts individually (lines 40-44)

**Optimization:** Pass pre-loaded counts to `useSocialEngagement` to skip redundant queries.

```typescript
// In useSocialEngagement, add option to skip initial fetch
export const useSocialEngagement = (
  postId: string, 
  initialCounts?: { likes?: number; comments?: number; shares?: number },
  options?: { skipInitialFetch?: boolean; initialIsLiked?: boolean }
) => {
  // If skipInitialFetch and we have initial values, use them
  useEffect(() => {
    if (options?.skipInitialFetch && initialCounts) {
      setLikeCount(initialCounts.likes ?? 0);
      setCommentCount(initialCounts.comments ?? 0);
      setShareCount(initialCounts.shares ?? 0);
      if (options.initialIsLiked !== undefined) {
        setIsLiked(options.initialIsLiked);
      }
      setLoading(false);
      return;
    }
    // ... existing fetch logic
  }, [...]);
};
```

This could reduce up to 60 queries to 0 for a 20-post feed.

### 10. Image Preloading for Carousels

**Enhancement:** Preload first 2-3 images in carousels for smoother scrolling.

```typescript
// In FeedListsCarousel and FeedSuggestionsCarousel
useEffect(() => {
  // Preload first 3 card images
  suggestions.slice(0, 3).forEach(s => {
    if (s.image_url) {
      const img = new Image();
      img.src = s.image_url;
    }
  });
}, [suggestions]);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/feed/UserVisitedCard.tsx` | Add haptics to like, follow, save buttons |
| `src/components/feed/FeedListsCarousel.tsx` | Add haptics to card tap |
| `src/components/feed/FeedSuggestionsCarousel.tsx` | Add haptics to card tap and save |
| `src/components/feed/FeedPostItem.tsx` | Add double-tap to like |
| `src/pages/FeedPage.tsx` | Add haptics to dropdown, comment, share, caption toggle |
| `src/hooks/useSocialEngagement.ts` | Add skipInitialFetch option to avoid duplicate queries |

---

## Summary of Benefits

| Improvement | User Impact |
|-------------|-------------|
| Haptic feedback | Native iOS/Android feel on all interactions |
| Double-tap to like | Instagram-like intuitive interaction |
| Pull-to-refresh | Standard mobile gesture support |
| Query optimization | Faster load, reduced network usage |
| Image preloading | Smoother carousel scrolling |

---

## Technical Notes

- All haptic calls are no-ops on web (handled by the `haptics` utility)
- The `useSocialEngagement` optimization is backward compatible
- Double-tap detection uses a 300ms window (standard mobile timing)
- Pull-to-refresh threshold should be ~80-100px
