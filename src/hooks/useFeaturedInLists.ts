import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface FeaturedList {
  trip_id: string;
  trip_name: string;
  user_id: string;
  username: string;
  is_public: boolean;
  is_own: boolean;
}

export const useFeaturedInLists = (locationId?: string, googlePlaceId?: string) => {
  const [lists, setLists] = useState<FeaturedList[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchLists = async () => {
      if (!locationId && !googlePlaceId) return;
      
      setIsLoading(true);
      try {
        // Query trip_locations for this location
        const query = supabase
          .from('trip_locations')
          .select(`
            trip_id,
            trips!inner (
              id,
              name,
              user_id,
              is_public,
              profiles!inner (
                username
              )
            )
          `);

        if (locationId) {
          query.eq('location_id', locationId);
        } else if (googlePlaceId) {
          query.eq('google_place_id', googlePlaceId);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Filter and format the results
        const featuredLists: FeaturedList[] = [];
        
        data?.forEach((item: any) => {
          const trip = item.trips;
          if (!trip) return;

          const isOwnList = user?.id === trip.user_id;
          
          // Include if: own list OR public list
          if (isOwnList || trip.is_public) {
            featuredLists.push({
              trip_id: trip.id,
              trip_name: trip.name,
              user_id: trip.user_id,
              username: trip.profiles?.username || 'Unknown',
              is_public: trip.is_public,
              is_own: isOwnList
            });
          }
        });

        setLists(featuredLists);
      } catch (error) {
        console.error('Error fetching featured lists:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLists();
  }, [locationId, googlePlaceId, user?.id]);

  return { lists, isLoading };
};
