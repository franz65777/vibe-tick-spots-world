
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

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id]);

  useEffect(() => {
    const unread = notifications.filter(n => !n.is_read).length;
    setUnreadCount(unread);
  }, [notifications]);

  const fetchNotifications = async () => {
    if (!user) return;

    const parseData = (raw: any): Record<string, any> => {
      if (!raw) return {};
      if (typeof raw === 'string') {
        try {
          return JSON.parse(raw);
        } catch (e) {
          console.error('Error parsing notification data:', e);
          return {};
        }
      }
      if (typeof raw === 'object') return raw as Record<string, any>;
      return {};
    };

    const pruneOrphaned = async (list: Notification[]) => {
      // Remove notifications that reference content that no longer exists (e.g. deleted post/comment)
      const postIds = Array.from(
        new Set(list.map((n) => n.data?.post_id).filter(Boolean) as string[])
      );
      const commentIds = Array.from(
        new Set(list.map((n) => n.data?.comment_id).filter(Boolean) as string[])
      );

      if (postIds.length === 0 && commentIds.length === 0) return list;

      const [postsRes, commentsRes] = await Promise.all([
        postIds.length
          ? supabase.from('posts').select('id').in('id', postIds)
          : Promise.resolve({ data: [] as any[], error: null as any }),
        commentIds.length
          ? supabase.from('comments').select('id').in('id', commentIds)
          : Promise.resolve({ data: [] as any[], error: null as any }),
      ]);

      const existingPostIds = new Set((postsRes.data || []).map((p: any) => p.id));
      const existingCommentIds = new Set((commentsRes.data || []).map((c: any) => c.id));

      const invalidIds = list
        .filter((n) => {
          const pid = n.data?.post_id as string | undefined;
          const cid = n.data?.comment_id as string | undefined;
          if (pid && !existingPostIds.has(pid)) return true;
          if (cid && !existingCommentIds.has(cid)) return true;
          return false;
        })
        .map((n) => n.id);

      if (invalidIds.length > 0) {
        // Best-effort cleanup; don't block rendering
        supabase
          .from('notifications')
          .delete()
          .in('id', invalidIds)
          .eq('user_id', user.id)
          .then(({ error }) => {
            if (error) console.warn('Failed to delete orphaned notifications:', error);
          });
      }

      return list.filter((n) => !invalidIds.includes(n.id));
    };

    try {
      console.log('Fetching notifications for user:', user.id);

      // Fetch notifications and muted users in parallel for better performance
      const [notificationsResult, mutedResult] = await Promise.all([
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .not('type', 'in', '(business_post,business_review,location_save,business_mention)')
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('user_mutes')
          .select('muted_user_id')
          .eq('muter_id', user.id)
          .eq('is_muted', true),
      ]);

      const { data, error } = notificationsResult;
      const mutedUserIds = mutedResult.data?.map((s) => s.muted_user_id).filter(Boolean) || [];

      if (error) {
        console.error('Error fetching notifications:', error);
        setNotifications([]);
      } else {
        console.log('Notifications fetched successfully:', data?.length || 0);

        const transformedData = (data || [])
          .map((item) => ({
            ...item,
            data: parseData(item.data),
          }))
          .filter((notification) => {
            const notifUserId = (notification as any).data?.user_id;
            return !notifUserId || !mutedUserIds.includes(notifUserId);
          }) as Notification[];

        const cleaned = await pruneOrphaned(transformedData);
        setNotifications(cleaned);
      }

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
          async (payload) => {
            console.log('New notification received:', payload);

            const parseData = (raw: any): Record<string, any> => {
              if (!raw) return {};
              if (typeof raw === 'string') {
                try {
                  return JSON.parse(raw);
                } catch (e) {
                  console.error('Error parsing realtime notification data:', e);
                  return {};
                }
              }
              if (typeof raw === 'object') return raw as Record<string, any>;
              return {};
            };

            const parsedData = parseData(payload.new.data);

            // Check if the notification is from a muted user
            const notifUserId = parsedData?.user_id;
            if (notifUserId) {
              const { data: mutedSetting } = await supabase
                .from('user_mutes')
                .select('is_muted')
                .eq('muter_id', user.id)
                .eq('muted_user_id', notifUserId)
                .maybeSingle();

              if (mutedSetting?.is_muted) {
                console.log('Notification from muted user, ignoring');
                return;
              }
            }

            // Drop + delete notifications that reference deleted content
            try {
              const pid = parsedData?.post_id as string | undefined;
              const cid = parsedData?.comment_id as string | undefined;

              if (pid) {
                const { data: p } = await supabase.from('posts').select('id').eq('id', pid).maybeSingle();
                if (!p) {
                  await supabase.from('notifications').delete().eq('id', payload.new.id).eq('user_id', user.id);
                  return;
                }
              }

              if (cid) {
                const { data: c } = await supabase.from('comments').select('id').eq('id', cid).maybeSingle();
                if (!c) {
                  await supabase.from('notifications').delete().eq('id', payload.new.id).eq('user_id', user.id);
                  return;
                }
              }
            } catch (e) {
              // If validation fails, we still show the notification (best-effort)
              console.warn('Failed to validate notification references:', e);
            }

            const newNotification = {
              ...payload.new,
              data: parsedData,
            } as Notification;
            setNotifications((prev) => [newNotification, ...prev]);
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
            
            // Parse data properly
            let parsedData: Record<string, any> = {};
            if (typeof payload.new.data === 'string') {
              try {
                parsedData = JSON.parse(payload.new.data);
              } catch (e) {
                console.error('Error parsing updated notification data:', e);
              }
            } else if (payload.new.data && typeof payload.new.data === 'object') {
              parsedData = payload.new.data as Record<string, any>;
            }
            
            const updatedNotification = {
              ...payload.new,
              data: parsedData
            } as Notification;
            setNotifications(prev => 
              prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
            );
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Notification deleted:', payload);
            setNotifications(prev => 
              prev.filter(n => n.id !== payload.old.id)
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

  const sendNotification = async (
    userId: string,
    type: string,
    title: string,
    message: string,
    data: Record<string, any> = {}
  ) => {
    try {
      console.log('Sending notification:', { userId, type, title, message });
      
      const { error } = await supabase.functions.invoke('notifications/send', {
        body: { userId, type, title, message, data }
      });

      if (error) {
        console.error('Error sending notification:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending notification:', error);
      return { success: false, error: 'Failed to send notification' };
    }
  };

  const markAsRead = async (notificationIds: string[]) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      console.log('Marking notifications as read:', notificationIds);
      
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', notificationIds)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error marking notifications as read:', error);
        return { success: false, error: error.message };
      }

      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          notificationIds.includes(n.id) ? { ...n, is_read: true } : n
        )
      );

      return { success: true };
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

  const deleteNotification = async (notificationId: string) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      // Optimistically remove from local state first
      setNotifications(prev => prev.filter(n => n.id !== notificationId));

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting notification:', error);
        // Refetch to restore state if delete failed
        fetchNotifications();
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting notification:', error);
      fetchNotifications();
      return { success: false, error: 'Failed to delete notification' };
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    sendNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: fetchNotifications
  };
};
