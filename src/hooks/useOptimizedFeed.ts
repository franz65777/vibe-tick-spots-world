import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useOptimizedFeed = () => {
  const { user } = useAuth();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['feed', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Ottieni post da utenti seguiti + propri post
      const { data: followingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = followingData?.map(f => f.following_id) || [];
      const userIds = [...followingIds, user.id];

      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_user_id_fkey (
            username,
            avatar_url,
            full_name,
            id
          ),
          locations (
            id,
            name,
            address,
            city
          )
        `)
        .in('user_id', userIds)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minuti
    gcTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });

  return {
    posts,
    loading: isLoading,
  };
};
