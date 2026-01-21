import { useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCursorPagination, useInfiniteScroll } from './useCursorPagination';
import { coalesce } from '@/lib/requestCoalescing';

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
 * Cursor-based pagination hook for notifications.
 * Uses infinite scroll pattern for efficient loading of large notification lists.
 * 
 * Benefits:
 * - No duplicate/skipped items when data changes
 * - Efficient memory usage with virtual scrolling
 * - Coalesced requests prevent thundering herd
 */
export function useNotificationsPaginated(options?: { pageSize?: number }) {
  const { user } = useAuth();
  const pageSize = options?.pageSize ?? 20;

  const parseData = (raw: any): Record<string, any> => {
    if (!raw) return {};
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        return {};
      }
    }
    if (typeof raw === 'object') return raw;
    return {};
  };

  const fetchPage = useCallback(async (cursor: string | null, limit: number) => {
    if (!user) {
      return { data: [], nextCursor: null, hasMore: false };
    }

    // Use request coalescing to prevent duplicate requests
    const cacheKey = `notifications:${user.id}:${cursor || 'initial'}:${limit}`;
    
    return coalesce(cacheKey, async () => {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .not('type', 'in', '(business_post,business_review,location_save,business_mention)')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (cursor) {
        query = query.lt('created_at', cursor);
      }

      const { data, error } = await query.limit(limit);

      if (error) {
        console.error('Error fetching notifications:', error);
        return { data: [], nextCursor: null, hasMore: false };
      }

      const notifications: Notification[] = (data || []).map(item => ({
        ...item,
        data: parseData(item.data),
      }));

      const hasMore = notifications.length === limit;
      const nextCursor = hasMore && notifications.length > 0
        ? notifications[notifications.length - 1].created_at
        : null;

      return { data: notifications, nextCursor, hasMore };
    });
  }, [user]);

  const {
    items: notifications,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    error,
    totalLoaded,
  } = useCursorPagination<Notification>({
    queryKey: ['notifications-paginated', user?.id],
    queryFn: fetchPage,
    pageSize,
    enabled: !!user,
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60_000, // 5 minutes
  });

  // Calculate unread count from loaded items
  const unreadCount = useMemo(() => 
    notifications.filter(n => !n.is_read).length,
    [notifications]
  );

  // Mark notifications as read
  const markAsRead = useCallback(async (notificationIds: string[]) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', notificationIds)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error marking notifications as read:', error);
        return { success: false, error: error.message };
      }

      // Refetch to update local state
      refetch();
      return { success: true };
    } catch (err) {
      console.error('Error marking notifications as read:', err);
      return { success: false, error: 'Failed to mark notifications as read' };
    }
  }, [user, refetch]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting notification:', error);
        return { success: false, error: error.message };
      }

      refetch();
      return { success: true };
    } catch (err) {
      console.error('Error deleting notification:', err);
      return { success: false, error: 'Failed to delete notification' };
    }
  }, [user, refetch]);

  // Infinite scroll hook for easy integration
  const infiniteScrollProps = useInfiniteScroll({
    onLoadMore: fetchNextPage,
    hasMore: hasNextPage,
    isLoading: isFetchingNextPage,
    threshold: 300,
  });

  return {
    notifications,
    unreadCount,
    loading: isLoading,
    isFetchingMore: isFetchingNextPage,
    hasMore: hasNextPage,
    fetchMore: fetchNextPage,
    markAsRead,
    deleteNotification,
    refresh: refetch,
    error,
    totalLoaded,
    infiniteScrollProps,
  };
}
