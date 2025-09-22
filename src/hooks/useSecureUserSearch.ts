import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SecureSearchUser {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  follower_count: number;
  following_count: number;
  is_following: boolean;
}

export const useSecureUserSearch = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<SecureSearchUser[]>([]);
  const [loading, setLoading] = useState(false);

  const searchUsers = async (query: string) => {
    if (!query.trim() || !currentUser) {
      setUsers([]);
      return;
    }

    setLoading(true);
    try {
      // Use the secure search function that doesn't expose sensitive data
      const { data: searchResults, error } = await supabase
        .rpc('search_users_securely', {
          search_query: query,
          requesting_user_id: currentUser.id
        });

      if (error) throw error;

      setUsers(searchResults || []);
    } catch (error) {
      console.error('Error searching users securely:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const getAllUsers = async () => {
    if (!currentUser) {
      setUsers([]);
      return;
    }

    setLoading(true);
    try {
      // Use the secure search function with empty query to get all users
      const { data: allUsers, error } = await supabase
        .rpc('search_users_securely', {
          search_query: '',
          requesting_user_id: currentUser.id
        });

      if (error) throw error;

      setUsers(allUsers || []);
    } catch (error) {
      console.error('Error fetching users securely:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-load all users when component mounts
  useEffect(() => {
    if (currentUser) {
      getAllUsers();
    }
  }, [currentUser]);

  return {
    users,
    loading,
    searchUsers,
    getAllUsers
  };
};