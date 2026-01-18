import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import MobileNotificationItem from '@/components/notifications/MobileNotificationItem';
import { useTranslation } from 'react-i18next';

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification, refresh } = useNotifications();
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);
  // Mark all as read when page loads and whenever there are unread notifications
  // This ensures new notifications (e.g. after accepting a follow request) are also marked as read
  useEffect(() => {
    if (!loading && notifications.length > 0 && unreadCount > 0) {
      const timer = setTimeout(() => {
        markAllAsRead();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, notifications.length, unreadCount, markAllAsRead]);

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead([notificationId]);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleNotificationClick = (notification: any) => {
    // Mark as read
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'follow':
        if (notification.data?.user_id) {
          navigate(`/profile/${notification.data.user_id}`);
        }
        break;
      case 'like':
      case 'comment':
        if (notification.data?.post_id) {
          // Open the post directly
          navigate(`/post/${notification.data.post_id}`, { state: { fromNotifications: true } });
        }
        break;
      case 'story_like':
        // Open own profile to see your stories
        navigate(`/profile`);
        break;
      case 'story_reply':
        // For story replies, open messages with that user
        if (notification.data?.user_id) {
          navigate('/messages', { state: { initialUserId: notification.data.user_id } });
        }
        break;
      default:
        break;
    }
  };

  // Group notifications: likes by post, dedupe identical ones
  const groupedNotifications = useMemo(() => {
    const likeGroups = new Map<string, any>();
    const others: any[] = [];

    for (const n of notifications) {
      if (n.type === 'like' && n.data?.post_id) {
        const groupKey = `like:${n.data.post_id}`;
        const userInfo = {
          id: n.data?.user_id || '',
          name: n.data?.user_name || n.data?.username || 'User',
          avatar: n.data?.user_avatar || n.data?.avatar_url || ''
        };
        const existing = likeGroups.get(groupKey);
        if (existing) {
          if (userInfo.id && !existing.data.grouped_users.find((u: any) => u.id === userInfo.id)) {
            existing.data.grouped_users.push(userInfo);
          }
          existing.data.total_count += 1;
          existing.data.grouped_notification_ids.push(n.id);
          if (new Date(n.created_at) > new Date(existing.created_at)) existing.created_at = n.created_at;
          existing.is_read = existing.is_read && n.is_read;
        } else {
          likeGroups.set(groupKey, {
            ...n,
            __groupKey: groupKey,
            data: {
              ...n.data,
              grouped_users: [userInfo],
              total_count: 1,
              grouped_notification_ids: [n.id],
            }
          });
        }
      } else {
        // dedupe exact duplicates
        const dupKey = `${n.type}:${n.data?.user_id || ''}:${n.data?.post_id || ''}:${n.data?.comment_id || ''}:${n.message}`;
        if (!others.find(o => (o as any).__dupKey === dupKey)) {
          (n as any).__dupKey = dupKey;
          others.push(n);
        }
      }
    }

    const grouped = [...Array.from(likeGroups.values()), ...others];
    grouped.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return grouped;
  }, [notifications]);

  return (
    <div className="h-screen w-full bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header 
        className="shrink-0 bg-background w-full"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}
      >
        <div className="py-3 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate('/')}
              variant="ghost"
              size="icon"
              className="rounded-full"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-bold text-xl text-foreground">{t('title', { ns: 'notifications' })}</h1>
          </div>
        </div>
      </header>

      {/* Content - Full width without padding */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-muted-foreground text-sm">Loading notifications…</span>
            </div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-3">
              <Bell className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">All caught up!</h3>
            <p className="text-muted-foreground text-sm">No new notifications</p>
          </div>
        ) : (
          <div className="w-full">
            {groupedNotifications.map((notification) => (
              <MobileNotificationItem
                key={(notification as any).__groupKey || notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onAction={handleNotificationClick}
                onRefresh={refresh}
                onDelete={async (id) => {
                  // For grouped likes we store the real row ids in data.grouped_notification_ids
                  const ids: string[] = notification.data?.grouped_notification_ids || [id];
                  // Delete all in parallel, return a single result
                  const results = await Promise.all(ids.map((nid) => deleteNotification(nid)));
                  const failed = results.find((r) => !r.success);
                  return failed || { success: true };
                }}
                openSwipeId={openSwipeId}
                onSwipeOpen={setOpenSwipeId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
