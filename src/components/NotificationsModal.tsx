
import { useState, useEffect } from 'react';
import { X, Heart, MessageSquare, UserPlus, MapPin, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notificationService, Notification } from '@/services/notificationService';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationsModal = ({ isOpen, onClose }: NotificationsModalProps) => {
  const [selectedTab, setSelectedTab] = useState<'all' | 'following'>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    setLoading(true);
    const notificationsData = await notificationService.getNotifications();
    setNotifications(notificationsData);
    setLoading(false);
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await notificationService.markAsRead(notification.id);
      setNotifications(prev => 
        prev.map(n => 
          n.id === notification.id ? { ...n, is_read: true } : n
        )
      );
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-red-500 fill-red-500" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'follow':
        return <UserPlus className="w-4 h-4 text-green-500" />;
      case 'location':
        return <MapPin className="w-4 h-4 text-orange-500" />;
      case 'share':
        return <Send className="w-4 h-4 text-purple-500" />;
      default:
        return null;
    }
  };

  const formatNotificationMessage = (notification: Notification) => {
    if (notification.type === 'location' && notification.metadata?.locationName) {
      return `${notification.message} ${notification.metadata.locationName}`;
    }
    if (notification.type === 'share' && notification.metadata?.locationName) {
      return `${notification.message}: ${notification.metadata.locationName}`;
    }
    return notification.message;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-16">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Notifications</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setSelectedTab('all')}
            className={cn(
              "flex-1 py-3 text-sm font-medium",
              selectedTab === 'all' 
                ? "text-blue-600 border-b-2 border-blue-600" 
                : "text-gray-500"
            )}
          >
            All
          </button>
          <button
            onClick={() => setSelectedTab('following')}
            className={cn(
              "flex-1 py-3 text-sm font-medium",
              selectedTab === 'following' 
                ? "text-blue-600 border-b-2 border-blue-600" 
                : "text-gray-500"
            )}
          >
            Following
          </button>
        </div>

        {/* Notifications List */}
        <div className="overflow-y-auto max-h-96">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Heart className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={cn(
                  "flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer",
                  !notification.is_read && "bg-blue-50"
                )}
              >
                {/* User Avatar */}
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    {notification.sender?.avatar_url ? (
                      <img 
                        src={notification.sender.avatar_url} 
                        alt={notification.sender.full_name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-medium">
                        {notification.sender?.full_name?.[0] || 'U'}
                      </span>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">
                    {getNotificationIcon(notification.type)}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    <span className="font-medium">{notification.sender?.full_name || 'Someone'}</span>
                    <span className="text-gray-600 ml-1">{formatNotificationMessage(notification)}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(notification.created_at).toLocaleDateString()}
                  </div>
                </div>

                {/* Unread indicator */}
                {!notification.is_read && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsModal;
