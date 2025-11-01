import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useUnreadMessages = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    fetchUnreadCount();
    setupRealtimeSubscription();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id]);

  const fetchUnreadCount = async () => {
    if (!user) return;

    try {
      const { count, error } = await supabase
        .from('direct_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error fetching unread messages count:', error);
        setUnreadCount(0);
      } else {
        setUnreadCount(count || 0);
      }
    } catch (error) {
      console.error('Error fetching unread messages count:', error);
      setUnreadCount(0);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!user || channelRef.current) return;

    try {
      const channel = supabase
        .channel(`unread-messages-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'direct_messages',
            filter: `receiver_id=eq.${user.id}`
          },
          () => {
            fetchUnreadCount();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'direct_messages',
            filter: `receiver_id=eq.${user.id}`
          },
          () => {
            fetchUnreadCount();
          }
        );

      channel.subscribe((status) => {
        console.log('Unread messages subscription status:', status);
      });

      channelRef.current = channel;
    } catch (error) {
      console.error('Error setting up realtime subscription:', error);
    }
  };

  const markThreadAsRead = async (otherUserId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('direct_messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('sender_id', otherUserId)
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking thread as read:', error);
    }
  };

  return {
    unreadCount,
    refresh: fetchUnreadCount,
    markThreadAsRead
  };
};
