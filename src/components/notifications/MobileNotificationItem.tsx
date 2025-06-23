
import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Heart, MessageCircle, UserPlus, MapPin, Gift, ChevronRight } from 'lucide-react';

interface MobileNotificationItemProps {
  notification: {
    id: string;
    type: string;
    title: string;
    message: string;
    created_at: string;
    is_read: boolean;
    data?: any;
  };
  onMarkAsRead: (id: string) => void;
  onAction?: (notification: any) => void;
}

const MobileNotificationItem = ({ notification, onMarkAsRead, onAction }: MobileNotificationItemProps) => {
  const getIcon = () => {
    const iconProps = "w-4 h-4";
    switch (notification.type) {
      case 'like':
        return <Heart className={`${iconProps} text-red-500`} />;
      case 'comment':
        return <MessageCircle className={`${iconProps} text-blue-500`} />;
      case 'follow':
      case 'friend_request':
      case 'friend_accepted':
        return <UserPlus className={`${iconProps} text-green-500`} />;
      case 'place_recommendation':
        return <MapPin className={`${iconProps} text-purple-500`} />;
      case 'achievement':
        return <Gift className={`${iconProps} text-yellow-500`} />;
      default:
        return <div className={`${iconProps} bg-gray-400 rounded-full`} />;
    }
  };

  const getIconBackground = () => {
    switch (notification.type) {
      case 'like':
        return 'bg-red-50 border-red-100';
      case 'comment':
        return 'bg-blue-50 border-blue-100';
      case 'follow':
      case 'friend_request':
      case 'friend_accepted':
        return 'bg-green-50 border-green-100';
      case 'place_recommendation':
        return 'bg-purple-50 border-purple-100';
      case 'achievement':
        return 'bg-yellow-50 border-yellow-100';
      default:
        return 'bg-gray-50 border-gray-100';
    }
  };

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    if (onAction) {
      onAction(notification);
    }
  };

  return (
    <div 
      className={`flex items-center gap-3 p-4 border-b border-gray-50 cursor-pointer active:bg-gray-50 transition-colors ${
        !notification.is_read ? 'bg-blue-50/30' : 'bg-white'
      }`}
      onClick={handleClick}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-full border flex items-center justify-center ${getIconBackground()}`}>
        {getIcon()}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-1">
          <h4 className="font-semibold text-gray-900 text-sm leading-tight">{notification.title}</h4>
          {!notification.is_read && (
            <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1"></div>
          )}
        </div>
        <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 mb-1">{notification.message}</p>
        <p className="text-gray-400 text-xs">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
      
      {/* Arrow */}
      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
    </div>
  );
};

export default MobileNotificationItem;
