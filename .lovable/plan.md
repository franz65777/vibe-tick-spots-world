
# Plan: Optimize Lists Loading with Skeleton UI and React Query Caching

## Problem Analysis

The `TripsGrid` component (which shows "Lists" on the profile) is slow because:

1. **No caching**: Uses `useState` + `useEffect` instead of React Query, so data refetches on every mount
2. **Sequential N+1 queries**: The `loadFolders` function makes multiple sequential database calls:
   - 1 query for folders
   - N queries for location counts (one per folder)
   - N queries for folder location IDs
   - N queries for location details (categories, images)
   - Additional queries for saved folders from other users
3. **Blocking spinner**: Shows a full-screen spinner that blocks the UI while loading

## Solution Overview

| Issue | Fix |
|-------|-----|
| No caching | Migrate to `useQuery` from TanStack Query |
| N+1 queries | Batch all count queries with `.in()` filter |
| Blocking UI | Replace spinner with shimmer skeleton that mimics card layout |

## Technical Implementation

### 1. Create Lists Skeleton Component

**New file: `src/components/profile/ListsGridSkeleton.tsx`**

A skeleton that mimics the horizontal scroll rows with card placeholders:

```tsx
import { Skeleton } from '@/components/ui/skeleton';

const ListsGridSkeleton = () => {
  return (
    <div className="px-4 pt-1">
      {/* Row 1: "My Lists" section */}
      <Skeleton className="h-4 w-16 mb-2 rounded" />
      <div className="flex gap-3 overflow-x-hidden pb-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div 
            key={i}
            className="shrink-0 w-36 aspect-[4/5] rounded-2xl bg-muted relative overflow-hidden"
          >
            {/* Shimmer effect */}
            <div 
              className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] 
                         bg-gradient-to-r from-transparent via-foreground/5 to-transparent"
              style={{ animationDelay: `${i * 100}ms` }}
            />
            {/* Bottom text placeholder */}
            <div className="absolute bottom-0 left-0 right-0 p-2 space-y-1">
              <div className="bg-white/20 rounded h-3 w-20" />
              <div className="bg-white/15 rounded h-2 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 2. Create Optimized Folders Hook

**New file: `src/hooks/useOptimizedFolders.ts`**

Uses React Query with:
- Parallel batch queries to eliminate N+1
- 2-minute staleTime for instant re-renders
- Background refetch for freshness

```tsx
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useOptimizedFolders = (userId?: string, isOwnProfile = true) => {
  return useQuery({
    queryKey: ['folders', userId, isOwnProfile],
    queryFn: async () => {
      if (!userId) return { folders: [], savedFolders: [] };

      // 1) Fetch all folders in one query
      let query = supabase.from('saved_folders').select('*').eq('user_id', userId);
      if (!isOwnProfile) query = query.eq('is_private', false);
      
      const { data: folders } = await query.order('created_at', { ascending: false });
      if (!folders?.length) return { folders: [], savedFolders: [] };

      // 2) Batch query for ALL folder location counts
      const folderIds = folders.map(f => f.id);
      const [countsRes, previewLocsRes] = await Promise.all([
        supabase.from('folder_locations')
          .select('folder_id')
          .in('folder_id', folderIds),
        supabase.from('folder_locations')
          .select('folder_id, location_id')
          .in('folder_id', folderIds)
          .limit(100) // reasonable limit for preview images
      ]);

      // Count locations per folder
      const countMap = new Map<string, number>();
      (countsRes.data || []).forEach(fl => {
        countMap.set(fl.folder_id, (countMap.get(fl.folder_id) || 0) + 1);
      });

      // 3) Batch query for location images
      const locationIds = [...new Set((previewLocsRes.data || []).map(fl => fl.location_id))];
      const { data: locations } = locationIds.length 
        ? await supabase.from('locations')
            .select('id, category, image_url')
            .in('id', locationIds)
        : { data: [] };
      
      const locationMap = new Map(locations?.map(l => [l.id, l]) || []);

      // 4) Enrich folders with counts and images
      const enrichedFolders = folders.map(folder => {
        const folderLocs = (previewLocsRes.data || [])
          .filter(fl => fl.folder_id === folder.id);
        const firstLoc = folderLocs[0] ? locationMap.get(folderLocs[0].location_id) : null;
        
        return {
          ...folder,
          locations_count: countMap.get(folder.id) || 0,
          cover_image_url: folder.cover_image_url || firstLoc?.image_url || null,
        };
      });

      return { folders: enrichedFolders, savedFolders: [] };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - shows cached data instantly
    gcTime: 10 * 60 * 1000,   // 10 minutes in memory
    enabled: !!userId,
  });
};
```

### 3. Update TripsGrid Component

**File: `src/components/profile/TripsGrid.tsx`**

Key changes:
- Import new hook and skeleton
- Replace spinner with skeleton UI
- Use optimistic cached data

```tsx
// At top of file
import ListsGridSkeleton from './ListsGridSkeleton';
import { useOptimizedFolders } from '@/hooks/useOptimizedFolders';

// Replace the loading state (lines 201-205)
if (isLoading || foldersLoading) {
  return <ListsGridSkeleton />;
}
```

## Performance Improvements

| Metric | Before | After |
|--------|--------|-------|
| Database queries | 1 + N*3 (up to 12+ queries) | 4 batched queries |
| Initial load | Blocking spinner ~800ms | Skeleton appears <50ms |
| Return visits | Full refetch every time | Instant from cache |
| Perceived speed | Slow due to spinner | Smooth with shimmer animation |

## Files to Create/Modify

1. **Create**: `src/components/profile/ListsGridSkeleton.tsx`
2. **Create**: `src/hooks/useOptimizedFolders.ts`
3. **Modify**: `src/components/profile/TripsGrid.tsx`
   - Replace `loadFolders` with `useOptimizedFolders` hook
   - Replace spinner with skeleton component
