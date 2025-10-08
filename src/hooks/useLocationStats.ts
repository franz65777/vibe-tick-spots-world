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

        // Fetch average rating from interactions
        let avgRating = null;
        if (locationId) {
          const { data: interactionData } = await supabase
            .from('interactions')
            .select('action_type, weight')
            .eq('location_id', locationId)
            .eq('action_type', 'review');

          if (interactionData && interactionData.length > 0) {
            const ratings = interactionData.map(i => i.weight);
            const sum = ratings.reduce((acc, r) => acc + r, 0);
            avgRating = sum / ratings.length;
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
