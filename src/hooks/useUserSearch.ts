
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SearchUser {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  followers_count: number;
  following_count: number;
  posts_count: number;
  is_following?: boolean;
}

export const useUserSearch = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setUsers([]);
      return;
    }

    setLoading(true);
    try {
      // Search users by username or full_name
      const { data: searchResults, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .neq('id', currentUser?.id || '')
        .limit(20);

      if (error) throw error;

      // Check follow status for each user
      const usersWithFollowStatus = await Promise.all(
        (searchResults || []).map(async (user) => {
          let isFollowing = false;
          if (currentUser) {
            const { data: followData } = await supabase
              .from('follows')
              .select('id')
              .eq('follower_id', currentUser.id)
              .eq('following_id', user.id)
              .single();
            
            isFollowing = !!followData;
          }

          return {
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            avatar_url: user.avatar_url,
            bio: user.bio,
            followers_count: user.follower_count || 0, // Map follower_count to followers_count
            following_count: user.following_count || 0,
            posts_count: user.posts_count || 0,
            is_following: isFollowing
          };
        })
      );

      setUsers(usersWithFollowStatus);
    } catch (error) {
      console.error('Error searching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const getAllUsers = async () => {
    setLoading(true);
    try {
      const { data: allUsers, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', currentUser?.id || '')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Check follow status for each user
      const usersWithFollowStatus = await Promise.all(
        (allUsers || []).map(async (user) => {
          let isFollowing = false;
          if (currentUser) {
            const { data: followData } = await supabase
              .from('follows')
              .select('id')
              .eq('follower_id', currentUser.id)
              .eq('following_id', user.id)
              .single();
            
            isFollowing = !!followData;
          }

          return {
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            avatar_url: user.avatar_url,
            bio: user.bio,
            followers_count: user.follower_count || 0, // Map follower_count to followers_count
            following_count: user.following_count || 0,
            posts_count: user.posts_count || 0,
            is_following: isFollowing
          };
        })
      );

      setUsers(usersWithFollowStatus);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  return {
    users,
    loading,
    searchUsers,
    getAllUsers
  };
};
