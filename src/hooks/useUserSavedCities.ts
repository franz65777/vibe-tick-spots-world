import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeEvent } from './useCentralizedRealtime';

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

/**
 * Hook for user saved cities data
 * 
 * OPTIMIZED: Uses centralized realtime instead of individual channels
 * Reduces connections from 2 per profile to 0 (uses shared channel)
 */
export const useUserSavedCities = (userId?: string) => {
  const { user: currentUser } = useAuth();
  const [cities, setCities] = useState<SavedCity[]>([]);
  const [commonLocations, setCommonLocations] = useState<CommonLocations>({ count: 0, myAvatar: null, theirAvatar: null });
  const [categoryCounts, setCategoryCounts] = useState<CategoryCounts>({ all: 0, been: 0, toTry: 0, favourite: 0 });
  const [loading, setLoading] = useState(true);
  
  // Keep userId in ref for stable callbacks
  const userIdRef = useRef(userId);
  const currentUserIdRef = useRef(currentUser?.id);
  
  useEffect(() => {
    userIdRef.current = userId;
    currentUserIdRef.current = currentUser?.id;
  }, [userId, currentUser?.id]);

  const fetchCitiesAndCommon = useCallback(async () => {
    if (!userIdRef.current) return;

    try {
      // Fetch from user_saved_locations with city info and save_tag
      const { data: savedLocations, error: locError } = await supabase
        .from('user_saved_locations')
        .select('location_id, save_tag, locations(city)')
        .eq('user_id', userIdRef.current);

      // Also fetch from saved_places table (Google Places)
      const { data: savedPlaces, error: spError } = await supabase
        .from('saved_places')
        .select('id, city, save_tag')
        .eq('user_id', userIdRef.current);

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
          if (loc.save_tag === 'been') beenCount++;
          else if (loc.save_tag === 'to-try' || loc.save_tag === 'to_try' || loc.save_tag === 'general') toTryCount++;
          else if (loc.save_tag === 'favourite') favouriteCount++;
          else toTryCount++;
        });
      }

      // Count from saved_places (Google Places)
      if (!spError && savedPlaces) {
        savedPlaces.forEach((sp: any) => {
          totalCount++;
          if (sp.city) {
            cityCount[sp.city] = (cityCount[sp.city] || 0) + 1;
          }
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
      if (currentUserIdRef.current && currentUserIdRef.current !== userIdRef.current) {
        const { data: myLocations } = await supabase
          .from('user_saved_locations')
          .select('location_id')
          .eq('user_id', currentUserIdRef.current);

        const { data: mySavedPlaces } = await supabase
          .from('saved_places')
          .select('place_id')
          .eq('user_id', currentUserIdRef.current);

        const { data: theirLocations } = await supabase
          .from('user_saved_locations')
          .select('location_id')
          .eq('user_id', userIdRef.current);

        const { data: theirSavedPlaces } = await supabase
          .from('saved_places')
          .select('place_id')
          .eq('user_id', userIdRef.current);

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
          .eq('id', currentUserIdRef.current)
          .single();

        const { data: theirProfile } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', userIdRef.current)
          .single();

        setCommonLocations({
          count: commonCount,
          myAvatar: myProfile?.avatar_url || null,
          theirAvatar: theirProfile?.avatar_url || null
        });
      } else if (currentUserIdRef.current && currentUserIdRef.current === userIdRef.current) {
        const { data: myProfile } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', currentUserIdRef.current)
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
  }, []);

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    fetchCitiesAndCommon();
  }, [userId, fetchCitiesAndCommon]);

  // Handle saved location/place changes from centralized realtime
  const handleSaveChange = useCallback((payload: any) => {
    const payloadUserId = payload?.user_id;
    
    // Check if this change is relevant to the user we're viewing
    if (payloadUserId === userIdRef.current) {
      console.log('Refetching cities for user via centralized realtime');
      fetchCitiesAndCommon();
    }
  }, [fetchCitiesAndCommon]);

  // Subscribe to centralized realtime events
  useRealtimeEvent(
    ['saved_location_insert', 'saved_location_delete', 'saved_place_insert', 'saved_place_delete'],
    handleSaveChange
  );

  return { cities, commonLocations, categoryCounts, loading, refetch: fetchCitiesAndCommon };
};
