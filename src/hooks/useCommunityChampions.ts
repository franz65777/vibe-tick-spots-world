import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Champion {
  id: string;
  username: string;
  avatar_url?: string;
  posts_count: number;
  follower_count: number;
  weekly_likes: number;
  rank: number;
}

export const useCommunityChampions = (currentCity?: string) => {
  const [champions, setChampions] = useState<Champion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    fetchCommunityChampions();
  }, [user, currentCity]);

  const fetchCommunityChampions = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🏆 Fetching community champions...');
      
      // Get current week start (Monday)
      const now = new Date();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (now.getDay() + 6) % 7);
      monday.setHours(0, 0, 0, 0);

      // Fetch top users with actual engagement metrics
      const { data, error: queryError } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          avatar_url,
          posts_count,
          follower_count,
          current_city
        `)
        .not('username', 'is', null)
        .gt('posts_count', 0)
        .order('posts_count', { ascending: false })
        .limit(50);

      if (queryError) {
        console.error('❌ Error fetching champions:', queryError);
        throw queryError;
      }

      if (data && data.length > 0) {
        // For each user, count their actual weekly likes
        const championsWithLikes = await Promise.all(
          data.map(async (profile) => {
            // First get the user's posts
            const { data: userPosts } = await supabase
              .from('posts')
              .select('id')
              .eq('user_id', profile.id);

            const postIds = userPosts?.map(p => p.id) || [];

            // Count actual post likes from this week for those posts
            let likesCount = 0;
            if (postIds.length > 0) {
              const { count } = await supabase
                .from('post_likes')
                .select('id', { count: 'exact', head: true })
                .gte('created_at', monday.toISOString())
                .in('post_id', postIds);
              
              likesCount = count || 0;
            }

            return {
              ...profile,
              weekly_likes: likesCount
            };
          })
        );

        // Filter by city and sort by weekly engagement
        const filteredChampions = championsWithLikes
          .filter(profile => {
            if (currentCity && currentCity !== 'Unknown City') {
              return profile.current_city?.toLowerCase().includes(currentCity.toLowerCase());
            }
            return true;
          })
          .sort((a, b) => {
            // Sort by weekly likes first, then posts count
            if (b.weekly_likes !== a.weekly_likes) {
              return b.weekly_likes - a.weekly_likes;
            }
            return (b.posts_count || 0) - (a.posts_count || 0);
          })
          .slice(0, 5)
          .map((profile, index) => ({
            id: profile.id,
            username: profile.username || `user_${profile.id.slice(0, 8)}`,
            avatar_url: profile.avatar_url,
            posts_count: profile.posts_count || 0,
            follower_count: profile.follower_count || 0,
            weekly_likes: profile.weekly_likes,
            rank: index + 1
          }));

        console.log('✅ Champions found:', filteredChampions.length);
        setChampions(filteredChampions);
      } else {
        setChampions([]);
      }

    } catch (err: any) {
      console.error('❌ Error fetching champions:', err);
      setError(err.message);
      setChampions([]);
    } finally {
      setLoading(false);
    }
  };

  return {
    champions,
    loading,
    error,
    refetch: fetchCommunityChampions
  };
};