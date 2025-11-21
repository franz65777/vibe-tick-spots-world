import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface FeaturedList {
  list_id: string;
  list_name: string;
  user_id: string;
  username: string;
  is_public: boolean;
  is_own: boolean;
  type: 'trip' | 'folder';
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
        const featuredLists: FeaturedList[] = [];

        // Query saved_folders (the main "Lists" system)
        if (locationId) {
          const { data: folderData, error: folderError } = await supabase
            .from('folder_locations')
            .select(`
              folder_id,
              saved_folders!inner (
                id,
                name,
                user_id,
                is_public,
                profiles!inner (
                  username
                )
              )
            `)
            .eq('location_id', locationId);

          if (folderError) throw folderError;

          folderData?.forEach((item: any) => {
            const folder = item.saved_folders;
            if (!folder) return;

            const isOwnList = user?.id === folder.user_id;
            
            // Include if: own list OR public list
            if (isOwnList || folder.is_public) {
              featuredLists.push({
                list_id: folder.id,
                list_name: folder.name,
                user_id: folder.user_id,
                username: folder.profiles?.username || 'Unknown',
                is_public: folder.is_public,
                is_own: isOwnList,
                type: 'folder'
              });
            }
          });
        }

        // Also query trips for backwards compatibility
        const tripQuery = supabase
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
          tripQuery.eq('location_id', locationId);
        } else if (googlePlaceId) {
          tripQuery.eq('google_place_id', googlePlaceId);
        }

        const { data: tripData, error: tripError } = await tripQuery;

        if (tripError) throw tripError;

        tripData?.forEach((item: any) => {
          const trip = item.trips;
          if (!trip) return;

          const isOwnList = user?.id === trip.user_id;
          
          if (isOwnList || trip.is_public) {
            featuredLists.push({
              list_id: trip.id,
              list_name: trip.name,
              user_id: trip.user_id,
              username: trip.profiles?.username || 'Unknown',
              is_public: trip.is_public,
              is_own: isOwnList,
              type: 'trip'
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
