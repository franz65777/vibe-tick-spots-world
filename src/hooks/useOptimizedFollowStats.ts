import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

  // Realtime: invalidate counts as soon as follows rows change for this user
  useEffect(() => {
    if (!targetUserId) return;

    const channel = supabase
      .channel(`follow-stats-${targetUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'follows', filter: `following_id=eq.${targetUserId}` },
        () => queryClient.invalidateQueries({ queryKey: ['followStats', targetUserId] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'follows', filter: `follower_id=eq.${targetUserId}` },
        () => queryClient.invalidateQueries({ queryKey: ['followStats', targetUserId] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, targetUserId]);

  return {
    stats: stats || { followersCount: 0, followingCount: 0, postsCount: 0 },
    loading: isLoading,
  };
};
