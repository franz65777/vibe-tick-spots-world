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
      const userIds = Array.from(new Set([...followingIds, user.id]));

      // 1) Prendi i post senza join (evita errori di relazione)
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('*')
        .in('user_id', userIds)
        .order('created_at', { ascending: false })
        .limit(50);

      if (postError) {
        console.error('Feed posts error:', postError);
        throw postError;
      }

      const posts = postData || [];
      if (posts.length === 0) return [];

      // 2) Carica profili e locations in parallelo
      const profileIds = Array.from(new Set(posts.map((p: any) => p.user_id).filter(Boolean)));
      const locationIds = Array.from(new Set(posts.map((p: any) => p.location_id).filter(Boolean)));

      const [profilesRes, locationsRes] = await Promise.all([
        profileIds.length
          ? supabase.from('profiles').select('id,username,avatar_url,full_name').in('id', profileIds)
          : Promise.resolve({ data: [], error: null }),
        locationIds.length
          ? supabase.from('locations').select('id,name,address,city,latitude,longitude').in('id', locationIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if ((profilesRes as any).error) console.warn('Profiles load warning:', (profilesRes as any).error);
      if ((locationsRes as any).error) console.warn('Locations load warning:', (locationsRes as any).error);

      const profiles = (profilesRes as any).data || [];
      const locations = (locationsRes as any).data || [];
      const profileMap = new Map(profiles.map((p: any) => [p.id, p]));
      const locationMap = new Map(locations.map((l: any) => [l.id, l]));

      // 3) Arricchisci i post con oggetti compatibili con il rendering esistente
      const enriched = posts.map((p: any) => ({
        ...p,
        profiles: profileMap.get(p.user_id) || null,
        locations: p.location_id ? (locationMap.get(p.location_id) || null) : null,
      }));

      console.log('Feed loaded (enriched):', enriched.length);

      // Cache feed per caricamento istantaneo prossima volta
      try {
        if (user?.id) {
          localStorage.setItem(`feed_cache_${user.id}`, JSON.stringify(enriched));
        }
      } catch {}

      return enriched;
    },
    enabled: !!user?.id,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
    initialData: () => {
      // Carica subito dalla cache per UI istantanea
      if (!user?.id) return [];
      try {
        const cached = localStorage.getItem(`feed_cache_${user.id}`);
        return cached ? JSON.parse(cached) : [];
      } catch {
        return [];
      }
    },
  });

  return {
    posts,
    loading: isLoading,
  };
};
