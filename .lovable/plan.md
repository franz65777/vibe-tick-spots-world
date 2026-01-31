
# Plan: Improve Review Cards UI

## Overview
Based on analyzing the current review card implementation in `PostsGrid.tsx`, I've identified several opportunities to make the cards more visually engaging and informative. The current design is functional but lacks visual richness and could better leverage the data available.

## Current State
The review cards currently show:
- 56px location thumbnail
- Location name and city
- Color-coded rating badge
- Caption text
- Delete button (for own profile)

## Proposed Enhancements

### 1. Add Media Preview (if photos exist)
When a review has attached photos, show a small thumbnail stack in the corner of the card to indicate there's more content to explore.

```text
+-----------------------------------+
|  [Location]   Location Name   9.2 |
|  [Thumbnail]  City              |
|                                   |
|  "Great margaritas..."   [photo] |
|                                   |
|  ♥ 1   💬 0   ↗ 0     📌   [date]|
+-----------------------------------+
```

### 2. Add Social Engagement Bar
Include like, comment, and share counts similar to feed posts. This adds visual weight and shows social proof.

### 3. Add "Verified Visit" Badge
If the user has multiple reviews at the same location (indicated by `reviewOrder[post.id] > 1`), show a more prominent "regular visitor" badge.

### 4. Add Time Context
Show relative time ("2 weeks ago") more prominently to give temporal context.

### 5. Add Category Tags
Show small category tags (e.g., "Italian", "Cocktails") based on the location type to add visual interest.

### 6. Visual Polish
- Add subtle gradient overlay on photo preview
- Add micro-interactions (slight scale on tap)
- Add stacked photo effect when multiple images exist
- Use glassmorphism for the action bar

## Technical Details

### Files to Modify
1. **`src/components/profile/PostsGrid.tsx`** - Update review card layout (lines 380-570)

### Implementation Approach

**a) Enhanced Card Layout:**
```tsx
<div className="relative bg-gradient-to-br from-white to-gray-50/80 ...">
  {/* Media Preview Stack (if has photos) */}
  {hasMedia && (
    <div className="absolute right-3 bottom-12 ..." onClick={() => handlePostClick(post.id)}>
      {/* Stacked photo thumbnails */}
    </div>
  )}
  
  {/* Main Content */}
  <div className="flex items-start gap-3">
    {/* Location Thumbnail */}
    {/* Location Info + Rating */}
    {/* Caption */}
  </div>
  
  {/* Engagement Bar (new) */}
  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/30">
    <span className="flex items-center gap-1 text-xs">
      <Heart className="w-3.5 h-3.5" /> {post.likes_count}
    </span>
    <span className="flex items-center gap-1 text-xs">
      <MessageCircle className="w-3.5 h-3.5" /> {post.comments_count}
    </span>
    <span className="ml-auto text-xs text-muted-foreground">
      {formatRelativeDate(post.created_at)}
    </span>
  </div>
</div>
```

**b) Media Preview Component:**
- Show stacked thumbnails (max 2-3 visible)
- Add count badge if more than 3 photos
- Glassmorphism border effect

**c) Relative Date Formatting:**
- Use existing `formatPostDate` utility
- Position prominently in footer

### Design Decisions
- Keep the gradient card background (already premium)
- Add subtle border-t for visual separation
- Use consistent icon sizes (3.5-4px for engagement icons)
- Maintain the existing color-coded rating system

## Summary
These changes will transform the review cards from simple text blocks into rich, social-proof-driven content cards that encourage exploration and engagement.
