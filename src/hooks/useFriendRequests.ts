
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface FriendRequest {
  id: string;
  requester_id: string;
  requested_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  created_at: string;
  updated_at: string;
  requester?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export const useFriendRequests = () => {
  const { user } = useAuth();
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchFriendRequests();
    fetchFriends();
  }, [user]);

  const fetchFriendRequests = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('friends/requests');
      
      if (error) {
        console.error('Error fetching friend requests:', error);
        return;
      }

      setPendingRequests(data.data || []);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    }
  };

  const fetchFriends = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('friends/list');
      
      if (error) {
        console.error('Error fetching friends:', error);
        return;
      }

      setFriends(data.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching friends:', error);
      setLoading(false);
    }
  };

  const sendFriendRequest = async (requestedUserId: string) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const { data, error } = await supabase.functions.invoke('friends/request', {
        body: { requestedUserId }
      });

      if (error) {
        console.error('Error sending friend request:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data.data };
    } catch (error) {
      console.error('Error sending friend request:', error);
      return { success: false, error: 'Failed to send friend request' };
    }
  };

  const acceptFriendRequest = async (requestId: string) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const { data, error } = await supabase.functions.invoke('friends/accept', {
        body: { requestId }
      });

      if (error) {
        console.error('Error accepting friend request:', error);
        return { success: false, error: error.message };
      }

      // Refresh data
      await fetchFriendRequests();
      await fetchFriends();

      return { success: true, data: data.data };
    } catch (error) {
      console.error('Error accepting friend request:', error);
      return { success: false, error: 'Failed to accept friend request' };
    }
  };

  const blockUser = async (userId: string) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const { data, error } = await supabase.functions.invoke('friends/block', {
        body: { userId }
      });

      if (error) {
        console.error('Error blocking user:', error);
        return { success: false, error: error.message };
      }

      // Refresh data
      await fetchFriendRequests();

      return { success: true, data: data.data };
    } catch (error) {
      console.error('Error blocking user:', error);
      return { success: false, error: 'Failed to block user' };
    }
  };

  return {
    pendingRequests,
    friends,
    loading,
    sendFriendRequest,
    acceptFriendRequest,
    blockUser,
    refresh: () => {
      fetchFriendRequests();
      fetchFriends();
    }
  };
};
