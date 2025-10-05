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

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let intervalId: any;

    const fetchEngagement = async () => {
      setLoading(true);
      try {
        console.log('🔍 Fetching pin engagement for:', { locationId, googlePlaceId });
        const { data, error } = await supabase.rpc('get_pin_engagement', {
          p_location_id: locationId || null,
          p_google_place_id: googlePlaceId || null
        } as any);
        
        if (error) {
          console.error('❌ RPC error:', error);
          throw error;
        }

        console.log('📊 Pin engagement raw data:', data);

        const totalSaves = Number(data?.[0]?.total_saves) || 0;
        const followedUsers = ((data?.[0]?.followed_users as any) || []) as Array<{
          id: string;
          username: string;
          avatar_url: string | null;
        }>;

        setEngagement({ totalSaves, followedUsers });
      } catch (error) {
        console.error('❌ Error fetching pin engagement:', error);
        setEngagement(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEngagement();

    // Realtime refresh when saves change
    try {
      channel = supabase
        .channel(`pin-engagement-${locationId || googlePlaceId}-${user?.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'saved_places' }, (payload) => {
          const placeId = (payload as any)?.new?.place_id || (payload as any)?.old?.place_id;
          if (!placeId || placeId === googlePlaceId) fetchEngagement();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_saved_locations' }, (payload) => {
          const locId = (payload as any)?.new?.location_id || (payload as any)?.old?.location_id;
          if (!locId || locId === locationId) fetchEngagement();
        })
        .subscribe();
    } catch (e) {
      console.warn('Realtime subscription failed, using polling only.', e);
    }

    // Poll every 30s as a fallback
    intervalId = setInterval(fetchEngagement, 30000);

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (intervalId) clearInterval(intervalId);
    };
  }, [locationId, googlePlaceId, user?.id]);

  return { engagement, loading };
};
