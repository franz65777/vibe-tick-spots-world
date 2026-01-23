import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeEvent } from './useCentralizedRealtime';

interface CityEngagement {
  city: string;
  totalPins: number;
  followedUsers: Array<{
    id: string;
    username: string;
    avatar_url: string | null;
  }>;
}

/**
 * Hook for city engagement data
 * 
 * OPTIMIZED: Uses centralized realtime instead of individual channels
 * Reduces connections from 2 per city to 0 (uses shared channel + polling)
 */
export const useCityEngagement = (cityName: string | null, coords?: { lat: number; lng: number } | null) => {
  const { user } = useAuth();
  const [engagement, setEngagement] = useState<CityEngagement | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Keep values in refs for stable callbacks
  const cityNameRef = useRef(cityName);
  const coordsRef = useRef(coords);
  const userIdRef = useRef(user?.id);

  useEffect(() => {
    cityNameRef.current = cityName;
    coordsRef.current = coords;
    userIdRef.current = user?.id;
  }, [cityName, coords, user?.id]);

  const fetchEngagement = useCallback(async () => {
    if ((!cityNameRef.current && !coordsRef.current) || !userIdRef.current) {
      setEngagement(null);
      return;
    }

    setLoading(true);
    try {
      let data: any;
      let error: any;
      
      if (cityNameRef.current) {
        const result = await supabase.rpc('get_city_engagement', { 
          p_city: cityNameRef.current, 
          p_user: userIdRef.current 
        });
        data = result.data;
        error = result.error;
      } else if (coordsRef.current?.lat && coordsRef.current?.lng) {
        const result = await supabase.rpc('get_city_engagement_geo' as any, { 
          p_lat: coordsRef.current.lat, 
          p_lng: coordsRef.current.lng, 
          p_radius_km: 25, 
          p_user: userIdRef.current 
        });
        data = result.data;
        error = result.error;
      }
      
      if (error) {
        console.error('❌ RPC error for city:', cityNameRef.current || JSON.stringify(coordsRef.current), error);
        throw error;
      }
      console.log('📊 City engagement raw data for', cityNameRef.current || JSON.stringify(coordsRef.current), ':', data, 'Total pins:', data?.[0]?.total_pins, 'Followed users:', data?.[0]?.followed_users);

      const totalPins = Number(data?.[0]?.total_pins) || 0;
      const followedUsers = ((data?.[0]?.followed_users as any) || []) as Array<{
        id: string;
        username: string;
        avatar_url: string | null;
      }>;

      setEngagement({ city: cityNameRef.current || '', totalPins, followedUsers });
    } catch (error) {
      console.error('❌ Error fetching city engagement:', error);
      setEngagement(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if ((!cityName && !coords) || !user) {
      setEngagement(null);
      return;
    }

    fetchEngagement();

    // Poll every 30s as fallback for aggregation freshness
    const intervalId = setInterval(fetchEngagement, 30000);

    return () => {
      clearInterval(intervalId);
    };
  }, [cityName, coords?.lat, coords?.lng, user?.id, fetchEngagement]);

  // Handle saved location/place changes from centralized realtime
  const handleSaveChange = useCallback((payload: any) => {
    // City engagement aggregates data, so refetch on any relevant save change
    // We can't easily filter by city without a DB call, so debounce the refetch
    const timeoutId = setTimeout(fetchEngagement, 1000);
    return () => clearTimeout(timeoutId);
  }, [fetchEngagement]);

  // Subscribe to centralized realtime events
  useRealtimeEvent(
    ['saved_location_insert', 'saved_location_delete', 'saved_place_insert', 'saved_place_delete'],
    handleSaveChange
  );

  return { engagement, loading };
};
