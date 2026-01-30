

# Plan: iOS-Style Swipe Navigation Between Profile Tabs

## Overview

Implement a smooth iOS-like horizontal swipe gesture to navigate between the 4 profile tabs (Posts, Trips/Lists, Badges, Tagged). The swipe will allow users to slide their finger left/right to move between tabs with visual feedback and animation.

## Challenge: Conflicts with Horizontal Scroll

The **Trips/Lists tab** contains horizontal scrolling carousels for "My Lists" and "Saved Lists". We need to prevent conflicts between:
- Tab swipe navigation (swipe left/right to change tabs)
- Card carousel scroll (swipe left/right to see more cards)

**Solution**: Use edge-based detection - only trigger tab swipe when:
1. Touch starts outside of horizontal scroll areas, OR
2. Touch starts from screen edges (leftmost 30px or rightmost 30px), OR
3. Vertical content is not scrollable horizontally at touch point

## Technical Implementation

### 1. Create `useSwipeTabs` Hook

**New file: `src/hooks/useSwipeTabs.ts`**

A custom hook that:
- Detects horizontal swipe gestures on the tab content area
- Returns current transform offset for visual feedback during swipe
- Calls `onTabChange` when swipe threshold is met
- Respects horizontal scroll containers by checking if the touch target or its parents have `overflow-x: auto/scroll`

```tsx
interface UseSwipeTabsOptions {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  enabled?: boolean;
  threshold?: number; // percentage of screen width (default 0.25 = 25%)
}

// Returns
interface UseSwipeTabsReturn {
  containerRef: React.RefObject<HTMLDivElement>;
  offset: number;        // Current drag offset in pixels
  isSwiping: boolean;    // Whether user is actively swiping
  direction: 'left' | 'right' | null;
}
```

Key logic:
- On `touchstart`: Record start position, check if target is inside scrollable container
- On `touchmove`: Calculate delta, skip if inside scrollable container that can scroll in swipe direction
- On `touchend`: If delta exceeds threshold (25% screen width), change tab; otherwise spring back
- CSS transform is applied for 60fps animation during drag

### 2. Create `SwipeableTabContent` Component

**New file: `src/components/common/SwipeableTabContent.tsx`**

A wrapper component that:
- Renders all 4 tab contents side-by-side (off-screen until active)
- Applies CSS transform based on active tab index
- Shows smooth spring animation on tab change
- Handles swipe gesture via `useSwipeTabs`

```tsx
interface SwipeableTabContentProps {
  tabs: { key: string; content: React.ReactNode }[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  enabled?: boolean;
}
```

Structure:
```text
┌─────────────────────────────────────────────────────────┐
│ Container (overflow: hidden)                            │
│ ┌─────────┬─────────┬─────────┬─────────┐              │
│ │  Posts  │  Trips  │ Badges  │ Tagged  │ ← Inner flex │
│ │  (100%) │  (100%) │  (100%) │  (100%) │   container  │
│ └─────────┴─────────┴─────────┴─────────┘              │
│         ← CSS translateX based on activeTab            │
└─────────────────────────────────────────────────────────┘
```

### 3. Update ProfilePage.tsx

Modify the tab content rendering to use the new swipeable wrapper:

**Before (current):**
```tsx
<div className="flex-1 min-h-0 overflow-hidden">
  {renderTabContent()}
</div>
```

**After:**
```tsx
<SwipeableTabContent
  tabs={[
    { key: 'posts', content: <PostsGrid /> },
    { key: 'trips', content: <TripsGrid /> },
    { key: 'badges', content: <Achievements userId={user?.id} /> },
    { key: 'tagged', content: <TaggedPostsGrid /> },
  ]}
  activeTab={activeTab}
  onTabChange={setActiveTab}
  enabled={isMobile}
/>
```

### 4. Handle Horizontal Scroll Conflict

The `useSwipeTabs` hook will include smart detection:

```tsx
const isInsideHorizontalScroll = (element: HTMLElement): boolean => {
  let current: HTMLElement | null = element;
  while (current) {
    const style = window.getComputedStyle(current);
    const overflowX = style.overflowX;
    if (overflowX === 'auto' || overflowX === 'scroll') {
      // Check if this element can actually scroll
      if (current.scrollWidth > current.clientWidth) {
        return true;
      }
    }
    current = current.parentElement;
  }
  return false;
};

// In touchmove handler:
if (isInsideHorizontalScroll(e.target as HTMLElement)) {
  // Check scroll position - only allow tab swipe if at edge of scrollable content
  const scrollContainer = findScrollableParent(e.target);
  if (scrollContainer) {
    const atLeftEdge = scrollContainer.scrollLeft === 0;
    const atRightEdge = scrollContainer.scrollLeft >= 
      scrollContainer.scrollWidth - scrollContainer.clientWidth - 1;
    
    // Only allow tab swipe if trying to swipe "past" the edge
    if (deltaX > 0 && !atLeftEdge) return; // swiping right but not at left edge
    if (deltaX < 0 && !atRightEdge) return; // swiping left but not at right edge
  }
}
```

This means:
- If you're in the Lists tab and swipe on the cards, it scrolls the cards
- If you're at the **end** of the card list and swipe left again, it goes to Badges tab
- If you're at the **start** of the card list and swipe right, it goes to Posts tab

## Visual Feedback

During swipe:
- Content follows finger with slight resistance (0.5x movement for "rubberband" feel)
- Adjacent tab content partially visible during drag
- On release: spring animation to final position (300ms, ease-out-cubic)

## Performance Considerations

1. **Lazy rendering preserved**: Tab contents still use `lazy()` and `Suspense`
2. **GPU acceleration**: Use `transform: translateX()` for 60fps animations
3. **Will-change hint**: Apply `will-change: transform` during swipe only
4. **Passive listeners**: Use passive touch listeners where possible

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/useSwipeTabs.ts` | Create | Swipe gesture detection hook |
| `src/components/common/SwipeableTabContent.tsx` | Create | Wrapper for swipeable tabs |
| `src/components/ProfilePage.tsx` | Modify | Integrate swipeable wrapper |

## Summary

This implementation provides:
- Smooth iOS-style swipe between tabs
- Smart conflict resolution with horizontal scroll containers
- Visual feedback during gesture
- Spring animation on release
- Mobile-only activation (desktop uses tab clicks)

