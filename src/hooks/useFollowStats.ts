
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface FollowStats {
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

interface FollowUser {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

export const useFollowStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<FollowStats>({
    followersCount: 0,
    followingCount: 0,
    postsCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      console.log('useFollowStats: Starting to fetch stats for user:', user?.id);
      
      if (!user) {
        console.log('useFollowStats: No user found, using default stats');
        setStats({ followersCount: 0, followingCount: 0, postsCount: 0 });
        setLoading(false);
        return;
      }

      try {
        console.log('useFollowStats: Fetching followers count...');
        // Get followers count
        const { count: followersCount } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', user.id);

        console.log('useFollowStats: Fetching following count...');
        // Get following count
        const { count: followingCount } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', user.id);

        console.log('useFollowStats: Fetching posts count...');
        // Get posts count from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('posts_count')
          .eq('id', user.id)
          .single();

        const newStats = {
          followersCount: followersCount || 0,
          followingCount: followingCount || 0,
          postsCount: profile?.posts_count || 0
        };

        console.log('useFollowStats: Stats fetched:', newStats);
        setStats(newStats);
      } catch (error) {
        console.error('useFollowStats: Error fetching follow stats:', error);
        // Set default stats on error
        setStats({ followersCount: 0, followingCount: 0, postsCount: 0 });
      } finally {
        console.log('useFollowStats: Setting loading to false');
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  return { stats, loading };
};

export const useFollowData = (type: 'followers' | 'following') => {
  const { user } = useAuth();
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFollowData = async () => {
      console.log('useFollowData: Fetching', type, 'for user:', user?.id);
      
      if (!user) {
        setUsers([]);
        setLoading(false);
        return;
      }

      try {
        let query = supabase
          .from('follows')
          .select(`
            ${type === 'followers' ? 'follower_id' : 'following_id'},
            profiles!${type === 'followers' ? 'follows_follower_id_fkey' : 'follows_following_id_fkey'} (
              id,
              username,
              full_name,
              avatar_url
            )
          `);

        if (type === 'followers') {
          query = query.eq('following_id', user.id);
        } else {
          query = query.eq('follower_id', user.id);
        }

        const { data, error } = await query;

        if (error) {
          console.error('useFollowData: Error fetching follow data:', error);
          setUsers([]);
        } else {
          console.log('useFollowData: Raw data:', data);
          const followUsers = data?.map(item => item.profiles).filter(Boolean) || [];
          console.log('useFollowData: Processed users:', followUsers);
          setUsers(followUsers);
        }
      } catch (error) {
        console.error('useFollowData: Error fetching follow data:', error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowData();
  }, [user, type]);

  const unfollowUser = async (targetUserId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId);

      if (!error) {
        setUsers(prev => prev.filter(u => u.id !== targetUserId));
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  };

  return { users, loading, unfollowUser };
};
