import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LocationSaver {
  id: string;
  avatar_url?: string;
  username?: string;
}

export const useLocationSavers = (locationId: string | undefined, limit: number = 5) => {
  const { user } = useAuth();

  const { data: savers, isLoading } = useQuery({
    queryKey: ['location-savers', locationId, limit, user?.id],
    queryFn: async () => {
      if (!locationId || !user?.id) return [];

      // Get the list of users that the current user follows
      const { data: followingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = followingData?.map(f => f.following_id) || [];

      if (followingIds.length === 0) return [];

      // Get savers that are in the following list
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
        .in('user_id', followingIds)
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
    enabled: !!locationId && !!user?.id,
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    savers: savers || [],
    loading: isLoading,
  };
};
