import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SavedByUser {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

export const useSavedByUsers = (
  locationId: string | null,
  googlePlaceId: string | null,
  limit: number = 5
) => {
  const [users, setUsers] = useState<SavedByUser[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!locationId && !googlePlaceId) {
      setUsers([]);
      setTotalCount(0);
      return;
    }

    const fetchSavedByUsers = async () => {
      setLoading(true);
      try {
        const userIds = new Set<string>();
        
        // Fetch from user_saved_locations
        if (locationId) {
          const { data: savedLocations } = await supabase
            .from('user_saved_locations')
            .select('user_id')
            .eq('location_id', locationId)
            .limit(limit + 10);
          
          savedLocations?.forEach(sl => {
            if (sl.user_id) userIds.add(sl.user_id);
          });
        }
        
        // Fetch from saved_places
        if (googlePlaceId) {
          const { data: savedPlaces } = await supabase
            .from('saved_places')
            .select('user_id')
            .eq('place_id', googlePlaceId)
            .limit(limit + 10);
          
          savedPlaces?.forEach(sp => {
            if (sp.user_id) userIds.add(sp.user_id);
          });
        }

        const uniqueUserIds = Array.from(userIds);
        setTotalCount(uniqueUserIds.length);

        if (uniqueUserIds.length === 0) {
          setUsers([]);
          setLoading(false);
          return;
        }

        // Fetch profiles for these users
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', uniqueUserIds.slice(0, limit));

        setUsers(profiles || []);
      } catch (error) {
        console.error('Error fetching saved by users:', error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSavedByUsers();
  }, [locationId, googlePlaceId, limit]);

  return { users, totalCount, loading };
};
