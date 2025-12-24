import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { VisitedSaveActivity } from '@/components/feed/UserVisitedCard';
import { useGeolocation } from '@/hooks/useGeolocation';
import { normalizeCity } from '@/utils/cityNormalization';

/**
 * Hook to fetch "visited" (been) saves from users
 * Returns saves chronologically ordered for interleaving in the feed
 * Filtered by user's current geolocation city
 */
export const useVisitedSaves = () => {
  const { user } = useAuth();
  const { location } = useGeolocation();

  const userCity = location?.city ? normalizeCity(location.city) : null;

  return useQuery({
    queryKey: ['visited-saves', user?.id, userCity],
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
          location_id,
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

      // Get posts from these users to filter out locations they already posted about
      const userIds = [...new Set((recentVisited || []).map(s => s.user_id))];
      const locationIds = [...new Set((recentVisited || []).map(s => s.location_id).filter(Boolean))];
      
      if (userIds.length === 0) return [];

      // Fetch posts to find which user+location combinations already have posts
      const { data: postsData } = await supabase
        .from('posts')
        .select('user_id, location_id')
        .in('user_id', userIds)
        .in('location_id', locationIds);
      
      // Create a set of "user_id:location_id" combinations that already have posts
      const userLocationPostsSet = new Set(
        (postsData || []).map(p => `${p.user_id}:${p.location_id}`)
      );
      
      if (userIds.length === 0) return [];

      // Fetch profiles - only get users with valid usernames (deleted users have null username)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds)
        .not('username', 'is', null);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const validUserIds = new Set(profiles?.map(p => p.id) || []);

      // Map to activity format, filtering by user's current city and excluding posts
      const activities: VisitedSaveActivity[] = (recentVisited || [])
        .filter(save => {
          const loc = save.locations as any;
          // Only include if: has valid location, user exists, and NO post exists for this user+location
          if (!loc || !validUserIds.has(save.user_id)) return false;
          
          // Filter out if this user already has a post for this location
          const userLocationKey = `${save.user_id}:${save.location_id}`;
          if (userLocationPostsSet.has(userLocationKey)) {
            console.log('📰 Filtering out visited card - user has post for this location:', loc.name);
            return false;
          }
          
          // Filter by user's current city geolocation
          if (userCity) {
            const locationCity = normalizeCity(loc.city);
            if (locationCity && locationCity !== userCity) {
              return false;
            }
          }
          
          return true;
        })
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
