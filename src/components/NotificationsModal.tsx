
import { useState } from 'react';
import { X, Heart, MessageSquare, UserPlus, MapPin, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'location';
  user: {
    name: string;
    avatar: string;
  };
  message: string;
  time: string;
  isRead: boolean;
  locationName?: string;
}

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationsModal = ({ isOpen, onClose }: NotificationsModalProps) => {
  const [selectedTab, setSelectedTab] = useState<'all' | 'unread'>('all');

  const mockNotifications: Notification[] = [
    {
      id: '1',
      type: 'like',
      user: { name: 'Emma Wilson', avatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png' },
      message: 'liked your location recommendation',
      time: '2 minutes ago',
      isRead: false,
    },
    {
      id: '2',
      type: 'follow',
      user: { name: 'Michael Chen', avatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png' },
      message: 'started following you',
      time: '1 hour ago',
      isRead: false,
    },
    {
      id: '3',
      type: 'location',
      user: { name: 'Sophia Rodriguez', avatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png' },
      message: 'saved your location',
      time: '3 hours ago',
      isRead: true,
      locationName: 'Golden Gate Cafe',
    },
    {
      id: '4',
      type: 'comment',
      user: { name: 'James Park', avatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png' },
      message: 'commented on your post',
      time: '1 day ago',
      isRead: true,
    },
  ];

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-red-500" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'follow':
        return <UserPlus className="w-4 h-4 text-green-500" />;
      case 'location':
        return <MapPin className="w-4 h-4 text-orange-500" />;
      default:
        return null;
    }
  };

  const filteredNotifications = selectedTab === 'unread' 
    ? mockNotifications.filter(n => !n.isRead)
    : mockNotifications;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-16">
      <div className="bg-white rounded-lg w-full max-w-md mx-4 max-h-[80vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 mx-4 mt-4 rounded-lg p-1">
          <button
            onClick={() => setSelectedTab('all')}
            className={cn(
              "flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all",
              selectedTab === 'all' 
                ? "bg-white text-gray-900 shadow-sm" 
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            All ({mockNotifications.length})
          </button>
          <button
            onClick={() => setSelectedTab('unread')}
            className={cn(
              "flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all",
              selectedTab === 'unread' 
                ? "bg-white text-gray-900 shadow-sm" 
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            Unread ({mockNotifications.filter(n => !n.isRead).length})
          </button>
        </div>

        {/* Notifications List */}
        <div className="overflow-y-auto max-h-96 p-4">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                    !notification.isRead 
                      ? "bg-blue-50 border-blue-200 hover:bg-blue-100" 
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  )}
                >
                  {/* User Avatar with Icon */}
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                      <span className="text-sm font-medium text-gray-600">
                        {notification.user.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center border-2 border-white">
                      {getNotificationIcon(notification.type)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900 mb-1">
                      <span className="font-medium">{notification.user.name}</span>
                      <span className="ml-1">{notification.message}</span>
                      {notification.locationName && (
                        <span className="font-medium text-blue-600 ml-1">"{notification.locationName}"</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {notification.time}
                    </div>
                  </div>

                  {/* Unread indicator */}
                  {!notification.isRead && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2"></div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium">
            Mark all as read
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationsModal;
