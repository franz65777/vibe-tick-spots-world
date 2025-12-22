import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/hooks/useNotifications';
import MobileNotificationItem from '@/components/notifications/MobileNotificationItem';
import { useTranslation } from 'react-i18next';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationsModal = ({ isOpen, onClose }: NotificationsModalProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();

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
          // Navigate to own profile to see the liked post
          navigate(`/profile`);
        }
        break;
      default:
        break;
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="bg-background rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md h-[85vh] sm:h-[70vh] overflow-hidden flex flex-col shadow-xl border-t border-border">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-xl text-foreground">{t('notifications', { ns: 'common' })}</h3>
            {unreadCount > 0 && (
              <div className="px-2 py-0.5 bg-primary text-primary-foreground text-xs font-bold rounded-full min-w-[20px] text-center">
                {unreadCount}
              </div>
            )}
          </div>
          
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="rounded-full h-8 w-8"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content - Full width without padding */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-muted-foreground text-sm">
                  {t('loadingNotifications', { ns: 'notifications' })}
                </span>
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-3">
                <Bell className="w-7 h-7 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">
                {t('allCaughtUp', { ns: 'notifications' })}
              </h3>
              <p className="text-muted-foreground text-sm">
                {t('noNewNotifications', { ns: 'notifications' })}
              </p>
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
        </ScrollArea>
      </div>
    </div>
  );
};

export default NotificationsModal;
