
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { getDateFnsLocale } from '@/utils/dateFnsLocales';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, UserPlus, MapPin, Gift, Star, Camera, Calendar, Tag, Megaphone, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  const { t, i18n } = useTranslation();
  const [currentUserData, setCurrentUserData] = useState<{name: string, avatar: string} | null>(null);
  
  // Fetch current user data dynamically for notifications with user_id
  useEffect(() => {
    const fetchUserData = async () => {
      if (notification.data?.user_id) {
        const { data } = await supabase
          .from('profiles')
          .select('username, full_name, avatar_url')
          .eq('id', notification.data.user_id)
          .single();
        
        if (data) {
          setCurrentUserData({
            name: data.full_name || data.username || 'Unknown',
            avatar: data.avatar_url || ''
          });
        }
      }
    };
    
    fetchUserData();
  }, [notification.data?.user_id]);
  
  const getNotificationStyle = () => {
    const styles = {
      like: {
        icon: <Heart className="w-5 h-5 text-white" />,
        gradient: 'bg-gradient-to-r from-pink-500 to-red-500',
        bgColor: 'bg-pink-50',
        borderColor: 'border-pink-200'
      },
      comment: {
        icon: <MessageCircle className="w-5 h-5 text-white" />,
        gradient: 'bg-gradient-to-r from-blue-500 to-cyan-500',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      },
      follow: {
        icon: <UserPlus className="w-5 h-5 text-white" />,
        gradient: 'bg-gradient-to-r from-green-500 to-emerald-500',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      },
      friend_request: {
        icon: <UserPlus className="w-5 h-5 text-white" />,
        gradient: 'bg-gradient-to-r from-purple-500 to-violet-500',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200'
      },
      friend_accepted: {
        icon: <Star className="w-5 h-5 text-white" />,
        gradient: 'bg-gradient-to-r from-yellow-500 to-orange-500',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200'
      },
      place_recommendation: {
        icon: <MapPin className="w-5 h-5 text-white" />,
        gradient: 'bg-gradient-to-r from-indigo-500 to-purple-500',
        bgColor: 'bg-indigo-50',
        borderColor: 'border-indigo-200'
      },
      achievement: {
        icon: <Gift className="w-5 h-5 text-white" />,
        gradient: 'bg-gradient-to-r from-amber-500 to-yellow-500',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200'
      },
      post_like: {
        icon: <Heart className="w-5 h-5 text-white" />,
        gradient: 'bg-gradient-to-r from-rose-500 to-pink-500',
        bgColor: 'bg-rose-50',
        borderColor: 'border-rose-200'
      },
      story_like: {
        icon: <Camera className="w-5 h-5 text-white" />,
        gradient: 'bg-gradient-to-r from-purple-500 to-pink-500',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200'
      },
      event: {
        icon: <Calendar className="w-5 h-5 text-white" />,
        gradient: 'bg-gradient-to-r from-blue-600 to-indigo-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      },
      discount: {
        icon: <Tag className="w-5 h-5 text-white" />,
        gradient: 'bg-gradient-to-r from-green-600 to-emerald-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      },
      announcement: {
        icon: <Megaphone className="w-5 h-5 text-white" />,
        gradient: 'bg-gradient-to-r from-orange-600 to-red-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200'
      },
      special_offer: {
        icon: <Sparkles className="w-5 h-5 text-white" />,
        gradient: 'bg-gradient-to-r from-purple-600 to-pink-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200'
      }
    };
    
    return styles[notification.type as keyof typeof styles] || {
      icon: <div className="w-5 h-5 bg-white rounded-full" />,
      gradient: 'bg-gradient-to-r from-gray-500 to-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    };
  };

  const style = getNotificationStyle();

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    if (onAction) {
      onAction(notification);
    }
  };

  const getUserAvatar = () => {
    // Use dynamically fetched data if available
    if (currentUserData) {
      return currentUserData.avatar;
    }
    // Fallback to notification data
    if (notification.data?.user_avatar) {
      return notification.data.user_avatar;
    }
    return null;
  };

  const getUserName = () => {
    // Use dynamically fetched data if available
    if (currentUserData) {
      return currentUserData.name;
    }
    // Fallback to notification data
    if (notification.data?.user_name) {
      return notification.data.user_name;
    }
    return 'Someone';
  };

  return (
    <div 
      className={`relative p-4 cursor-pointer transition-all duration-300 hover:shadow-md ${
        !notification.is_read 
          ? `${style.bgColor} ${style.borderColor} border-l-4 hover:bg-opacity-80` 
          : 'hover:bg-gray-50'
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-4">
        {/* Icon with gradient background */}
        <div className={`relative p-3 rounded-full ${style.gradient} shadow-lg flex-shrink-0`}>
          {style.icon}
          
          {/* User avatar overlay for user-related notifications */}
          {['like', 'comment', 'follow', 'friend_request', 'friend_accepted', 'story_like', 'post_like'].includes(notification.type) && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full p-0.5 shadow-md">
              <Avatar className="h-5 w-5">
                <AvatarImage src={getUserAvatar()} />
                <AvatarFallback className="text-xs">
                  {getUserName().charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 text-sm leading-tight">
                {notification.title}
              </h4>
              <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                {notification.message}
              </p>
              
              {/* Location or post preview for relevant notifications */}
              {notification.data?.place_name && (
                <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                  <MapPin className="w-3 h-3" />
                  <span>{notification.data.place_name}</span>
                </div>
              )}
              
              {notification.data?.post_image && (
                <div className="mt-2">
                  <img 
                    src={notification.data.post_image} 
                    alt="Post preview" 
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                </div>
              )}
            </div>
            
            {!notification.is_read && (
              <div className="flex-shrink-0 ml-3">
                <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-gray-400">
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: getDateFnsLocale(i18n.language) })}
            </p>
            
            {/* Action buttons for friend requests */}
            {notification.type === 'friend_request' && notification.data?.status === 'pending' && (
              <div className="flex gap-2">
                <Button size="sm" className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700">
                  {t('common:accept', { defaultValue: 'Accept' })}
                </Button>
                <Button size="sm" variant="outline" className="h-7 px-3 text-xs">
                  {t('common:decline', { defaultValue: 'Decline' })}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;
