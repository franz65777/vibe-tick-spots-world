import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { VisitedSaveActivity } from '@/components/feed/UserVisitedCard';

/**
 * Hook to fetch "visited" (been) saves from users
 * Returns saves chronologically ordered for interleaving in the feed
 */
export const useVisitedSaves = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['visited-saves', user?.id],
    queryFn: async (): Promise<VisitedSaveActivity[]> => {
      if (!user?.id) return [];

      // Get who user follows
      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = following?.map(f => f.following_id) || [];
      
      // Create a set for quick lookup
      const followingSet = new Set(followingIds);

      // Get recent "visited" / "been" saves from user_saved_locations
      // Only show saves with save_tag = 'been' (visited)
      const { data: recentVisited, error } = await supabase
        .from('user_saved_locations')
        .select(`
          id,
          user_id,
          save_tag,
          created_at,
          locations (
            id,
            name,
            category,
            city,
            latitude,
            longitude
          )
        `)
        .eq('save_tag', 'been')
        .neq('user_id', user.id) // Exclude own saves
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching visited saves:', error);
        return [];
      }

      // Get unique user IDs
      const userIds = [...new Set((recentVisited || []).map(s => s.user_id))];
      
      if (userIds.length === 0) return [];

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Map to activity format
      const activities: VisitedSaveActivity[] = (recentVisited || [])
        .filter(save => save.locations) // Only include saves with valid locations
        .map(save => {
          const profile = profileMap.get(save.user_id);
          const loc = save.locations as any;
          
          return {
            id: save.id,
            user_id: save.user_id,
            username: profile?.username || 'user',
            avatar_url: profile?.avatar_url || null,
            location_name: loc?.name || 'Unknown',
            location_category: loc?.category || 'place',
            location_city: loc?.city || null,
            location_id: loc?.id || null,
            latitude: loc?.latitude || null,
            longitude: loc?.longitude || null,
            created_at: save.created_at,
            is_following: followingSet.has(save.user_id),
          };
        });

      return activities;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};
