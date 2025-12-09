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

interface CategoryCounts {
  all: number;
  been: number;
  toTry: number;
  favourite: number;
}

export const useUserSavedCities = (userId?: string) => {
  const { user: currentUser } = useAuth();
  const [cities, setCities] = useState<SavedCity[]>([]);
  const [commonLocations, setCommonLocations] = useState<CommonLocations>({ count: 0, myAvatar: null, theirAvatar: null });
  const [categoryCounts, setCategoryCounts] = useState<CategoryCounts>({ all: 0, been: 0, toTry: 0, favourite: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchCitiesAndCommon = async () => {
      setLoading(true);
      try {
        // Fetch locations with city info and save_tag
        const { data: savedLocations, error: locError } = await supabase
          .from('user_saved_locations')
          .select('location_id, save_tag, locations(city)')
          .eq('user_id', userId);

        if (!locError && savedLocations) {
          // Count locations per city
          const cityCount: Record<string, number> = {};
          let beenCount = 0;
          let toTryCount = 0;
          let favouriteCount = 0;

          savedLocations.forEach(loc => {
            const city = (loc.locations as any)?.city;
            if (city) {
              cityCount[city] = (cityCount[city] || 0) + 1;
            }
            // Count by save_tag
            if (loc.save_tag === 'been') beenCount++;
            else if (loc.save_tag === 'to-try') toTryCount++;
            else if (loc.save_tag === 'favourite') favouriteCount++;
          });
          
          const citiesArray = Object.entries(cityCount)
            .map(([city, count]) => ({ city, count }))
            .sort((a, b) => b.count - a.count);
          
          setCities(citiesArray);
          setCategoryCounts({
            all: savedLocations.length,
            been: beenCount,
            toTry: toTryCount,
            favourite: favouriteCount
          });
        }

        // If viewing someone else's profile, calculate common locations
        if (currentUser && currentUser.id !== userId) {
          const { data: myLocations } = await supabase
            .from('user_saved_locations')
            .select('location_id')
            .eq('user_id', currentUser.id);

          const { data: theirLocations } = await supabase
            .from('user_saved_locations')
            .select('location_id')
            .eq('user_id', userId);

          if (myLocations && theirLocations) {
            const myLocationIds = new Set(myLocations.map(l => l.location_id));
            const commonCount = theirLocations.filter(l => myLocationIds.has(l.location_id)).length;

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
        } else if (currentUser && currentUser.id === userId) {
          // Own profile - get own avatar
          const { data: myProfile } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', currentUser.id)
            .single();
          
          setCommonLocations({
            count: 0,
            myAvatar: myProfile?.avatar_url || null,
            theirAvatar: null
          });
        }
      } catch (err) {
        console.error('Error fetching saved cities:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCitiesAndCommon();
  }, [userId, currentUser]);

  return { cities, commonLocations, categoryCounts, loading };
};
