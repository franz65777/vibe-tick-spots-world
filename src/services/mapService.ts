
import { supabase } from '@/integrations/supabase/client';

export interface MapLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category: string;
  likes_count: number;
  is_following_location: boolean;
}

export const mapService = {
  async getFollowingLocations(userId: string): Promise<MapLocation[]> {
    try {
      const { data } = await supabase
        .from('user_saved_locations')
        .select(`
          location_id,
          locations (
            id,
            name,
            latitude,
            longitude,
            category,
            created_by
          )
        `)
        .eq('user_id', userId);

      if (!data) return [];

      const locations = data
        .filter(item => item.locations)
        .map(item => ({
          id: item.locations.id,
          name: item.locations.name,
          latitude: item.locations.latitude || 0,
          longitude: item.locations.longitude || 0,
          category: item.locations.category,
          likes_count: 0, // Will be calculated
          is_following_location: true
        }));

      return locations;
    } catch (error) {
      console.error('Error fetching following locations:', error);
      return [];
    }
  },

  async getPopularLocations(bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }): Promise<MapLocation[]> {
    try {
      const { data } = await supabase
        .from('locations')
        .select(`
          id,
          name,
          latitude,
          longitude,
          category,
          location_likes (count)
        `)
        .gte('latitude', bounds.south)
        .lte('latitude', bounds.north)
        .gte('longitude', bounds.west)
        .lte('longitude', bounds.east)
        .limit(50);

      if (!data) return [];

      const locations = data
        .map(location => ({
          id: location.id,
          name: location.name,
          latitude: location.latitude || 0,
          longitude: location.longitude || 0,
          category: location.category,
          likes_count: location.location_likes?.[0]?.count || 0,
          is_following_location: false
        }))
        .sort((a, b) => b.likes_count - a.likes_count)
        .slice(0, 20); // Show top 20 most liked

      return locations;
    } catch (error) {
      console.error('Error fetching popular locations:', error);
      return [];
    }
  }
};
