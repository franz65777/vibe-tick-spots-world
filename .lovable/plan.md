

# Plan: Fix Dropdown, Divider, and Bottom Spacing Issues

## Issue Analysis

### Issue 1: Dropdown Icon Lag and Background
The dropdown currently:
- Uses `<img>` tags that load lazily, causing icons to flicker
- Has a transparent/blurry background (`bg-muted/10 backdrop-blur-md`) that looks unfinished

**Solution**: 
- Preload the icon images at module level (already imported but need to ensure they're ready)
- Use a solid white background with proper shadow for the dropdown

### Issue 2: Sharp Divider Line
The current header area with dropdown and pills has no visual separator from the content below. The user wants a **rounded divider line** that integrates better.

**Solution**: 
- Add a subtle rounded divider below the filter row using a rounded-full element with low height

### Issue 3: Posts Scroll Too Far Up (Bottom Spacing)
Looking at the code:
- `ProfilePage.tsx` line 142: `pb-[calc(5.5rem+env(safe-area-inset-bottom))]` - this is the parent container padding
- But the `loadMoreRef` div only has `py-4` which doesn't create enough bottom spacing

The posts can scroll too far up, leaving excessive space between content and the bottom navigation bar.

**Solution**:
- The parent already has the correct padding. The issue is the `loadMoreRef` trigger element position
- Remove duplicate bottom padding from PostsGrid and rely on parent container
- Add overscroll-behavior to prevent over-scrolling

---

## Technical Implementation

### File: `src/components/profile/PostsGrid.tsx`

#### 1. Dropdown Improvements (lines 244-272)

**Current**:
```tsx
<DropdownMenuContent align="start" className="w-48 bg-background z-50 rounded-lg">
```

**Change to**:
```tsx
<DropdownMenuContent 
  align="start" 
  className="w-48 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-xl z-50 rounded-xl overflow-hidden"
>
```

Also add `loading="eager"` and proper sizing to ensure icons are always ready:
```tsx
<img src={cameraIcon3d} alt="" className="w-6 h-6 object-contain" loading="eager" />
<img src={starIcon3d} alt="" className="w-6 h-6 object-contain" loading="eager" />
```

Increase padding on menu items:
```tsx
<DropdownMenuItem className="cursor-pointer focus:bg-accent flex items-center gap-3 px-3 py-2.5">
```

#### 2. Rounded Divider (after line 314, after the filter row)

Add a soft rounded divider line:
```tsx
{/* Soft rounded divider */}
<div className="flex justify-center pt-3 pb-2">
  <div className="w-12 h-1 bg-gray-200/60 dark:bg-gray-700/60 rounded-full" />
</div>
```

#### 3. Bottom Scroll Stop Fix

The parent container in `ProfilePage.tsx` already has:
```tsx
<div className="h-full overflow-y-auto pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
```

The issue is that `PostsGrid` has its own bottom padding in the `loadMoreRef`. We need to adjust the scroll behavior:

**In PostsGrid.tsx**, update the wrapper to respect scroll boundaries:
```tsx
<div className="px-4 overscroll-contain">
```

And move the infinite scroll trigger to be minimal:
```tsx
<div ref={loadMoreRef} className="h-4 flex items-center justify-center">
```

---

## Summary of Changes

| Location | Change |
|----------|--------|
| Lines 257 | Solid white dropdown background with shadow and rounded-xl |
| Lines 260-270 | Larger icons (w-6 h-6), eager loading, more padding on items |
| After line 314 | New rounded divider element |
| Line 239 | Add `overscroll-contain` to prevent over-scrolling |
| Line 541 | Reduce loadMoreRef padding to `h-4` (minimal trigger height) |

---

## Files to Modify
- `src/components/profile/PostsGrid.tsx`

