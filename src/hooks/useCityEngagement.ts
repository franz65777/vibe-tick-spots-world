import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CityEngagement {
  city: string;
  totalPins: number;
  followedUsers: Array<{
    id: string;
    username: string;
    avatar_url: string | null;
  }>;
}

export const useCityEngagement = (cityName: string | null) => {
  const { user } = useAuth();
  const [engagement, setEngagement] = useState<CityEngagement | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cityName || !user) {
      setEngagement(null);
      return;
    }

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let intervalId: any;

    const fetchEngagement = async () => {
      setLoading(true);
      try {
        console.log('🔍 Fetching city engagement for:', cityName);
        const { data, error } = await supabase.rpc('get_city_engagement', { p_city: cityName, p_user: user.id });
        if (error) {
          console.error('❌ RPC error:', error);
          throw error;
        }
        console.log('📊 City engagement raw data:', data);

        const totalPins = Number(data?.[0]?.total_pins) || 0;
        const followedUsers = ((data?.[0]?.followed_users as any) || []) as Array<{
          id: string;
          username: string;
          avatar_url: string | null;
        }>;

        setEngagement({ city: cityName, totalPins, followedUsers });
      } catch (error) {
        console.error('❌ Error fetching city engagement:', error);
        setEngagement(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEngagement();

    // Realtime refresh when saves change
    try {
      channel = supabase
        .channel(`city-engagement-${cityName}-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'saved_places' }, (payload) => {
          const city = (payload as any)?.new?.city || (payload as any)?.old?.city;
          if (!city || city === cityName) fetchEngagement();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_saved_locations' }, () => {
          // We can't get city without a join, so refetch on any change
          fetchEngagement();
        })
        .subscribe();
    } catch (e) {
      console.warn('Realtime subscription failed, using polling only.', e);
    }

    // Poll every 30s as a fallback and for aggregation freshness
    intervalId = setInterval(fetchEngagement, 30000);

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (intervalId) clearInterval(intervalId);
    };
  }, [cityName, user?.id]);

  return { engagement, loading };
};
