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
        
        // Fallback to direct queries instead of RPC if it fails
        let totalSaves = 0;
        let followedUsers: Array<{ id: string; username: string; avatar_url: string | null }> = [];

        try {
          const { data, error } = await supabase.rpc('get_pin_engagement', {
            p_location_id: locationId || null,
            p_google_place_id: googlePlaceId || null
          } as any);
          
          if (error) throw error;

          totalSaves = Number(data?.[0]?.total_saves) || 0;
          followedUsers = ((data?.[0]?.followed_users as any) || []);
        } catch (rpcError: any) {
          // Fallback: count saves directly
          console.warn('⚠️ RPC failed, using fallback queries:', rpcError.message);
          
          if (locationId) {
            const { count } = await supabase
              .from('user_saved_locations')
              .select('*', { count: 'exact', head: true })
              .eq('location_id', locationId);
            totalSaves = count || 0;
          } else if (googlePlaceId) {
            const { count } = await supabase
              .from('saved_places')
              .select('*', { count: 'exact', head: true })
              .eq('place_id', googlePlaceId);
            totalSaves = count || 0;
          }
        }

        setEngagement({ totalSaves, followedUsers });
      } catch (error) {
        console.error('❌ Error fetching pin engagement:', error);
        setEngagement({ totalSaves: 0, followedUsers: [] });
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

    // Poll every 60s to reduce load
    intervalId = setInterval(fetchEngagement, 60000);

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (intervalId) clearInterval(intervalId);
    };
  }, [locationId, googlePlaceId, user?.id]);

  return { engagement, loading };
};
