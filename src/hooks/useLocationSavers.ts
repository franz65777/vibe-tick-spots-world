import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface LocationSaver {
  id: string;
  avatar_url?: string;
  username?: string;
}

export const useLocationSavers = (locationId: string | undefined, limit: number = 5) => {
  const { data: savers, isLoading } = useQuery({
    queryKey: ['location-savers', locationId, limit],
    queryFn: async () => {
      if (!locationId) return [];

      const { data, error } = await supabase
        .from('user_saved_locations')
        .select(`
          user_id,
          profiles:user_id (
            id,
            avatar_url,
            username
          )
        `)
        .eq('location_id', locationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching location savers:', error);
        return [];
      }

      return (data || [])
        .map((item: any) => item.profiles)
        .filter((profile: any) => profile !== null) as LocationSaver[];
    },
    enabled: !!locationId,
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    savers: savers || [],
    loading: isLoading,
  };
};
