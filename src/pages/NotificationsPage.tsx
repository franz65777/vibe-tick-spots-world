import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import MobileNotificationItem from '@/components/notifications/MobileNotificationItem';
import { useTranslation } from 'react-i18next';

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();

  // Mark all as read when page loads
  useEffect(() => {
    if (notifications.length > 0 && unreadCount > 0) {
      const timer = setTimeout(() => {
        markAllAsRead();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

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
        if (notification.data?.post_id) {
          // Open the post directly
          navigate(`/profile`, { state: { openPostId: notification.data.post_id } });
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

  return (
    <div className="h-screen w-full bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 bg-background w-full">
        <div className="py-3 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate(-1)}
              variant="ghost"
              size="icon"
              className="rounded-full"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-bold text-xl text-foreground">{t('title', { ns: 'notifications' })}</h1>
          </div>
          
          {unreadCount > 0 && (
            <Button
              onClick={handleMarkAllAsRead}
              variant="ghost"
              size="sm"
              className="text-sm font-medium"
            >
              Mark all read
            </Button>
          )}
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
            {notifications.map((notification) => (
              <MobileNotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onAction={handleNotificationClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
