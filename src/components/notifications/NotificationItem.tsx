
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, UserPlus, MapPin, Gift } from 'lucide-react';

interface NotificationItemProps {
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

const NotificationItem = ({ notification, onMarkAsRead, onAction }: NotificationItemProps) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'like':
        return <Heart className="w-4 h-4 text-red-500" />;
      case 'comment':
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'follow':
      case 'friend_request':
      case 'friend_accepted':
        return <UserPlus className="w-4 h-4 text-green-500" />;
      case 'place_recommendation':
        return <MapPin className="w-4 h-4 text-purple-500" />;
      case 'achievement':
        return <Gift className="w-4 h-4 text-yellow-500" />;
      default:
        return <div className="w-4 h-4 bg-gray-400 rounded-full" />;
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
      className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors duration-300 ${
        !notification.is_read ? 'bg-blue-50' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-white rounded-full shadow-sm border">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium text-gray-900 text-sm">{notification.title}</h4>
              <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
              <p className="text-xs text-gray-400 mt-2">
                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
              </p>
            </div>
            
            {!notification.is_read && (
              <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1 transition-opacity"></div>
            )}
          </div>
          
          {/* Action buttons for friend requests */}
          {notification.type === 'friend_request' && notification.data?.status === 'pending' && (
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="default" className="text-xs px-3 py-1">
                Accept
              </Button>
              <Button size="sm" variant="outline" className="text-xs px-3 py-1">
                Decline
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;
