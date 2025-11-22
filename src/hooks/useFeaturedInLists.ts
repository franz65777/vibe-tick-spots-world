import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface FeaturedList {
  list_id: string;
  list_name: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  is_public: boolean; // Derived from is_private (inverted)
  is_own: boolean;
  type: 'trip' | 'folder';
}

export const useFeaturedInLists = (locationId?: string, googlePlaceId?: string) => {
  const [lists, setLists] = useState<FeaturedList[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchLists = async () => {
      if (!locationId && !googlePlaceId) {
        setLists([]);
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      try {
        const featuredLists: FeaturedList[] = [];
        let internalLocationId = locationId;

        // If we only have googlePlaceId, try to find internal location_id
        if (!internalLocationId && googlePlaceId) {
          const { data: locationData } = await supabase
            .from('locations')
            .select('id')
            .eq('google_place_id', googlePlaceId)
            .maybeSingle();
          
          if (locationData) {
            internalLocationId = locationData.id;
          }
        }

        // Query saved_folders (the main "Lists" system)
        if (internalLocationId) {
          const { data: folderData, error: folderError } = await supabase
            .from('folder_locations')
            .select(`
              folder_id,
              saved_folders!inner (
                id,
                name,
                user_id,
                is_private,
                profiles!inner (
                  username,
                  avatar_url
                )
              )
            `)
            .eq('location_id', internalLocationId);

          if (folderError) {
            console.error('Error fetching folders:', folderError);
          } else {
            folderData?.forEach((item: any) => {
              const folder = item.saved_folders;
              if (!folder) return;

              const isOwnList = user?.id === folder.user_id;
              const isPublic = !folder.is_private; // is_private: false means public
              
              // Include if: own list OR public list
              if (isOwnList || isPublic) {
                featuredLists.push({
                  list_id: folder.id,
                  list_name: folder.name,
                  user_id: folder.user_id,
                  username: folder.profiles?.username || 'Unknown',
                  avatar_url: folder.profiles?.avatar_url || null,
                  is_public: isPublic,
                  is_own: isOwnList,
                  type: 'folder'
                });
              }
            });
          }
        }

        // Also query trips for backwards compatibility
        if (internalLocationId || googlePlaceId) {
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
                  username,
                  avatar_url
                )
              )
            `);

          if (internalLocationId) {
            tripQuery.eq('location_id', internalLocationId);
          } else if (googlePlaceId) {
            tripQuery.eq('google_place_id', googlePlaceId);
          }

          const { data: tripData, error: tripError } = await tripQuery;

          if (tripError) {
            console.error('Error fetching trips:', tripError);
          } else {
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
                  avatar_url: trip.profiles?.avatar_url || null,
                  is_public: trip.is_public,
                  is_own: isOwnList,
                  type: 'trip'
                });
              }
            });
          }
        }

        // Remove duplicates by list_id
        const uniqueLists = Array.from(
          new Map(featuredLists.map(list => [list.list_id, list])).values()
        );

        setLists(uniqueLists);
      } catch (error) {
        console.error('Error fetching featured lists:', error);
        setLists([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLists();
  }, [locationId, googlePlaceId, user?.id]);

  return { lists, isLoading };
};
