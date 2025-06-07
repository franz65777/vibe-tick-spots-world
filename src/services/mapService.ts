
import { supabase } from '@/integrations/supabase/client';

export interface MapLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category: string;
  likes: number;
  image_url?: string;
}

export const getFollowingLocations = async (userId: string): Promise<MapLocation[]> => {
  try {
    // Get users that current user follows
    const { data: followingData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);

    if (!followingData || followingData.length === 0) {
      return [];
    }

    const followingIds = followingData.map(f => f.following_id);

    // Get locations from followed users
    const { data: locationsData } = await supabase
      .from('locations')
      .select(`
        id,
        name,
        latitude,
        longitude,
        category,
        image_url,
        location_likes(count)
      `)
      .in('created_by', followingIds);

    if (!locationsData) return [];

    return locationsData.map(location => ({
      id: location.id,
      name: location.name,
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
      category: location.category,
      likes: Array.isArray(location.location_likes) ? location.location_likes.length : 0,
      image_url: location.image_url
    }));
  } catch (error) {
    console.error('Error fetching following locations:', error);
    return [];
  }
};

export const getPopularLocations = async (
  latitude: number,
  longitude: number,
  radius: number = 10000 // 10km in meters
): Promise<MapLocation[]> => {
  try {
    // Get locations with their like counts, ordered by popularity
    const { data: locationsData } = await supabase
      .from('locations')
      .select(`
        id,
        name,
        latitude,
        longitude,
        category,
        image_url,
        location_likes(count)
      `)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!locationsData) return [];

    // Calculate distance and sort by likes
    const locationsWithDistance = locationsData
      .map(location => {
        const distance = calculateDistance(
          latitude,
          longitude,
          Number(location.latitude),
          Number(location.longitude)
        );
        
        return {
          id: location.id,
          name: location.name,
          latitude: Number(location.latitude),
          longitude: Number(location.longitude),
          category: location.category,
          likes: Array.isArray(location.location_likes) ? location.location_likes.length : 0,
          image_url: location.image_url,
          distance
        };
      })
      .filter(location => location.distance <= radius)
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 20); // Return top 20 popular locations

    return locationsWithDistance;
  } catch (error) {
    console.error('Error fetching popular locations:', error);
    return [];
  }
};

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}
