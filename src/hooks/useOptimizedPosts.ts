import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useOptimizedPosts = (userId?: string) => {
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['posts', userId],
    queryFn: async () => {
      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_user_id_fkey (
            username,
            avatar_url,
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: true,
    staleTime: 3 * 60 * 1000, // 3 minuti
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
  });

  return {
    posts,
    loading: isLoading,
  };
};
