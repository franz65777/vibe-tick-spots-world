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
        // Get users I follow
        const { data: followsData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);

        const followingIds = followsData?.map(f => f.following_id) || [];

        // Get all saves for this city
        const { data: allSaves } = await supabase
          .from('saved_places')
          .select('user_id, place_id')
          .ilike('city', cityName);

        const totalPins = allSaves?.length || 0;

        // Get unique followed users who saved in this city
        const followedUserIds = [...new Set(
          allSaves
            ?.filter(s => followingIds.includes(s.user_id))
            .map(s => s.user_id) || []
        )];

        // Fetch profiles of followed users
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', followedUserIds)
          .limit(3);

        setEngagement({
          city: cityName,
          totalPins,
          followedUsers: profiles || []
        });
      } catch (error) {
        console.error('Error fetching city engagement:', error);
        setEngagement(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEngagement();
  }, [cityName, user]);

  return { engagement, loading };
};
