import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LocationStats {
  totalSaves: number;
  averageRating: number | null;
}

export const useLocationStats = (locationId: string | null, googlePlaceId: string | null) => {
  const [stats, setStats] = useState<LocationStats>({ totalSaves: 0, averageRating: null });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!locationId && !googlePlaceId) {
      setStats({ totalSaves: 0, averageRating: null });
      return;
    }

    const fetchStats = async () => {
      setLoading(true);
      try {
        // Fetch total saves (from both saved_places and user_saved_locations)
        let savesCount = 0;
        
        if (googlePlaceId) {
          const { count: googleSaves } = await supabase
            .from('saved_places')
            .select('*', { count: 'exact', head: true })
            .eq('place_id', googlePlaceId);
          savesCount += googleSaves || 0;
        }
        
        if (locationId) {
          const { count: internalSaves } = await supabase
            .from('user_saved_locations')
            .select('*', { count: 'exact', head: true })
            .eq('location_id', locationId);
          savesCount += internalSaves || 0;
        }

        // Fetch average rating from interactions (reviews)
        let avgRating = null;
        if (locationId) {
          const { data: interactionData } = await supabase
            .from('interactions')
            .select('weight')
            .eq('location_id', locationId)
            .eq('action_type', 'review')
            .not('weight', 'is', null);

          if (interactionData && interactionData.length > 0) {
            const ratings = interactionData.map(i => Number(i.weight)).filter(r => r > 0);
            if (ratings.length > 0) {
              const sum = ratings.reduce((acc, r) => acc + r, 0);
              avgRating = Math.round((sum / ratings.length) * 10) / 10; // Round to 1 decimal
            }
          }
        }
        
        // Also check for Google Place ratings if available
        if (!avgRating && googlePlaceId) {
          const { data: googleInteractionData } = await supabase
            .from('interactions')
            .select('weight, location_id')
            .eq('action_type', 'review')
            .not('weight', 'is', null);

          // Filter by locations with matching google_place_id
          if (googleInteractionData && googleInteractionData.length > 0) {
            const locationIds = googleInteractionData.map(i => i.location_id).filter(Boolean);
            
            if (locationIds.length > 0) {
              const { data: matchingLocations } = await supabase
                .from('locations')
                .select('id')
                .eq('google_place_id', googlePlaceId)
                .in('id', locationIds);

              if (matchingLocations && matchingLocations.length > 0) {
                const matchingLocationIds = new Set(matchingLocations.map(l => l.id));
                const ratings = googleInteractionData
                  .filter(i => i.location_id && matchingLocationIds.has(i.location_id))
                  .map(i => Number(i.weight))
                  .filter(r => r > 0);
                
                if (ratings.length > 0) {
                  const sum = ratings.reduce((acc, r) => acc + r, 0);
                  avgRating = Math.round((sum / ratings.length) * 10) / 10; // Round to 1 decimal
                }
              }
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
    };

    fetchStats();
  }, [locationId, googlePlaceId]);

  return { stats, loading };
};
