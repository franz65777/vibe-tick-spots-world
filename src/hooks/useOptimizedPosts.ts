import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useOptimizedPosts = (userId?: string) => {
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['posts', userId],
    queryFn: async () => {
      if (!userId) return [];

      // 1) Carica i post dell'utente senza join
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (postError) {
        console.error('Posts query error:', postError);
        throw postError;
      }

      const posts = postData || [];
      if (posts.length === 0) return [];

      // 2) Get post IDs for count queries
      const postIds = posts.map((p: any) => p.id);

      // 3) Carica profilo, locations e conteggi in parallelo
      const locationIds = Array.from(new Set(posts.map((p: any) => p.location_id).filter(Boolean)));
      const [profileRes, locationsRes, likesCountRes, commentsCountRes] = await Promise.all([
        supabase.from('profiles').select('id,username,avatar_url,full_name').eq('id', userId).maybeSingle(),
        locationIds.length
          ? supabase.from('locations').select('id,name,address,city,category,latitude,longitude').in('id', locationIds)
          : Promise.resolve({ data: [], error: null }),
        // Get actual like counts
        supabase
          .from('post_likes')
          .select('post_id')
          .in('post_id', postIds),
        // Get actual comment counts
        supabase
          .from('post_comments')
          .select('post_id')
          .in('post_id', postIds),
      ]);

      if ((locationsRes as any).error) console.warn('Locations load warning (posts):', (locationsRes as any).error);

      const profile = (profileRes as any).data || null;
      const locations = (locationsRes as any).data || [];
      const locationMap = new Map(locations.map((l: any) => [l.id, l]));

      // Count likes per post
      const likesData = (likesCountRes as any).data || [];
      const likesCountMap = new Map<string, number>();
      likesData.forEach((like: any) => {
        likesCountMap.set(like.post_id, (likesCountMap.get(like.post_id) || 0) + 1);
      });

      // Count comments per post
      const commentsData = (commentsCountRes as any).data || [];
      const commentsCountMap = new Map<string, number>();
      commentsData.forEach((comment: any) => {
        commentsCountMap.set(comment.post_id, (commentsCountMap.get(comment.post_id) || 0) + 1);
      });

      const enriched = posts.map((p: any) => ({
        ...p,
        profiles: profile,
        locations: p.location_id ? (locationMap.get(p.location_id) || null) : null,
        // Use actual counts from join tables
        likes_count: likesCountMap.get(p.id) || 0,
        comments_count: commentsCountMap.get(p.id) || 0,
      }));

      console.log('Posts loaded for user', userId, ':', enriched.length);
      return enriched;
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // Consider data stale after 30 seconds
    gcTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  return {
    posts,
    loading: isLoading,
  };
};
