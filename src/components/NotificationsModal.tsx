
import { useState } from 'react';
import { X, Heart, MessageSquare, UserPlus, MapPin } from 'lucide-react';
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
  const [selectedTab, setSelectedTab] = useState<'all' | 'following'>('all');

  const mockNotifications: Notification[] = [
    {
      id: '1',
      type: 'like',
      user: { name: 'Emma', avatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png' },
      message: 'liked your story',
      time: '2m',
      isRead: false,
    },
    {
      id: '2',
      type: 'follow',
      user: { name: 'Michael', avatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png' },
      message: 'started following you',
      time: '1h',
      isRead: false,
    },
    {
      id: '3',
      type: 'location',
      user: { name: 'Sophia', avatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png' },
      message: 'saved',
      time: '3h',
      isRead: true,
      locationName: 'Golden Gate Cafe',
    },
    {
      id: '4',
      type: 'comment',
      user: { name: 'James', avatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png' },
      message: 'commented on your location',
      time: '1d',
      isRead: true,
    },
  ];

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
      default:
        return null;
    }
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
          {mockNotifications.map((notification) => (
            <div
              key={notification.id}
              className={cn(
                "flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer",
                !notification.isRead && "bg-blue-50"
              )}
            >
              {/* User Avatar */}
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-sm font-medium">{notification.user.name[0]}</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">
                  {getNotificationIcon(notification.type)}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="text-sm">
                  <span className="font-medium">{notification.user.name}</span>
                  <span className="text-gray-600 ml-1">{notification.message}</span>
                  {notification.locationName && (
                    <span className="font-medium ml-1">{notification.locationName}</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">{notification.time}</div>
              </div>

              {/* Unread indicator */}
              {!notification.isRead && (
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NotificationsModal;
