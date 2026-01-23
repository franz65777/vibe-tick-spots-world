import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeEvent } from './useCentralizedRealtime';

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

/**
 * Hook for managing user notifications
 * 
 * OPTIMIZED: Uses centralized realtime instead of individual channels
 * Reduces connections from 2 per user (notifications + follows) to 0
 */
export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef(user?.id);

  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchNotifications();
  }, [user?.id]);

  useEffect(() => {
    const unread = notifications.filter(n => !n.is_read).length;
    setUnreadCount(unread);
  }, [notifications]);

  const parseData = useCallback((raw: any): Record<string, any> => {
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
  }, []);

  const fetchNotifications = async () => {
    if (!user) return;

    const pruneOrphaned = async (list: Notification[]) => {
      const postIds = Array.from(
        new Set(list.map((n) => n.data?.post_id).filter(Boolean) as string[])
      );
      const commentIds = Array.from(
        new Set(list.map((n) => n.data?.comment_id).filter(Boolean) as string[])
      );
      
      const followNotifications = list.filter(n => n.type === 'follow' && n.data?.user_id);
      const followerUserIds = Array.from(
        new Set(followNotifications.map(n => n.data?.user_id).filter(Boolean) as string[])
      );

      const followAcceptedNotifications = list.filter(n => n.type === 'follow_accepted' && n.data?.user_id);
      const followAcceptedUserIds = Array.from(
        new Set(followAcceptedNotifications.map(n => n.data?.user_id).filter(Boolean) as string[])
      );

      const [postsRes, commentsRes, followsRes, myFollowsRes] = await Promise.all([
        postIds.length
          ? supabase.from('posts').select('id').in('id', postIds)
          : Promise.resolve({ data: [] as any[], error: null as any }),
        commentIds.length
          ? supabase.from('comments').select('id').in('id', commentIds)
          : Promise.resolve({ data: [] as any[], error: null as any }),
        followerUserIds.length
          ? supabase.from('follows').select('follower_id').eq('following_id', user.id).in('follower_id', followerUserIds)
          : Promise.resolve({ data: [] as any[], error: null as any }),
        followAcceptedUserIds.length
          ? supabase.from('follows').select('following_id').eq('follower_id', user.id).in('following_id', followAcceptedUserIds)
          : Promise.resolve({ data: [] as any[], error: null as any }),
      ]);

      const existingPostIds = new Set((postsRes.data || []).map((p: any) => p.id));
      const existingCommentIds = new Set((commentsRes.data || []).map((c: any) => c.id));
      const activeFollowerIds = new Set((followsRes.data || []).map((f: any) => f.follower_id));
      const myActiveFollowingIds = new Set((myFollowsRes.data || []).map((f: any) => f.following_id));

      const invalidIds = list
        .filter((n) => {
          const pid = n.data?.post_id as string | undefined;
          const cid = n.data?.comment_id as string | undefined;
          if (pid && !existingPostIds.has(pid)) return true;
          if (cid && !existingCommentIds.has(cid)) return true;
          if (n.type === 'follow' && n.data?.user_id) {
            if (!activeFollowerIds.has(n.data.user_id)) return true;
          }
          if (n.type === 'follow_accepted' && n.data?.user_id) {
            if (!myActiveFollowingIds.has(n.data.user_id)) return true;
          }
          return false;
        })
        .map((n) => n.id);

      if (invalidIds.length > 0) {
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

  // Handle notification insert from centralized realtime
  const handleNotificationInsert = useCallback(async (payload: any) => {
    if (!userIdRef.current) return;
    
    console.log('New notification received via centralized channel:', payload);

    const parsedData = parseData(payload.data);

    // Check if the notification is from a muted user
    const notifUserId = parsedData?.user_id;
    if (notifUserId) {
      const { data: mutedSetting } = await supabase
        .from('user_mutes')
        .select('is_muted')
        .eq('muter_id', userIdRef.current)
        .eq('muted_user_id', notifUserId)
        .maybeSingle();

      if (mutedSetting?.is_muted) {
        console.log('Notification from muted user, ignoring');
        return;
      }
    }

    // Validate post/comment references exist
    try {
      const pid = parsedData?.post_id as string | undefined;
      const cid = parsedData?.comment_id as string | undefined;

      if (pid) {
        const { data: p } = await supabase.from('posts').select('id').eq('id', pid).maybeSingle();
        if (!p) {
          await supabase.from('notifications').delete().eq('id', payload.id).eq('user_id', userIdRef.current);
          return;
        }
      }

      if (cid) {
        const { data: c } = await supabase.from('comments').select('id').eq('id', cid).maybeSingle();
        if (!c) {
          await supabase.from('notifications').delete().eq('id', payload.id).eq('user_id', userIdRef.current);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to validate notification references:', e);
    }

    const newNotification = {
      ...payload,
      data: parsedData,
    } as Notification;
    setNotifications((prev) => [newNotification, ...prev]);
  }, [parseData]);

  // Handle notification update from centralized realtime
  const handleNotificationUpdate = useCallback((payload: any) => {
    console.log('Notification updated via centralized channel:', payload);
    
    const parsedData = parseData(payload.data);
    
    const updatedNotification = {
      ...payload,
      data: parsedData
    } as Notification;
    setNotifications(prev => 
      prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
    );
  }, [parseData]);

  // Handle notification delete from centralized realtime
  const handleNotificationDelete = useCallback((payload: any) => {
    console.log('Notification deleted via centralized channel:', payload);
    setNotifications(prev => 
      prev.filter(n => n.id !== payload.id)
    );
  }, []);

  // Handle follow delete - remove stale follow notifications
  const handleFollowDelete = useCallback((payload: any) => {
    console.log('Follow deleted, removing related notification:', payload);
    const unfollowerId = payload?.follower_id;
    if (unfollowerId) {
      setNotifications(prev => 
        prev.filter(n => !(n.type === 'follow' && n.data?.user_id === unfollowerId))
      );
    }
  }, []);

  // Subscribe to centralized realtime events
  useRealtimeEvent('notification_insert', handleNotificationInsert);
  useRealtimeEvent('notification_update', handleNotificationUpdate);
  useRealtimeEvent('notification_delete', handleNotificationDelete);
  useRealtimeEvent('follow_delete', handleFollowDelete);

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
      setNotifications(prev => prev.filter(n => n.id !== notificationId));

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting notification:', error);
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
