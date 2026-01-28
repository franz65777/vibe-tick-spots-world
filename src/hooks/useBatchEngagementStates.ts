import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SaveTag } from '@/utils/saveTags';

interface BatchEngagementResult {
  likedPostIds: Set<string>;
  savedLocations: Map<string, SaveTag>;
}

/**
 * Batch fetches engagement states (likes, saves) for all posts in the feed
 * Eliminates N+1 queries by fetching all states in 2 queries total
 */
export const useBatchEngagementStates = (
  postIds: string[],
  locationIds: (string | undefined)[]
) => {
  const { user } = useAuth();

  return useQuery<BatchEngagementResult>({
    queryKey: ['batch-engagement', user?.id, postIds.join(',')],
    queryFn: async () => {
      if (!user?.id || postIds.length === 0) {
        return { likedPostIds: new Set(), savedLocations: new Map() };
      }

      // Filter out undefined location IDs
      const validLocationIds = locationIds.filter((id): id is string => !!id);

      // Batch fetch: 1 query for all likes, 1 query for all saves
      const [likesResult, savesResult] = await Promise.all([
        // All user's likes on these posts
        supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postIds),
        
        // All user's saves for these locations
        validLocationIds.length > 0
          ? supabase
              .from('user_saved_locations')
              .select('location_id, save_tag')
              .eq('user_id', user.id)
              .in('location_id', validLocationIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      // Build Sets/Maps for O(1) lookups
      const likedPostIds = new Set(
        (likesResult.data || []).map(l => l.post_id)
      );
      
      const savedLocations = new Map<string, SaveTag>(
        (savesResult.data || []).map(s => [s.location_id, s.save_tag as SaveTag])
      );

      return { likedPostIds, savedLocations };
    },
    enabled: !!user?.id && postIds.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
  });
};
