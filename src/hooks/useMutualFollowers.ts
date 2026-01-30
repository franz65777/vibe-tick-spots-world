import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface MutualFollower {
  id: string;
  username: string;
  avatar_url: string | null;
  savedPlacesCount?: number;
  isFollowing?: boolean;
}

/**
 * Optimized hook for fetching mutual followers with React Query caching.
 * Mutual = people current user follows who also follow the viewed user.
 */
export const useMutualFollowers = (viewedUserId?: string, fetchAll: boolean = false) => {
  const { user: currentUser } = useAuth();

  const query = useQuery<{ mutuals: MutualFollower[]; totalCount: number }>({
    queryKey: ['mutual-followers', viewedUserId, currentUser?.id, fetchAll],
    queryFn: async () => {
      if (!currentUser || !viewedUserId || currentUser.id === viewedUserId) {
        return { mutuals: [], totalCount: 0 };
      }

      // Parallel fetch: followers of viewed user + who current user follows
      const [viewedUserFollowersResult, currentUserFollowsResult] = await Promise.all([
        supabase
          .from('follows')
          .select('follower_id')
          .eq('following_id', viewedUserId),
        supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUser.id),
      ]);

      if (viewedUserFollowersResult.error || currentUserFollowsResult.error) {
        console.error('Error fetching mutual data');
        return { mutuals: [], totalCount: 0 };
      }

      // Find intersection
      const followerIds = new Set(viewedUserFollowersResult.data?.map(f => f.follower_id) || []);
      const followingIds = new Set(currentUserFollowsResult.data?.map(f => f.following_id) || []);
      const mutualIds = Array.from(followingIds).filter(id => followerIds.has(id));

      if (mutualIds.length === 0) {
        return { mutuals: [], totalCount: 0 };
      }

      // Fetch profiles - limit to 3 unless fetchAll
      const idsToFetch = fetchAll ? mutualIds : mutualIds.slice(0, 3);
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', idsToFetch);

      if (profilesError || !profiles) {
        return { mutuals: [], totalCount: mutualIds.length };
      }

      // If fetching all, also get saved places count
      let enrichedProfiles: MutualFollower[] = profiles;
      
      if (fetchAll && profiles.length > 0) {
        const userIds = profiles.map(p => p.id);
        
        const [savedPlacesResult, userSavedLocationsResult] = await Promise.all([
          supabase.from('saved_places').select('user_id').in('user_id', userIds),
          supabase.from('user_saved_locations').select('user_id').in('user_id', userIds),
        ]);

        const savedCounts = new Map<string, number>();
        [...(savedPlacesResult.data || []), ...(userSavedLocationsResult.data || [])].forEach((s: any) => {
          if (s.user_id) {
            savedCounts.set(s.user_id, (savedCounts.get(s.user_id) || 0) + 1);
          }
        });

        enrichedProfiles = profiles.map(p => ({
          ...p,
          savedPlacesCount: savedCounts.get(p.id) || 0,
          isFollowing: true, // They're mutual, so current user follows them
        }));
      }

      return { mutuals: enrichedProfiles, totalCount: mutualIds.length };
    },
    enabled: !!viewedUserId && !!currentUser && currentUser.id !== viewedUserId,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    gcTime: 5 * 60 * 1000,
  });

  return {
    mutualFollowers: query.data?.mutuals || [],
    totalCount: query.data?.totalCount || 0,
    loading: query.isLoading,
  };
};
