import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Place } from '@/types/place';

export interface LocationStats {
  totalSaves: number;
  averageRating: number | null;
}

// Module-level cache to persist stats across remounts (2 min TTL)
const statsCache = new Map<string, { stats: Map<string, LocationStats>; timestamp: number }>();
const STATS_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

/**
 * Batch-loads stats (saves count, average rating) for multiple locations at once.
 * 
 * OPTIMIZATION: Reduces N*6 individual queries to just 3-4 batch queries.
 * Critical for list drawer performance.
 * 
 * Uses module-level cache to avoid refetching on component remounts.
 */
export const useBatchedLocationStats = (places: Place[]) => {
  const [statsMap, setStatsMap] = useState<Map<string, LocationStats>>(new Map());
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  // Memoize location IDs to prevent unnecessary refetches
  const locationIdsKey = useMemo(() => 
    places.map(p => p.id).filter(Boolean).sort().join(','),
    [places]
  );

  useEffect(() => {
    if (places.length === 0) {
      setStatsMap(new Map());
      return;
    }

    // Check module-level cache first
    const cached = statsCache.get(locationIdsKey);
    if (cached && Date.now() - cached.timestamp < STATS_CACHE_DURATION) {
      setStatsMap(cached.stats);
      setLoading(false);
      return;
    }

    // Prevent duplicate fetches
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchBatchedStats = async () => {
      setLoading(true);
      const newStatsMap = new Map<string, LocationStats>();

      try {
        // Collect all IDs
        const locationIds = places.map(p => p.id).filter(Boolean);
        const googlePlaceIds = places
          .map(p => p.google_place_id)
          .filter((id): id is string => Boolean(id));

        // Run all queries in parallel for max performance
        const [
          internalSavesResult,
          googleSavesResult,
          postRatingsResult,
          interactionRatingsResult
        ] = await Promise.all([
          // Batch query 1: Saves from user_saved_locations
          supabase
            .from('user_saved_locations')
            .select('location_id')
            .in('location_id', locationIds),
          
          // Batch query 2: Saves from saved_places (Google IDs)
          googlePlaceIds.length > 0 
            ? supabase
                .from('saved_places')
                .select('place_id')
                .in('place_id', googlePlaceIds)
            : Promise.resolve({ data: [] }),
          
          // Batch query 3: Ratings from posts
          supabase
            .from('posts')
            .select('location_id, rating')
            .in('location_id', locationIds)
            .not('rating', 'is', null)
            .gt('rating', 0),
          
          // Batch query 4: Ratings from interactions (reviews)
          supabase
            .from('interactions')
            .select('location_id, weight')
            .in('location_id', locationIds)
            .eq('action_type', 'review')
            .not('weight', 'is', null)
        ]);

        // Count saves per location
        const savesCount = new Map<string, number>();
        
        internalSavesResult.data?.forEach((s: any) => {
          savesCount.set(s.location_id, (savesCount.get(s.location_id) || 0) + 1);
        });
        
        googleSavesResult.data?.forEach((s: any) => {
          savesCount.set(s.place_id, (savesCount.get(s.place_id) || 0) + 1);
        });

        // Aggregate ratings per location (from both posts and interactions)
        const ratingsPerLocation = new Map<string, number[]>();
        
        postRatingsResult.data?.forEach((p: any) => {
          if (p.location_id && p.rating > 0) {
            if (!ratingsPerLocation.has(p.location_id)) {
              ratingsPerLocation.set(p.location_id, []);
            }
            ratingsPerLocation.get(p.location_id)!.push(p.rating);
          }
        });
        
        interactionRatingsResult.data?.forEach((i: any) => {
          if (i.location_id && i.weight > 0) {
            if (!ratingsPerLocation.has(i.location_id)) {
              ratingsPerLocation.set(i.location_id, []);
            }
            ratingsPerLocation.get(i.location_id)!.push(i.weight);
          }
        });

        // Build final stats map
        places.forEach(place => {
          const key = place.id;
          
          // Combine internal saves + google saves
          const totalSaves = (savesCount.get(place.id) || 0) + 
                            (place.google_place_id ? savesCount.get(place.google_place_id) || 0 : 0);
          
          // Calculate average rating
          const ratings = ratingsPerLocation.get(place.id) || [];
          const averageRating = ratings.length > 0 
            ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
            : null;

          newStatsMap.set(key, { totalSaves, averageRating });
        });

        // Cache at module level
        statsCache.set(locationIdsKey, { stats: newStatsMap, timestamp: Date.now() });
        setStatsMap(newStatsMap);
      } catch (error) {
        console.error('Error fetching batched stats:', error);
        // On error, set empty stats for all places
        places.forEach(place => {
          newStatsMap.set(place.id, { totalSaves: 0, averageRating: null });
        });
        setStatsMap(newStatsMap);
      } finally {
        setLoading(false);
      }
    };

    fetchBatchedStats();
  }, [locationIdsKey, places]);

  // Reset fetch guard when key changes
  useEffect(() => {
    fetchedRef.current = false;
  }, [locationIdsKey]);

  return { statsMap, loading };
};
