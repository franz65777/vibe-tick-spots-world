import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SuggestedUser {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  follower_count: number;
  places_visited: number;
  mutual_count: number;
  is_following: boolean;
  has_active_story?: boolean;
}

export const useSuggestedUsers = () => {
  const { user } = useAuth();
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSuggestedUsers = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get users I'm following
      const { data: myFollows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const myFollowingIds = (myFollows || []).map(f => f.following_id);

      // Get users that my follows are following (mutual friends)
      let mutualCounts: Record<string, number> = {};
      
      if (myFollowingIds.length > 0) {
        const { data: theirFollows } = await supabase
          .from('follows')
          .select('following_id')
          .in('follower_id', myFollowingIds);

        // Count mutual connections
        (theirFollows || []).forEach(f => {
          if (f.following_id !== user.id && !myFollowingIds.includes(f.following_id)) {
            mutualCounts[f.following_id] = (mutualCounts[f.following_id] || 0) + 1;
          }
        });
      }

      // Get users with many saved places
      const { data: usersWithPlaces } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, bio, follower_count, places_visited')
        .neq('id', user.id)
        .not('id', 'in', myFollowingIds.length > 0 ? `(${myFollowingIds.join(',')})` : '(00000000-0000-0000-0000-000000000000)')
        .gt('places_visited', 0)
        .order('places_visited', { ascending: false })
        .limit(50);

      // Merge and score users
      const userMap = new Map<string, SuggestedUser>();

      (usersWithPlaces || []).forEach(u => {
        userMap.set(u.id, {
          id: u.id,
          username: u.username || '',
          avatar_url: u.avatar_url,
          bio: u.bio,
          follower_count: u.follower_count || 0,
          places_visited: u.places_visited || 0,
          mutual_count: mutualCounts[u.id] || 0,
          is_following: false
        });
      });

      // Add users with mutual connections that might not have many places
      for (const [userId, count] of Object.entries(mutualCounts)) {
        if (!userMap.has(userId) && count >= 2) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, bio, follower_count, places_visited')
            .eq('id', userId)
            .maybeSingle();

          if (profile) {
            userMap.set(userId, {
              id: profile.id,
              username: profile.username || '',
              avatar_url: profile.avatar_url,
              bio: profile.bio,
              follower_count: profile.follower_count || 0,
              places_visited: profile.places_visited || 0,
              mutual_count: count,
              is_following: false
            });
          }
        }
      }

      // Check for active stories
      const userIds = Array.from(userMap.keys());
      if (userIds.length > 0) {
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: stories } = await supabase
          .from('stories')
          .select('user_id')
          .in('user_id', userIds)
          .gt('created_at', dayAgo);

        const usersWithStories = new Set(stories?.map(s => s.user_id) || []);
        
        userMap.forEach((u, id) => {
          u.has_active_story = usersWithStories.has(id);
        });
      }

      // Sort by: mutual friends first, then by places_visited
      const sorted = Array.from(userMap.values()).sort((a, b) => {
        // Prioritize mutual connections
        if (a.mutual_count !== b.mutual_count) {
          return b.mutual_count - a.mutual_count;
        }
        // Then by places visited
        return b.places_visited - a.places_visited;
      });

      setSuggestedUsers(sorted.slice(0, 15));
    } catch (error) {
      console.error('Error fetching suggested users:', error);
      setSuggestedUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSuggestedUsers();
    }
  }, [user]);

  return {
    suggestedUsers,
    loading,
    refetch: fetchSuggestedUsers
  };
};
