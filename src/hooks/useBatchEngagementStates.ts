import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SaveTag, normalizeSaveTag } from '@/utils/saveTags';

interface BatchEngagementResult {
  likedPostIds: Set<string>;
  savedLocations: Map<string, SaveTag>;
  // For UserVisitedCard - location likes
  likedLocationIds: Set<string>;
  locationLikeCounts: Map<string, number>;
}

/**
 * Batch fetches engagement states (likes, saves) for all posts and visited cards in the feed
 * Eliminates N+1 queries by fetching all states in a few queries total
 */
export const useBatchEngagementStates = (
  postIds: string[],
  locationIds: (string | undefined)[],
  visitedLocationIds: string[] = [] // Additional location IDs from visited cards
) => {
  const { user } = useAuth();
  
  // Combine all location IDs for batch fetching
  const allLocationIds = [...new Set([
    ...locationIds.filter((id): id is string => !!id),
    ...visitedLocationIds
  ])];

  return useQuery<BatchEngagementResult>({
    queryKey: ['batch-engagement', user?.id, postIds.join(','), allLocationIds.join(',')],
    queryFn: async () => {
      if (!user?.id) {
        return { 
          likedPostIds: new Set(), 
          savedLocations: new Map(),
          likedLocationIds: new Set(),
          locationLikeCounts: new Map()
        };
      }

      // Batch fetch: post likes, location saves, location likes, location like counts
      const [postLikesResult, savesResult, locationLikesResult, locationLikeCountsResult] = await Promise.all([
        // All user's likes on these posts
        postIds.length > 0
          ? supabase
              .from('post_likes')
              .select('post_id')
              .eq('user_id', user.id)
              .in('post_id', postIds)
          : Promise.resolve({ data: [], error: null }),
        
        // All user's saves for these locations
        allLocationIds.length > 0
          ? supabase
              .from('user_saved_locations')
              .select('location_id, save_tag')
              .eq('user_id', user.id)
              .in('location_id', allLocationIds)
          : Promise.resolve({ data: [], error: null }),
        
        // All user's location likes (for visited cards)
        allLocationIds.length > 0
          ? supabase
              .from('location_likes')
              .select('location_id')
              .eq('user_id', user.id)
              .in('location_id', allLocationIds)
          : Promise.resolve({ data: [], error: null }),
        
        // Location like counts (for visited cards) - batch count query
        allLocationIds.length > 0
          ? supabase
              .from('location_likes')
              .select('location_id')
              .in('location_id', allLocationIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      // Build Sets/Maps for O(1) lookups
      const likedPostIds = new Set(
        (postLikesResult.data || []).map(l => l.post_id)
      );
      
       // Normalize legacy/invalid save tags (e.g. 'general') so icons render correctly.
       const savedLocations = new Map<string, SaveTag>();
       (savesResult.data || []).forEach((s: any) => {
         const normalized = normalizeSaveTag(s.save_tag);
         if (s.location_id && normalized) savedLocations.set(s.location_id, normalized);
       });
      
      const likedLocationIds = new Set(
        (locationLikesResult.data || []).map(l => l.location_id)
      );
      
      // Count likes per location
      const locationLikeCounts = new Map<string, number>();
      (locationLikeCountsResult.data || []).forEach(l => {
        const count = locationLikeCounts.get(l.location_id) || 0;
        locationLikeCounts.set(l.location_id, count + 1);
      });

      return { likedPostIds, savedLocations, likedLocationIds, locationLikeCounts };
    },
    enabled: !!user?.id && (postIds.length > 0 || allLocationIds.length > 0),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
  });
};
