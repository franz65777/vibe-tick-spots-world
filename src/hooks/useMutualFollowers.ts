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
        // Get followers of the viewed user who the current user also follows
        const { data, error } = await supabase
          .from('follows')
          .select(`
            follower_id,
            profiles!follows_follower_id_fkey(id, username, avatar_url)
          `)
          .eq('following_id', viewedUserId);

        if (error) throw error;

        // Filter for mutual follows (people current user follows who also follow viewed user)
        const { data: currentUserFollows, error: followsError } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUser.id);

        if (followsError) throw followsError;

        const followingIds = new Set(currentUserFollows?.map(f => f.following_id) || []);
        
        const mutual = data
          ?.filter(item => followingIds.has(item.follower_id))
          .map(item => item.profiles)
          .filter((profile): profile is MutualFollower => 
            profile !== null && 
            typeof profile === 'object' && 
            'id' in profile
          ) || [];

        setTotalCount(mutual.length);
        setMutualFollowers(mutual.slice(0, 3)); // Show max 3 avatars
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
