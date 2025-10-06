import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SuggestedUser {
  id: string;
  username: string;
  avatar_url: string;
  bio: string | null;
  follower_count: number;
  following_count: number;
  posts_count: number;
  is_following: boolean;
  mutual_followers?: number;
}

export const useFollowSuggestions = () => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSuggestions = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get users that the people I follow are following (second-degree connections)
      const { data: myFollows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const myFollowingIds = (myFollows || []).map(f => f.following_id);

      if (myFollowingIds.length === 0) {
        // If not following anyone, suggest popular users
        const { data: popularUsers, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, bio, follower_count, following_count, posts_count')
          .neq('id', user.id)
          .order('follower_count', { ascending: false })
          .limit(10);

        if (error) throw error;

        const usersWithFollowStatus = await Promise.all(
          (popularUsers || []).map(async (u) => {
            const { data: followData } = await supabase
              .from('follows')
              .select('id')
              .eq('follower_id', user.id)
              .eq('following_id', u.id)
              .maybeSingle();

            return {
              ...u,
              is_following: !!followData,
              mutual_followers: 0
            };
          })
        );

        setSuggestions(usersWithFollowStatus);
      } else {
        // Get second-degree connections
        const { data: theirFollows } = await supabase
          .from('follows')
          .select('following_id')
          .in('follower_id', myFollowingIds);

        const suggestedIds = (theirFollows || [])
          .map(f => f.following_id)
          .filter(id => id !== user.id && !myFollowingIds.includes(id));

        // Count occurrences (mutual followers)
        const counts = suggestedIds.reduce((acc, id) => {
          acc[id] = (acc[id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Get top suggested users
        const topSuggestedIds = Object.entries(counts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([id]) => id);

        if (topSuggestedIds.length === 0) {
          setSuggestions([]);
          setLoading(false);
          return;
        }

        const { data: suggestedUsers, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, bio, follower_count, following_count, posts_count')
          .in('id', topSuggestedIds);

        if (error) throw error;

        const usersWithFollowStatus = (suggestedUsers || []).map(u => ({
          ...u,
          is_following: false,
          mutual_followers: counts[u.id] || 0
        }));

        // Sort by mutual followers
        usersWithFollowStatus.sort((a, b) => (b.mutual_followers || 0) - (a.mutual_followers || 0));

        setSuggestions(usersWithFollowStatus);
      }
    } catch (error) {
      console.error('Error fetching follow suggestions:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSuggestions();
    }
  }, [user]);

  return {
    suggestions,
    loading,
    fetchSuggestions
  };
};
