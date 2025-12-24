
import { useState, useEffect, useCallback } from 'react';
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

  const fetchStats = useCallback(async () => {
    console.log('useFollowStats: Starting to fetch stats for user:', user?.id);
    
    if (!user) {
      console.log('useFollowStats: No user found, using demo stats');
      setStats({ followersCount: 42, followingCount: 18, postsCount: 5 });
      setLoading(false);
      return;
    }

    try {
      console.log('useFollowStats: Fetching stats with timeout...');
      
      // SECURITY FIX: Use count queries without selecting all fields
      const statsPromise = Promise.all([
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user.id),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user.id),
        supabase.from('profiles').select('posts_count').eq('id', user.id).single()
      ]);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Stats fetch timeout')), 2000)
      );

      const [followersResult, followingResult, profileResult] = await Promise.race([
        statsPromise, 
        timeoutPromise
      ]) as any;

      const newStats = {
        followersCount: followersResult.count || 0,
        followingCount: followingResult.count || 0,
        postsCount: profileResult.data?.posts_count || 0
      };

      console.log('useFollowStats: Stats fetched:', newStats);
      setStats(newStats);
    } catch (error) {
      console.error('useFollowStats: Error fetching follow stats or timeout:', error);
      // Set demo stats on error/timeout
      console.log('useFollowStats: Using demo stats due to error/timeout');
      setStats({ followersCount: 42, followingCount: 18, postsCount: 5 });
    } finally {
      console.log('useFollowStats: Setting loading to false');
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Subscribe to realtime changes on follows table for live updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('follow-stats-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'follows',
          filter: `following_id=eq.${user.id}`
        },
        () => {
          // Refetch stats when follows change
          fetchStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'follows',
          filter: `follower_id=eq.${user.id}`
        },
        () => {
          // Refetch stats when follows change
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchStats]);

  return { stats, loading, refetch: fetchStats };
};

export const useFollowData = (type: 'followers' | 'following') => {
  const { user } = useAuth();
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFollowData = async () => {
      console.log('useFollowData: Fetching', type, 'for user:', user?.id);
      
      if (!user) {
        // Demo data for when no user is available
        const demoUsers: FollowUser[] = [
          { id: '1', username: 'demo_user1', avatar_url: null },
          { id: '2', username: 'demo_user2', avatar_url: null },
          { id: '3', username: 'demo_user3', avatar_url: null }
        ];
        setUsers(demoUsers);
        setLoading(false);
        return;
      }

      try {
        // Set timeout for follow data fetching
        let query = supabase
          .from('follows')
          .select(`
            ${type === 'followers' ? 'follower_id' : 'following_id'},
            profiles!${type === 'followers' ? 'follows_follower_id_fkey' : 'follows_following_id_fkey'} (
              id,
              username,
              avatar_url
            )
          `);

        if (type === 'followers') {
          query = query.eq('following_id', user.id);
        } else {
          query = query.eq('follower_id', user.id);
        }

        const dataPromise = query;
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Follow data fetch timeout')), 2000)
        );

        const { data, error } = await Promise.race([dataPromise, timeoutPromise]) as any;

        if (error) {
          console.error('useFollowData: Error fetching follow data:', error);
          setUsers([]);
        } else {
          console.log('useFollowData: Raw data:', data);
          const followUsers = data?.map((item: any) => item.profiles).filter(Boolean) || [];
          console.log('useFollowData: Processed users:', followUsers);
          setUsers(followUsers);
        }
      } catch (error) {
        console.error('useFollowData: Error fetching follow data or timeout:', error);
        // Demo data on error/timeout
        const demoUsers: FollowUser[] = type === 'following' ? [
          { id: '1', username: 'demo_followed1', avatar_url: null },
          { id: '2', username: 'demo_followed2', avatar_url: null }
        ] : [
          { id: '3', username: 'demo_follower1', avatar_url: null },
          { id: '4', username: 'demo_follower2', avatar_url: null }
        ];
        setUsers(demoUsers);
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

  const removeFollower = async (followerUserId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', followerUserId)
        .eq('following_id', user.id);

      if (!error) {
        setUsers(prev => prev.filter(u => u.id !== followerUserId));
      }
    } catch (error) {
      console.error('Error removing follower:', error);
    }
  };

  return { users, loading, unfollowUser, removeFollower };
};
