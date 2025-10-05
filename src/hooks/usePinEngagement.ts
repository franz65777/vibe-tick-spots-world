import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PinEngagement {
  totalSaves: number;
  followedUsers: Array<{
    id: string;
    username: string;
    avatar_url: string | null;
  }>;
}

export const usePinEngagement = (locationId: string | null, googlePlaceId: string | null) => {
  const { user } = useAuth();
  const [engagement, setEngagement] = useState<PinEngagement | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!locationId && !googlePlaceId) {
      setEngagement(null);
      return;
    }

    const fetchEngagement = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_pin_engagement', {
          p_location_id: locationId || null,
          p_google_place_id: googlePlaceId || null
        });
        
        if (error) throw error;

        const totalSaves = (data?.[0]?.total_saves as number) || 0;
        const followedUsers = ((data?.[0]?.followed_users as any) || []) as Array<{
          id: string;
          username: string;
          avatar_url: string | null;
        }>;

        setEngagement({
          totalSaves,
          followedUsers,
        });
      } catch (error) {
        console.error('Error fetching pin engagement:', error);
        setEngagement(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEngagement();
  }, [locationId, googlePlaceId, user?.id]);

  return { engagement, loading };
};
