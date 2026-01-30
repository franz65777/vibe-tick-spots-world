
# Reduce Vertical Spacing & Fix iOS-Style Hide-on-Scroll

## Overview
This plan fixes two issues:
1. Too much vertical blank space between the three profile sections (stats cards, tabs, filter bar)
2. The hide-on-scroll for ProfileTabs doesn't work smoothly in iOS style

---

## Issue 1: Reduce Vertical Spacing

### Current Spacing Analysis
Looking at the image, excessive spacing comes from:
- `ProfileHeader`: `pt-1 pb-2` (bottom padding)
- `ProfileTabs`: `px-3 mb-4` (4 units = 16px bottom margin)
- `PostsGrid` sticky filter: `pb-3 pt-2` (top and bottom padding)

### Solution
Reduce padding/margins at each level:

| Component | Current | New |
|-----------|---------|-----|
| ProfileHeader | `pb-2` | `pb-1` |
| ProfileTabs | `mb-4` | `mb-2` |
| PostsGrid sticky filter | `pb-3 pt-2` | `pb-2 pt-1` |

### Files to Modify
- `src/components/profile/ProfileHeader.tsx` - Line 179: `pb-2` → `pb-1`
- `src/components/profile/ProfileTabs.tsx` - Line 27: `mb-4` → `mb-2`
- `src/components/profile/PostsGrid.tsx` - Line 240: `pb-3 pt-2` → `pb-2 pt-1`

---

## Issue 2: Fix iOS-Style Hide-on-Scroll

### Root Cause
The current implementation attaches scroll listeners to wrapper divs defined in `tabsConfig`. However, these divs are placed inside `SwipeableTabContent` which uses a flex layout with `overflow-hidden`. The actual scrollable area is the `PostsGrid` or other tab content's inner container.

The issue is that:
1. The wrapper div with `overflow-y-auto` is there, but scroll events may not propagate correctly
2. The `useScrollHide` hook updates are not smooth because the transition uses CSS properties that cause layout recalculations

### Solution
Create a smoother, more native iOS-like animation by:

1. **Use CSS `will-change` and GPU-accelerated transforms** - Make the hide/show transition smoother
2. **Improve scroll handling** - Add better debouncing and smoother state transitions
3. **Use spring-like easing** - Match iOS's natural deceleration curve

### Technical Changes

**ProfilePage.tsx Animation Container**
Replace the current inline styles with optimized GPU-accelerated animation:

```tsx
<div 
  className={cn(
    "will-change-transform transition-all duration-200",
    tabsHidden ? "opacity-0 -translate-y-full h-0 overflow-hidden" : "opacity-100 translate-y-0"
  )}
  style={{
    transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)', // iOS spring curve
  }}
>
  <ProfileTabs ... />
</div>
```

**useScrollHide.ts Improvements**
1. Add velocity-based hiding (smoother detection)
2. Use smaller delta threshold (2px instead of 5px)
3. Add hysteresis to prevent jitter
4. Debounce state updates

```typescript
// Track velocity for smoother detection
const velocityRef = useRef(0);
const lastTimeRef = useRef(Date.now());

const handleScroll = useCallback(() => {
  const container = scrollContainerRef.current;
  if (!container) return;

  const currentScrollY = container.scrollTop;
  const currentTime = Date.now();
  const timeDelta = currentTime - lastTimeRef.current;
  
  // Calculate velocity (px/ms)
  const velocity = (currentScrollY - lastScrollY.current) / Math.max(timeDelta, 1);
  velocityRef.current = velocity;
  
  // Smoother threshold-based detection
  if (velocity > 0.3 && currentScrollY > threshold) {
    setHidden(true);
  } else if (velocity < -0.2 || currentScrollY < 20) {
    setHidden(false);
  }
  
  lastScrollY.current = currentScrollY;
  lastTimeRef.current = currentTime;
}, [threshold]);
```

### Files to Modify
- `src/hooks/useScrollHide.ts` - Improve scroll detection with velocity
- `src/components/ProfilePage.tsx` - Use GPU-accelerated transitions with iOS easing

---

## Summary of Changes

| File | Change |
|------|--------|
| `ProfileHeader.tsx` | Reduce `pb-2` → `pb-1` |
| `ProfileTabs.tsx` | Reduce `mb-4` → `mb-2` |
| `PostsGrid.tsx` | Reduce sticky filter padding `pb-3 pt-2` → `pb-2 pt-1` |
| `useScrollHide.ts` | Add velocity-based detection for smoother behavior |
| `ProfilePage.tsx` | Use GPU-accelerated transforms with iOS spring curve |
