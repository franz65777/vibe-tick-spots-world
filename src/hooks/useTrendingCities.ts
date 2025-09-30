import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TrendingCity {
  city: string;
  visits: number;
  friendCount: number;
}

export const useTrendingCities = () => {
  const { user } = useAuth();
  const [trendingCities, setTrendingCities] = useState<TrendingCity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrendingCities = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Get list of users current user is following
        const { data: followData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);

        const followingIds = followData?.map(f => f.following_id) || [];

        if (followingIds.length === 0) {
          setTrendingCities([]);
          setLoading(false);
          return;
        }

        // Get locations visited by friends in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: locationsData } = await supabase
          .from('user_locations')
          .select('city, user_id')
          .in('user_id', followingIds)
          .gte('updated_at', thirtyDaysAgo.toISOString())
          .not('city', 'is', null);

        // Also get saved locations from friends
        const { data: savedLocationsData } = await supabase
          .from('user_saved_locations')
          .select('location_id, user_id, locations!inner(city)')
          .in('user_id', followingIds)
          .gte('created_at', thirtyDaysAgo.toISOString());

        // Aggregate cities with visit count and friend count
        const cityMap = new Map<string, { visits: number; friendIds: Set<string> }>();

        // Process user locations
        (locationsData || []).forEach(loc => {
          if (loc.city) {
            const existing = cityMap.get(loc.city);
            if (existing) {
              existing.visits += 1;
              existing.friendIds.add(loc.user_id);
            } else {
              cityMap.set(loc.city, { visits: 1, friendIds: new Set([loc.user_id]) });
            }
          }
        });

        // Process saved locations
        (savedLocationsData || []).forEach((loc: any) => {
          const city = loc.locations?.city;
          if (city) {
            const existing = cityMap.get(city);
            if (existing) {
              existing.visits += 1;
              existing.friendIds.add(loc.user_id);
            } else {
              cityMap.set(city, { visits: 1, friendIds: new Set([loc.user_id]) });
            }
          }
        });

        // Convert to array and sort by visits
        const trending = Array.from(cityMap.entries())
          .map(([city, data]) => ({
            city,
            visits: data.visits,
            friendCount: data.friendIds.size,
          }))
          .sort((a, b) => b.visits - a.visits)
          .slice(0, 5);

        setTrendingCities(trending);
      } catch (error) {
        console.error('Error fetching trending cities:', error);
        setTrendingCities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTrendingCities();
  }, [user]);

  return { trendingCities, loading };
};
