import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeEvent } from '@/hooks/useCentralizedRealtime';

interface FollowStats {
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

export const useOptimizedFollowStats = (userId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const targetUserId = userId || user?.id;

  const { data: stats, isLoading } = useQuery({
    queryKey: ['followStats', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return { followersCount: 0, followingCount: 0, postsCount: 0 };

      // Parallel count queries - FAST
      const [followersResult, followingResult, profileResult] = await Promise.all([
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', targetUserId),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', targetUserId),
        supabase.from('profiles').select('posts_count').eq('id', targetUserId).maybeSingle(),
      ]);

      return {
        followersCount: followersResult.count || 0,
        followingCount: followingResult.count || 0,
        postsCount: profileResult.data?.posts_count || 0,
      } satisfies FollowStats;
    },
    enabled: !!targetUserId,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
  });

  // Invalidate callback for realtime events
  const invalidateStats = useCallback(() => {
    if (targetUserId) {
      queryClient.invalidateQueries({ queryKey: ['followStats', targetUserId] });
    }
  }, [queryClient, targetUserId]);

  // Use centralized realtime for follow updates - NO individual channel!
  // When someone follows/unfollows the target user
  useRealtimeEvent(['follow_insert', 'follow_delete'], useCallback((payload: any) => {
    // Only invalidate if this event is for the target user
    if (payload.following_id === targetUserId || payload.follower_id === targetUserId) {
      invalidateStats();
    }
  }, [targetUserId, invalidateStats]));

  // When current user follows/unfollows someone (for when viewing own profile)
  useRealtimeEvent(['follow_by_me_insert', 'follow_by_me_delete'], useCallback((payload: any) => {
    if (user?.id === targetUserId) {
      invalidateStats();
    }
  }, [user?.id, targetUserId, invalidateStats]));

  return {
    stats: stats || { followersCount: 0, followingCount: 0, postsCount: 0 },
    loading: isLoading,
  };
};