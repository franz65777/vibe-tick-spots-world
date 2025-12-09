import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SavedCity {
  city: string;
  count: number;
}

interface CommonLocations {
  count: number;
  myAvatar: string | null;
  theirAvatar: string | null;
}

export const useUserSavedCities = (userId?: string) => {
  const { user: currentUser } = useAuth();
  const [cities, setCities] = useState<SavedCity[]>([]);
  const [commonLocations, setCommonLocations] = useState<CommonLocations>({ count: 0, myAvatar: null, theirAvatar: null });
  const [allPlacesCount, setAllPlacesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchCitiesAndCommon = async () => {
      setLoading(true);
      try {
        // Fetch locations with city info by joining user_saved_locations with locations
        const { data: savedLocations, error: locError } = await supabase
          .from('user_saved_locations')
          .select('location_id, locations(city)')
          .eq('user_id', userId);

        if (!locError && savedLocations) {
          // Count locations per city
          const cityCount: Record<string, number> = {};
          savedLocations.forEach(loc => {
            const city = (loc.locations as any)?.city;
            if (city) {
              cityCount[city] = (cityCount[city] || 0) + 1;
            }
          });
          
          const citiesArray = Object.entries(cityCount)
            .map(([city, count]) => ({ city, count }))
            .sort((a, b) => b.count - a.count);
          
          setCities(citiesArray);
          setAllPlacesCount(savedLocations.length);
        }

        // If viewing someone else's profile, calculate common locations
        if (currentUser && currentUser.id !== userId) {
          // Get current user's saved location IDs
          const { data: myLocations } = await supabase
            .from('user_saved_locations')
            .select('location_id')
            .eq('user_id', currentUser.id);

          // Get viewed user's saved location IDs
          const { data: theirLocations } = await supabase
            .from('user_saved_locations')
            .select('location_id')
            .eq('user_id', userId);

          if (myLocations && theirLocations) {
            const myLocationIds = new Set(myLocations.map(l => l.location_id));
            const commonCount = theirLocations.filter(l => myLocationIds.has(l.location_id)).length;

            // Get avatars
            const { data: myProfile } = await supabase
              .from('profiles')
              .select('avatar_url')
              .eq('id', currentUser.id)
              .single();

            const { data: theirProfile } = await supabase
              .from('profiles')
              .select('avatar_url')
              .eq('id', userId)
              .single();

            setCommonLocations({
              count: commonCount,
              myAvatar: myProfile?.avatar_url || null,
              theirAvatar: theirProfile?.avatar_url || null
            });
          }
        }
      } catch (err) {
        console.error('Error fetching saved cities:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCitiesAndCommon();
  }, [userId, currentUser]);

  return { cities, commonLocations, allPlacesCount, loading };
};
