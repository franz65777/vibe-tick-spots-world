
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
  expires_at: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchNotifications();
    setupRealtimeSubscription();

    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id]); // Only depend on user.id to avoid unnecessary re-subscriptions

  useEffect(() => {
    const unread = notifications.filter(n => !n.is_read).length;
    setUnreadCount(unread);
  }, [notifications]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('notifications/user');
      
      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      setNotifications(data.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!user || channelRef.current) return;

    try {
      const channel = supabase
        .channel(`notifications-changes-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('New notification received:', payload);
            setNotifications(prev => [payload.new as Notification, ...prev]);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Notification updated:', payload);
            setNotifications(prev => 
              prev.map(n => n.id === payload.new.id ? payload.new as Notification : n)
            );
          }
        );

      channel.subscribe((status) => {
        console.log('Notification subscription status:', status);
      });

      channelRef.current = channel;
    } catch (error) {
      console.error('Error setting up realtime subscription:', error);
    }
  };

  const markAsRead = async (notificationIds: string[]) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const { data, error } = await supabase.functions.invoke('notifications/read', {
        body: { notificationIds }
      });

      if (error) {
        console.error('Error marking notifications as read:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data.data };
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      return { success: false, error: 'Failed to mark notifications as read' };
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return { success: true };

    return await markAsRead(unreadIds);
  };

  const sendNotification = async (userId: string, type: string, title: string, message: string, data = {}) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const { data: result, error } = await supabase.functions.invoke('notifications/send', {
        body: { userId, type, title, message, data }
      });

      if (error) {
        console.error('Error sending notification:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: result.data };
    } catch (error) {
      console.error('Error sending notification:', error);
      return { success: false, error: 'Failed to send notification' };
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    sendNotification,
    refresh: fetchNotifications
  };
};
