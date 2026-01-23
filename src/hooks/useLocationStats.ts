import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeEvent } from './useCentralizedRealtime';

interface LocationStats {
  totalSaves: number;
  averageRating: number | null;
}

/**
 * Hook for location statistics (saves and ratings)
 * 
 * OPTIMIZED: Uses centralized realtime instead of individual channels
 * Reduces connections from 4 per location to 0 (uses shared channel + polling)
 */
export const useLocationStats = (locationId: string | null, googlePlaceId: string | null) => {
  const [stats, setStats] = useState<LocationStats>({ totalSaves: 0, averageRating: null });
  const [loading, setLoading] = useState(false);
  
  // Keep IDs in refs for stable callbacks
  const locationIdRef = useRef(locationId);
  const googlePlaceIdRef = useRef(googlePlaceId);
  
  useEffect(() => {
    locationIdRef.current = locationId;
    googlePlaceIdRef.current = googlePlaceId;
  }, [locationId, googlePlaceId]);

  const fetchStats = useCallback(async () => {
    if (!locationIdRef.current && !googlePlaceIdRef.current) {
      setStats({ totalSaves: 0, averageRating: null });
      return;
    }

    setLoading(true);
    try {
      // Fetch total saves (from both saved_places and user_saved_locations)
      let savesCount = 0;
      
      if (googlePlaceIdRef.current) {
        const { count: googleSaves } = await supabase
          .from('saved_places')
          .select('*', { count: 'exact', head: true })
          .eq('place_id', googlePlaceIdRef.current);
        savesCount += googleSaves || 0;
      }
      
      if (locationIdRef.current) {
        const { count: internalSaves } = await supabase
          .from('user_saved_locations')
          .select('*', { count: 'exact', head: true })
          .eq('location_id', locationIdRef.current);
        savesCount += internalSaves || 0;
      }

      // Fetch average rating from both interactions AND posts with ratings
      let avgRating = null;
      const allRatings: number[] = [];
      
      if (locationIdRef.current) {
        // Get ratings from interactions table
        const { data: interactionData } = await supabase
          .from('interactions')
          .select('weight')
          .eq('location_id', locationIdRef.current)
          .eq('action_type', 'review')
          .not('weight', 'is', null);

        if (interactionData && interactionData.length > 0) {
          const ratings = interactionData.map(i => Number(i.weight)).filter(r => r > 0);
          allRatings.push(...ratings);
        }

        // Get ratings from posts table (posts with rating field)
        const { data: postsData } = await supabase
          .from('posts')
          .select('rating')
          .eq('location_id', locationIdRef.current)
          .not('rating', 'is', null)
          .gt('rating', 0);

        if (postsData && postsData.length > 0) {
          const postRatings = postsData.map(p => Number(p.rating)).filter(r => r > 0);
          allRatings.push(...postRatings);
        }

        // Calculate average from all ratings
        if (allRatings.length > 0) {
          const sum = allRatings.reduce((acc, r) => acc + r, 0);
          avgRating = Math.round((sum / allRatings.length) * 10) / 10; // Round to 1 decimal
        }
      }
      
      // Also check for Google Place ratings if available (from both interactions and posts)
      if (!avgRating && googlePlaceIdRef.current) {
        const googleRatings: number[] = [];
        
        // Get matching location IDs for this google_place_id
        const { data: matchingLocations } = await supabase
          .from('locations')
          .select('id')
          .eq('google_place_id', googlePlaceIdRef.current);

        if (matchingLocations && matchingLocations.length > 0) {
          const matchingLocationIds = matchingLocations.map(l => l.id);
          
          // Get ratings from interactions
          const { data: googleInteractionData } = await supabase
            .from('interactions')
            .select('weight')
            .in('location_id', matchingLocationIds)
            .eq('action_type', 'review')
            .not('weight', 'is', null);

          if (googleInteractionData && googleInteractionData.length > 0) {
            const ratings = googleInteractionData.map(i => Number(i.weight)).filter(r => r > 0);
            googleRatings.push(...ratings);
          }

          // Get ratings from posts
          const { data: googlePostsData } = await supabase
            .from('posts')
            .select('rating')
            .in('location_id', matchingLocationIds)
            .not('rating', 'is', null)
            .gt('rating', 0);

          if (googlePostsData && googlePostsData.length > 0) {
            const postRatings = googlePostsData.map(p => Number(p.rating)).filter(r => r > 0);
            googleRatings.push(...postRatings);
          }

          // Calculate average
          if (googleRatings.length > 0) {
            const sum = googleRatings.reduce((acc, r) => acc + r, 0);
            avgRating = Math.round((sum / googleRatings.length) * 10) / 10;
          }
        }
      }

      setStats({ totalSaves: savesCount, averageRating: avgRating });
    } catch (error) {
      console.error('Error fetching location stats:', error);
      setStats({ totalSaves: 0, averageRating: null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!locationId && !googlePlaceId) {
      setStats({ totalSaves: 0, averageRating: null });
      return;
    }

    fetchStats();

    // Poll every 60s as fallback
    const intervalId = setInterval(fetchStats, 60000);

    return () => {
      clearInterval(intervalId);
    };
  }, [locationId, googlePlaceId, fetchStats]);

  // Handle save changes from centralized realtime
  const handleSaveChange = useCallback((payload: any) => {
    const payloadLocationId = payload?.location_id;
    const payloadPlaceId = payload?.place_id;
    
    // Check if this change is relevant to our current location
    if (
      (locationIdRef.current && payloadLocationId === locationIdRef.current) ||
      (googlePlaceIdRef.current && payloadPlaceId === googlePlaceIdRef.current)
    ) {
      fetchStats();
    }
  }, [fetchStats]);

  // Subscribe to centralized realtime events
  useRealtimeEvent(
    ['saved_location_insert', 'saved_location_delete', 'saved_place_insert', 'saved_place_delete'],
    handleSaveChange
  );

  return { stats, loading };
};
