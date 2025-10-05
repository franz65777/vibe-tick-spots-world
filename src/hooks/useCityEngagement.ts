import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CityEngagement {
  city: string;
  totalPins: number;
  followedUsers: Array<{
    id: string;
    username: string;
    avatar_url: string | null;
  }>;
}

export const useCityEngagement = (cityName: string | null) => {
  const { user } = useAuth();
  const [engagement, setEngagement] = useState<CityEngagement | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cityName || !user) {
      setEngagement(null);
      return;
    }

    const fetchEngagement = async () => {
      setLoading(true);
      try {
        // Get users I follow
        const { data: followsData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);

        const followingIds = followsData?.map(f => f.following_id) || [];

        // Get all saves for this city from saved_places (Google places)
        const normalizedCity = cityName.split(',')[0].trim();
        const { data: allSaves } = await supabase
          .from('saved_places')
          .select('user_id, place_id, city')
          .ilike('city', `%${normalizedCity}%`);

        // Count unique Google place_ids
        const uniqueSavedPlaceIds = new Set((allSaves || []).map((s: any) => s.place_id));

        // Also include saves from internal locations via user_saved_locations + locations.city
        const { data: cityLocations } = await supabase
          .from('locations')
          .select('id, city')
          .ilike('city', `%${normalizedCity}%`);

        const locationIds = (cityLocations || []).map((l: any) => l.id);
        let userSavedFromLocations: { user_id: string; location_id: string }[] = [];
        if (locationIds.length > 0) {
          const { data: usl } = await supabase
            .from('user_saved_locations')
            .select('user_id, location_id')
            .in('location_id', locationIds);
          userSavedFromLocations = usl || [];
        }

        // Count unique internal location_ids
        const uniqueInternalLocationIds = new Set(userSavedFromLocations.map((r) => r.location_id));

        // Total unique pins across both systems
        const totalPins = uniqueSavedPlaceIds.size + uniqueInternalLocationIds.size;

        // Get unique followed users who saved in this city (from both tables)
        const followedFromSavedPlaces = new Set(
          (allSaves || [])
            .filter((s: any) => followingIds.includes(s.user_id))
            .map((s: any) => s.user_id)
        );

        const followedFromUSL = new Set(
          userSavedFromLocations
            .filter((r) => followingIds.includes(r.user_id))
            .map((r) => r.user_id)
        );

        const followedUserIds = Array.from(new Set([...followedFromSavedPlaces, ...followedFromUSL])).slice(0, 3);

        // Fetch profiles of followed users (limit 3)
        const { data: profiles } = followedUserIds.length
          ? await supabase
              .from('profiles')
              .select('id, username, avatar_url')
              .in('id', followedUserIds)
          : { data: [] as any } as any;

        setEngagement({
          city: cityName,
          totalPins,
          followedUsers: profiles || []
        });
      } catch (error) {
        console.error('Error fetching city engagement:', error);
        setEngagement(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEngagement();
  }, [cityName, user]);

  return { engagement, loading };
};
