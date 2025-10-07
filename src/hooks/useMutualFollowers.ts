import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface MutualFollower {
  id: string;
  username: string;
  avatar_url: string | null;
}

export const useMutualFollowers = (viewedUserId?: string) => {
  const { user: currentUser } = useAuth();
  const [mutualFollowers, setMutualFollowers] = useState<MutualFollower[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMutualFollowers = async () => {
      if (!currentUser || !viewedUserId || currentUser.id === viewedUserId) {
        setMutualFollowers([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      try {
        // Get people who follow the viewed user
        const { data: viewedUserFollowers, error: followersError } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('following_id', viewedUserId);

        if (followersError) throw followersError;

        // Get people the current user follows
        const { data: currentUserFollows, error: followsError } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUser.id);

        if (followsError) throw followsError;

        // Find intersection: people current user follows who also follow the viewed user
        const followerIds = new Set(viewedUserFollowers?.map(f => f.follower_id) || []);
        const followingIds = new Set(currentUserFollows?.map(f => f.following_id) || []);
        
        const mutualIds = Array.from(followingIds).filter(id => followerIds.has(id));

        if (mutualIds.length === 0) {
          setMutualFollowers([]);
          setTotalCount(0);
          setLoading(false);
          return;
        }

        // Fetch profiles for mutual followers
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', mutualIds.slice(0, 3));

        if (profilesError) throw profilesError;

        setTotalCount(mutualIds.length);
        setMutualFollowers(profiles || []);
      } catch (err) {
        console.error('Error fetching mutual followers:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMutualFollowers();
  }, [currentUser, viewedUserId]);

  return { mutualFollowers, totalCount, loading };
};
