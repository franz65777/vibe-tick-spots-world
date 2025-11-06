import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type LeaderboardMetric = 'saved' | 'invited' | 'posts' | 'reviews';
export type LeaderboardFilter = 'all' | 'following';

interface LeaderboardUser {
  id: string;
  username: string;
  avatar_url?: string;
  score: number;
  rank: number;
}

interface UseLeaderboardMetricsReturn {
  users: LeaderboardUser[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useLeaderboardMetrics = (
  metric: LeaderboardMetric,
  filter: LeaderboardFilter = 'all',
  city?: string
): UseLeaderboardMetricsReturn => {
  const { user } = useAuth();
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get following ids if filter is "following"
      let followingIds: string[] = [];
      if (filter === 'following') {
        const { data: followsData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);
        
        followingIds = followsData?.map(f => f.following_id) || [];
        
        if (followingIds.length === 0) {
          setUsers([]);
          setLoading(false);
          return;
        }
      }

      // Get user IDs that have saved locations in the selected city (if city filter is active)
      let userIdsInCity: string[] = [];
      if (city && city !== 'all') {
        const cityLower = city.toLowerCase();
        
        // Get user IDs from saved_places with matching city
        let spQuery = supabase
          .from('saved_places')
          .select('user_id')
          .not('city', 'is', null)
          .ilike('city', `%${city}%`);
        const { data: spUsers } = await spQuery;

        // Get user IDs from user_saved_locations with matching city (via locations join)
        let uslQuery = supabase
          .from('user_saved_locations')
          .select('user_id, locations:location_id(city)');
        const { data: uslUsers } = await uslQuery;

        const cityUserIds = new Set<string>();
        (spUsers || []).forEach(row => cityUserIds.add(row.user_id));
        (uslUsers || []).forEach((row: any) => {
          const locCity = row.locations?.city;
          if (locCity && locCity.toLowerCase().includes(cityLower)) {
            cityUserIds.add(row.user_id);
          }
        });

        userIdsInCity = Array.from(cityUserIds);
        
        if (userIdsInCity.length === 0) {
          setUsers([]);
          setLoading(false);
          return;
        }
      }

      // Base query for profiles
      let profileQuery = supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .not('username', 'is', null);

      // Apply following filter
      if (filter === 'following' && followingIds.length > 0) {
        profileQuery = profileQuery.in('id', followingIds);
      }

      // Apply city filter (users who have saved locations in that city)
      if (city && city !== 'all' && userIdsInCity.length > 0) {
        profileQuery = profileQuery.in('id', userIdsInCity);
      }

      const { data: profiles, error: profileError } = await profileQuery;

      if (profileError) throw profileError;
      if (!profiles || profiles.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      // Calculate scores based on metric and city
      const usersWithScores = await Promise.all(
        profiles.map(async (profile) => {
          let score = 0;

          switch (metric) {
            case 'saved': {
              // Count saved locations in the selected city
              if (city && city !== 'all') {
                // Count from saved_places with matching city
                const { count: spCount } = await supabase
                  .from('saved_places')
                  .select('id', { count: 'exact', head: true })
                  .eq('user_id', profile.id)
                  .ilike('city', `%${city}%`);

                // Count from user_saved_locations with matching city
                const { data: uslData } = await supabase
                  .from('user_saved_locations')
                  .select('id, locations:location_id(city)')
                  .eq('user_id', profile.id);
                
                const uslCount = (uslData || []).filter((row: any) => {
                  const locCity = row.locations?.city;
                  return locCity && locCity.toLowerCase().includes(city.toLowerCase());
                }).length;

                score = (spCount || 0) + uslCount;
              } else {
                // Count all saved locations
                const [{ count: uslCount }, { count: spCount }] = await Promise.all([
                  supabase
                    .from('user_saved_locations')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', profile.id),
                  supabase
                    .from('saved_places')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', profile.id)
                ]);
                score = (uslCount || 0) + (spCount || 0);
              }
              break;
            }

            case 'invited': {
              // Get invited_users_count from profile
              const { data: profileData } = await supabase
                .from('profiles')
                .select('invited_users_count')
                .eq('id', profile.id)
                .single();
              score = profileData?.invited_users_count || 0;
              break;
            }

            case 'posts': {
              // Count posts with location_id
              if (city && city !== 'all') {
                // Get posts with locations in the selected city
                const { data: postsData } = await supabase
                  .from('posts')
                  .select('id, locations:location_id(city)')
                  .eq('user_id', profile.id)
                  .not('location_id', 'is', null);
                
                score = (postsData || []).filter((row: any) => {
                  const locCity = row.locations?.city;
                  return locCity && locCity.toLowerCase().includes(city.toLowerCase());
                }).length;
              } else {
                const { count } = await supabase
                  .from('posts')
                  .select('id', { count: 'exact', head: true })
                  .eq('user_id', profile.id)
                  .not('location_id', 'is', null);
                score = count || 0;
              }
              break;
            }

            case 'reviews': {
              // Count reviews
              if (city && city !== 'all') {
                // Get reviews for posts with locations in the selected city
                const { data: reviewsData } = await supabase
                  .from('post_reviews')
                  .select('id, posts:post_id(location_id, locations:location_id(city))')
                  .eq('user_id', profile.id);
                
                score = (reviewsData || []).filter((row: any) => {
                  const locCity = row.posts?.locations?.city;
                  return locCity && locCity.toLowerCase().includes(city.toLowerCase());
                }).length;
              } else {
                const { count } = await supabase
                  .from('post_reviews')
                  .select('id', { count: 'exact', head: true })
                  .eq('user_id', profile.id);
                score = count || 0;
              }
              break;
            }
          }

          return {
            id: profile.id,
            username: profile.username || `user_${profile.id.slice(0, 8)}`,
            avatar_url: profile.avatar_url,
            score,
            rank: 0
          };
        })
      );

      // Sort by score and assign ranks
      const sortedUsers = usersWithScores
        .sort((a, b) => b.score - a.score)
        .map((user, index) => ({
          ...user,
          rank: index + 1
        }))
        .filter(user => user.score > 0); // Only show users with score > 0

      setUsers(sortedUsers);
    } catch (err: any) {
      console.error('Error fetching leaderboard:', err);
      setError(err.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [user, metric, filter, city]);

  return {
    users,
    loading,
    error,
    refetch: fetchLeaderboard
  };
};
