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

      // 2) Carica profilo e locations in parallelo
      const locationIds = Array.from(new Set(posts.map((p: any) => p.location_id).filter(Boolean)));
      const [profileRes, locationsRes] = await Promise.all([
        supabase.from('profiles').select('id,username,avatar_url,full_name').eq('id', userId).maybeSingle(),
        locationIds.length
          ? supabase.from('locations').select('id,name,address,city,latitude,longitude').in('id', locationIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if ((locationsRes as any).error) console.warn('Locations load warning (posts):', (locationsRes as any).error);

      const profile = (profileRes as any).data || null;
      const locations = (locationsRes as any).data || [];
      const locationMap = new Map(locations.map((l: any) => [l.id, l]));

      const enriched = posts.map((p: any) => ({
        ...p,
        profiles: profile,
        locations: p.location_id ? (locationMap.get(p.location_id) || null) : null,
      }));

      console.log('Posts loaded for user', userId, ':', enriched.length);
      return enriched;
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
