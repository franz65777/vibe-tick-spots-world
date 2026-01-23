import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeEvent } from './useCentralizedRealtime';

/**
 * Hook to track unread message count
 * 
 * OPTIMIZED: Uses centralized realtime instead of individual channel
 * Reduces connections from 1 per user to 0 (uses shared channel)
 */
export const useUnreadMessages = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const userIdRef = useRef(user?.id);

  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user?.id]);

  const fetchUnreadCount = useCallback(async () => {
    if (!userIdRef.current) return;

    try {
      // Count distinct users who sent unread messages
      const { data, error } = await supabase
        .from('direct_messages')
        .select('sender_id')
        .eq('receiver_id', userIdRef.current)
        .eq('is_read', false);

      if (error) throw error;
      
      // Count unique sender IDs
      const uniqueSenders = new Set(data?.map(msg => msg.sender_id) || []);
      setUnreadCount(uniqueSenders.size);
    } catch (error) {
      console.error('Error fetching unread messages:', error);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    fetchUnreadCount();
  }, [user, fetchUnreadCount]);

  // Handle new messages from centralized realtime
  const handleNewMessage = useCallback((payload: any) => {
    // Only process if this message is for the current user
    if (payload.receiver_id === userIdRef.current && !payload.is_read) {
      // Refetch count to get accurate unique sender count
      fetchUnreadCount();
    }
  }, [fetchUnreadCount]);

  // Subscribe to centralized realtime events
  useRealtimeEvent('message_insert', handleNewMessage);

  return { unreadCount, refetch: fetchUnreadCount };
};
