
import { X, Heart, MessageSquare, UserPlus, MapPin, Clock, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationsModal = ({ isOpen, onClose }: NotificationsModalProps) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
        return <UserPlus className="w-4 h-4 text-green-500" />;
      case 'friend_accepted':
        return <UserPlus className="w-4 h-4 text-blue-500" />;
      case 'location_like':
        return <Heart className="w-4 h-4 text-red-500" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'location':
        return <MapPin className="w-4 h-4 text-orange-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const handleNotificationClick = async (notification: any) => {
    if (!notification.is_read) {
      await markAsRead([notification.id]);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-16">
      <div className="bg-white rounded-lg w-full max-w-md mx-4 max-h-[80vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                {unreadCount}
              </span>
            )}
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Notifications List */}
        <div className="overflow-y-auto max-h-96 p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                    !notification.is_read 
                      ? "bg-blue-50 border-blue-200 hover:bg-blue-100" 
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  )}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900 mb-1">
                      <span className="font-medium">{notification.title}</span>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      {notification.message}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {new Date(notification.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Unread indicator */}
                  {!notification.is_read && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2"></div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && unreadCount > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <button 
              onClick={handleMarkAllAsRead}
              className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Mark all as read
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsModal;
