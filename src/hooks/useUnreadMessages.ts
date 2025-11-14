import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useUnreadMessages = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        // Count distinct users who sent unread messages
        const { data, error } = await supabase
          .from('direct_messages')
          .select('sender_id')
          .eq('receiver_id', user.id)
          .eq('is_read', false);

        if (error) throw error;
        
        // Count unique sender IDs
        const uniqueSenders = new Set(data?.map(msg => msg.sender_id) || []);
        setUnreadCount(uniqueSenders.size);
      } catch (error) {
        console.error('Error fetching unread messages:', error);
      }
    };

    fetchUnreadCount();

    // Subscribe to real-time updates with unique channel per user
    const suffix = Math.random().toString(36).slice(2);
    const channel = supabase
      .channel(`unread-messages-${user.id}-${suffix}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'direct_messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { unreadCount };
};
