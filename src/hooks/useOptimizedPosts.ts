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

      if (error) {
        console.error('Posts query error:', error);
        throw error;
      }
      console.log('Posts loaded for user', userId, ':', data?.length);
      return data || [];
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
  });

  return {
    posts,
    loading: isLoading,
  };
};
