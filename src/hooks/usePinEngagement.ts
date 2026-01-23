import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeEvent } from './useCentralizedRealtime';

interface PinEngagement {
  totalSaves: number;
  followedUsers: Array<{
    id: string;
    username: string;
    avatar_url: string | null;
  }>;
}

/**
 * Hook for pin engagement data
 * 
 * OPTIMIZED: Uses centralized realtime instead of individual channels
 * Reduces connections from 2 per location to 0 (uses shared channel + polling)
 */
export const usePinEngagement = (locationId: string | null, googlePlaceId: string | null) => {
  const { user } = useAuth();
  const [engagement, setEngagement] = useState<PinEngagement | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Keep IDs in refs for stable callbacks
  const locationIdRef = useRef(locationId);
  const googlePlaceIdRef = useRef(googlePlaceId);
  
  useEffect(() => {
    locationIdRef.current = locationId;
    googlePlaceIdRef.current = googlePlaceId;
  }, [locationId, googlePlaceId]);

  const fetchEngagement = useCallback(async () => {
    if (!locationIdRef.current && !googlePlaceIdRef.current) {
      setEngagement(null);
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 Fetching pin engagement for:', { locationId: locationIdRef.current, googlePlaceId: googlePlaceIdRef.current });
      
      let totalSaves = 0;
      let followedUsers: Array<{ id: string; username: string; avatar_url: string | null }> = [];

      try {
        const { data, error } = await supabase.rpc('get_pin_engagement', {
          p_location_id: locationIdRef.current || null,
          p_google_place_id: googlePlaceIdRef.current || null
        } as any);
        
        if (error) throw error;

        totalSaves = Number(data?.[0]?.total_saves) || 0;
        followedUsers = ((data?.[0]?.followed_users as any) || []);
      } catch (rpcError: any) {
        console.warn('⚠️ RPC failed, using fallback queries:', rpcError.message);
        
        if (locationIdRef.current) {
          const { count } = await supabase
            .from('user_saved_locations')
            .select('*', { count: 'exact', head: true })
            .eq('location_id', locationIdRef.current);
          totalSaves = count || 0;
        } else if (googlePlaceIdRef.current) {
          const { count } = await supabase
            .from('saved_places')
            .select('*', { count: 'exact', head: true })
            .eq('place_id', googlePlaceIdRef.current);
          totalSaves = count || 0;
        }
      }

      setEngagement({ totalSaves, followedUsers });
    } catch (error) {
      console.error('❌ Error fetching pin engagement:', error);
      setEngagement({ totalSaves: 0, followedUsers: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!locationId && !googlePlaceId) {
      setEngagement(null);
      return;
    }

    fetchEngagement();

    // Poll every 60s as fallback for non-realtime updates
    const intervalId = setInterval(fetchEngagement, 60000);

    return () => {
      clearInterval(intervalId);
    };
  }, [locationId, googlePlaceId, fetchEngagement]);

  // Handle saved location/place changes from centralized realtime
  const handleSaveChange = useCallback((payload: any) => {
    const payloadLocationId = payload?.location_id;
    const payloadPlaceId = payload?.place_id;
    
    // Check if this change is relevant to our current pin
    if (
      (locationIdRef.current && payloadLocationId === locationIdRef.current) ||
      (googlePlaceIdRef.current && payloadPlaceId === googlePlaceIdRef.current)
    ) {
      // Debounced refetch
      fetchEngagement();
    }
  }, [fetchEngagement]);

  // Subscribe to centralized realtime events for saved location/place changes
  useRealtimeEvent(
    ['saved_location_insert', 'saved_location_delete', 'saved_place_insert', 'saved_place_delete'],
    handleSaveChange
  );

  return { engagement, loading };
};
