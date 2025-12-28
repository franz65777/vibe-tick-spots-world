import { useState, useEffect, useCallback } from 'react';
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

  const fetchCitiesAndCommon = useCallback(async () => {
    if (!userId) return;

    try {
      // Fetch from user_saved_locations with city info and save_tag
      const { data: savedLocations, error: locError } = await supabase
        .from('user_saved_locations')
        .select('location_id, save_tag, locations(city)')
        .eq('user_id', userId);

      // Also fetch from saved_places table (Google Places)
      const { data: savedPlaces, error: spError } = await supabase
        .from('saved_places')
        .select('id, city, save_tag')
        .eq('user_id', userId);

      const cityCount: Record<string, number> = {};
      let beenCount = 0;
      let toTryCount = 0;
      let favouriteCount = 0;
      let totalCount = 0;

      // Count from user_saved_locations
      if (!locError && savedLocations) {
        savedLocations.forEach((loc: any) => {
          totalCount++;
          const city = (loc.locations as any)?.city;
          if (city) {
            cityCount[city] = (cityCount[city] || 0) + 1;
          }
          // Count by save_tag - treat unknown/general as "to try" so totals match category sum
          if (loc.save_tag === 'been') beenCount++;
          else if (loc.save_tag === 'to-try' || loc.save_tag === 'to_try' || loc.save_tag === 'general') toTryCount++;
          else if (loc.save_tag === 'favourite') favouriteCount++;
          else toTryCount++;
        });
      }

      // Count from saved_places (Google Places) - avoiding duplicates by tracking place IDs
      if (!spError && savedPlaces) {
        savedPlaces.forEach((sp: any) => {
          totalCount++;
          if (sp.city) {
            cityCount[sp.city] = (cityCount[sp.city] || 0) + 1;
          }
          // Count by save_tag - treat unknown/general as "to try" so totals match category sum
          if (sp.save_tag === 'been') beenCount++;
          else if (sp.save_tag === 'to-try' || sp.save_tag === 'to_try' || sp.save_tag === 'general') toTryCount++;
          else if (sp.save_tag === 'favourite') favouriteCount++;
          else toTryCount++;
        });
      }
      
      const citiesArray = Object.entries(cityCount)
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count);
      
      setCities(citiesArray);
      setCategoryCounts({
        all: totalCount,
        been: beenCount,
        toTry: toTryCount,
        favourite: favouriteCount
      });

      // If viewing someone else's profile, calculate common locations
      if (currentUser && currentUser.id !== userId) {
        // Get my saved locations (both tables)
        const { data: myLocations } = await supabase
          .from('user_saved_locations')
          .select('location_id')
          .eq('user_id', currentUser.id);

        const { data: mySavedPlaces } = await supabase
          .from('saved_places')
          .select('place_id')
          .eq('user_id', currentUser.id);

        // Get their saved locations (both tables)
        const { data: theirLocations } = await supabase
          .from('user_saved_locations')
          .select('location_id')
          .eq('user_id', userId);

        const { data: theirSavedPlaces } = await supabase
          .from('saved_places')
          .select('place_id')
          .eq('user_id', userId);

        // Calculate common count
        let commonCount = 0;
        
        if (myLocations && theirLocations) {
          const myLocationIds = new Set(myLocations.map(l => l.location_id));
          commonCount += theirLocations.filter(l => myLocationIds.has(l.location_id)).length;
        }

        if (mySavedPlaces && theirSavedPlaces) {
          const myPlaceIds = new Set(mySavedPlaces.map(p => p.place_id));
          commonCount += theirSavedPlaces.filter(p => myPlaceIds.has(p.place_id)).length;
        }

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
  }, [userId, currentUser]);

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    fetchCitiesAndCommon();

    // Subscribe to realtime changes for live updates
    // Use unique channel IDs to avoid conflicts
    const channelId = Math.random().toString(36).slice(2);
    
    const savedLocationsChannel = supabase
      .channel(`user_saved_locations_changes_${userId}_${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_saved_locations'
        },
        (payload) => {
          console.log('user_saved_locations change detected:', payload.eventType);
          // Check if the change is for this user
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          if (newRecord?.user_id === userId || oldRecord?.user_id === userId) {
            console.log('Refetching cities for user');
            fetchCitiesAndCommon();
          }
        }
      )
      .subscribe();

    const savedPlacesChannel = supabase
      .channel(`saved_places_changes_${userId}_${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'saved_places'
        },
        (payload) => {
          console.log('saved_places change detected:', payload.eventType);
          // Check if the change is for this user
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          if (newRecord?.user_id === userId || oldRecord?.user_id === userId) {
            console.log('Refetching cities for user');
            fetchCitiesAndCommon();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(savedLocationsChannel);
      supabase.removeChannel(savedPlacesChannel);
    };
  }, [userId, fetchCitiesAndCommon]);

  return { cities, commonLocations, categoryCounts, loading, refetch: fetchCitiesAndCommon };
};
