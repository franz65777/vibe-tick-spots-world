

# Plan: Add City Filter Chips to Profile Posts/Reviews

## Overview
Add horizontally scrollable city filter chips next to the existing posts/reviews dropdown. These chips will show cities where the user has uploaded posts or reviews, with counts. Selecting a chip filters the displayed content to that city only.

## Current State
- The `PostsGrid` component has a dropdown to switch between "Posts" and "Reviews"
- Posts are enriched with location data including `locations.city`
- No city filtering exists currently

## Solution Design

### Visual Design
```text
┌─────────────────────────────────────────────────────┐
│  Posts ▼   │ All │ Dublin (3) │ Paris (1) │ London (2) │
└─────────────────────────────────────────────────────┘
              └──── Horizontally scrollable chips ────┘
```

- **Chips style**: Similar to FilterButtons on the home page
  - Rounded corners (`rounded-xl`)
  - Active state: Blue gradient with shadow
  - Inactive state: Light background with subtle border
- **"All" chip**: Always first, shows total count, selected by default
- **City chips**: Show city name + count in parentheses
- **Scrollable container**: Horizontal scroll for many cities

### Implementation Details

**File: `src/components/profile/PostsGrid.tsx`**

1. **Add state for city filter**
   ```tsx
   const [selectedCity, setSelectedCity] = useState<string | null>(null);
   ```

2. **Extract unique cities from posts**
   - Create a function to get cities with counts from the current filter (photos or reviews)
   - Sort by count descending, then alphabetically

3. **Add city chips UI after the dropdown**
   - Horizontally scrollable container
   - "All" chip first (always visible)
   - City chips dynamically generated

4. **Apply city filter to displayed posts**
   - When `selectedCity` is set, filter `displayedPosts` by `post.locations?.city`

5. **Reset city filter when switching between photos/reviews**
   - Clear `selectedCity` when `postFilter` changes

### Code Changes Summary

```tsx
// 1. New state
const [selectedCity, setSelectedCity] = useState<string | null>(null);

// 2. Extract cities with counts (based on current filter)
const citiesWithCounts = useMemo(() => {
  const basePosts = postFilter === 'photos' ? photoPosts : reviewPosts;
  const cityMap = new Map<string, number>();
  
  basePosts.forEach((post: any) => {
    const city = post.locations?.city;
    if (city) {
      cityMap.set(city, (cityMap.get(city) || 0) + 1);
    }
  });
  
  return Array.from(cityMap.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([city, count]) => ({ city, count }));
}, [photoPosts, reviewPosts, postFilter]);

// 3. Reset city when filter changes
useEffect(() => {
  setSelectedCity(null);
}, [postFilter]);

// 4. Apply city filter
const displayedPosts = useMemo(() => {
  const basePosts = postFilter === 'photos' ? photoPosts : reviewPosts;
  if (!selectedCity) return basePosts;
  return basePosts.filter((post: any) => post.locations?.city === selectedCity);
}, [postFilter, photoPosts, reviewPosts, selectedCity]);
```

### UI Component Structure

```tsx
{/* Filter Dropdown + City Chips Row */}
<div className="sticky top-0 z-20 -mx-4 px-4 mb-4 bg-background">
  <div className="flex items-center gap-3">
    {/* Existing Dropdown */}
    <DropdownMenu>...</DropdownMenu>
    
    {/* City Filter Chips */}
    {citiesWithCounts.length > 0 && (
      <div className="flex-1 overflow-x-auto scrollbar-hide">
        <div className="flex gap-1.5 pb-1">
          {/* All chip */}
          <button
            onClick={() => setSelectedCity(null)}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex-shrink-0",
              !selectedCity
                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            )}
          >
            All
          </button>
          
          {/* City chips */}
          {citiesWithCounts.map(({ city, count }) => (
            <button
              key={city}
              onClick={() => setSelectedCity(city)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex-shrink-0 whitespace-nowrap",
                selectedCity === city
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              )}
            >
              {translateCityName(city, i18n.language)} ({count})
            </button>
          ))}
        </div>
      </div>
    )}
  </div>
</div>
```

## Technical Considerations

1. **Performance**: Uses `useMemo` for efficient recalculation
2. **City translation**: Reuses existing `translateCityName` utility already imported
3. **Responsive**: Horizontal scroll handles many cities gracefully
4. **Consistency**: Matches existing chip patterns from FilterButtons
5. **UX**: "All" chip always visible as first option

## Files to Modify
- `src/components/profile/PostsGrid.tsx` - Add city filter state, logic, and UI

