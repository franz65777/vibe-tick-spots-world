import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FollowUser {
  id: string;
  username: string;
  avatar_url: string | null;
  isFollowing: boolean;
  savedPlacesCount: number;
  isPrivate: boolean;
  followRequestPending: boolean;
}

/**
 * Optimized hook for fetching followers/following lists with React Query caching.
 * Parallelizes all queries for maximum performance.
 */
export const useFollowList = (
  userId: string | undefined,
  type: 'followers' | 'following',
  enabled: boolean = true
) => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery<FollowUser[]>({
    queryKey: ['follow-list', userId, type],
    queryFn: async () => {
      if (!userId) return [];

      // 1. Fetch follow relationships first (simple query, no join issues)
      const targetColumn = type === 'followers' ? 'follower_id' : 'following_id';
      const filterColumn = type === 'followers' ? 'following_id' : 'follower_id';
      
      const { data: followData, error: followError } = await supabase
        .from('follows')
        .select(targetColumn)
        .eq(filterColumn, userId);

      if (followError) {
        console.error('Error fetching follow relationships:', followError);
        return [];
      }

      const userIds = (followData || []).map((f: any) => f[targetColumn]).filter(Boolean);
      if (userIds.length === 0) return [];

      // 2. Fetch profiles for those user IDs separately (more reliable than join)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return [];
      }

      const users = (profilesData || []).filter(Boolean);
      if (users.length === 0) return [];

      // 2. Parallel fetch: saved places counts + following status + privacy + pending requests
      const [savedPlacesResult, userSavedLocsResult, followingStatusResult, privacyResult, pendingRequestsResult] = await Promise.all([
        supabase.from('saved_places').select('user_id').in('user_id', userIds),
        supabase.from('user_saved_locations').select('user_id').in('user_id', userIds),
        currentUser 
          ? supabase
              .from('follows')
              .select('following_id')
              .eq('follower_id', currentUser.id)
              .in('following_id', userIds)
          : Promise.resolve({ data: [] }),
        supabase
          .from('user_privacy_settings')
          .select('user_id, is_private')
          .in('user_id', userIds),
        currentUser
          ? supabase
              .from('friend_requests')
              .select('requested_id')
              .eq('requester_id', currentUser.id)
              .eq('status', 'pending')
              .in('requested_id', userIds)
          : Promise.resolve({ data: [] }),
      ]);

      // Count saved places per user
      const savedCounts = new Map<string, number>();
      [...(savedPlacesResult.data || []), ...(userSavedLocsResult.data || [])].forEach((s: any) => {
        if (s.user_id) {
          savedCounts.set(s.user_id, (savedCounts.get(s.user_id) || 0) + 1);
        }
      });

      // Following status set for O(1) lookups
      const followingSet = new Set(
        (followingStatusResult.data || []).map((f: any) => f.following_id)
      );

      // Privacy status map
      const privacyMap = new Map<string, boolean>();
      (privacyResult.data || []).forEach((p: any) => {
        privacyMap.set(p.user_id, p.is_private ?? false);
      });

      // Pending requests set
      const pendingRequestsSet = new Set(
        (pendingRequestsResult.data || []).map((r: any) => r.requested_id)
      );

      return users.map((u: any) => ({
        id: u.id,
        username: u.username || 'User',
        avatar_url: u.avatar_url,
        isFollowing: followingSet.has(u.id),
        savedPlacesCount: savedCounts.get(u.id) || 0,
        isPrivate: privacyMap.get(u.id) ?? false,
        followRequestPending: pendingRequestsSet.has(u.id),
      }));
    },
    enabled: enabled && !!userId,
    staleTime: 60 * 1000, // 1 minute - show cached data immediately
    gcTime: 5 * 60 * 1000, // 5 minutes - keep in memory
  });

  // Optimistic update helpers
  const updateFollowStatus = (targetId: string, isFollowing: boolean) => {
    queryClient.setQueryData<FollowUser[]>(
      ['follow-list', userId, type],
      (old) => old?.map(u => u.id === targetId ? { ...u, isFollowing } : u)
    );
  };

  const removeUser = (targetId: string) => {
    queryClient.setQueryData<FollowUser[]>(
      ['follow-list', userId, type],
      (old) => old?.filter(u => u.id !== targetId)
    );
  };

  return {
    ...query,
    updateFollowStatus,
    removeUser,
  };
};

/**
 * Prefetch follow list data before modal opens for instant loading
 */
export const prefetchFollowList = (
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
  type: 'followers' | 'following'
) => {
  return queryClient.prefetchQuery({
    queryKey: ['follow-list', userId, type],
    staleTime: 60 * 1000,
  });
};
