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

    const fetchEngagement = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_city_engagement', { p_city: cityName });
        if (error) throw error;

        const totalPins = (data?.[0]?.total_pins as number) || 0;
        const followedUsers = ((data?.[0]?.followed_users as any) || []) as Array<{
          id: string;
          username: string;
          avatar_url: string | null;
        }>;

        setEngagement({
          city: cityName,
          totalPins,
          followedUsers,
        });
      } catch (error) {
        console.error('Error fetching city engagement:', error);
        setEngagement(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEngagement();
  }, [cityName, user?.id]);

  return { engagement, loading };
};
