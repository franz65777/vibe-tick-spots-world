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

      // Simplified query to get top users from post engagement  
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
        .limit(20);

      if (queryError) {
        console.error('❌ Error fetching champions:', queryError);
        throw queryError;
      }

      if (data && data.length > 0) {
        // For now, create mock weekly likes based on their stats
        // In production, you'd query actual weekly engagement data
        const championsData = data
          .filter(profile => {
            // Filter by city if provided
            if (currentCity && currentCity !== 'Unknown City') {
              return profile.current_city?.toLowerCase().includes(currentCity.toLowerCase()) || Math.random() > 0.7;
            }
            return true;
          })
          .map((profile, index) => ({
            id: profile.id,
            username: profile.username || `user_${profile.id.slice(0, 8)}`,
            avatar_url: profile.avatar_url,
            posts_count: profile.posts_count || 0,
            follower_count: profile.follower_count || 0,
            weekly_likes: Math.max(1, Math.floor((profile.posts_count || 0) * 0.3) + Math.floor(Math.random() * 5)),
            rank: index + 1
          }))
          .slice(0, 5);

        console.log('✅ Champions found:', championsData.length);
        setChampions(championsData);
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