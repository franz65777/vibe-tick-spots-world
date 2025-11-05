import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface FollowStats {
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

export const useOptimizedFollowStats = (userId?: string) => {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  const { data: stats, isLoading } = useQuery({
    queryKey: ['followStats', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return { followersCount: 0, followingCount: 0, postsCount: 0 };

      // Parallel count queries - FAST
      const [followersResult, followingResult, profileResult] = await Promise.all([
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', targetUserId),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', targetUserId),
        supabase.from('profiles').select('posts_count').eq('id', targetUserId).maybeSingle()
      ]);

      const newStats: FollowStats = {
        followersCount: followersResult.count || 0,
        followingCount: followingResult.count || 0,
        postsCount: profileResult.data?.posts_count || 0
      };

      console.log('Follow stats loaded:', newStats);
      return newStats;
    },
    enabled: !!targetUserId,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
  });

  return {
    stats: stats || { followersCount: 0, followingCount: 0, postsCount: 0 },
    loading: isLoading,
  };
};
