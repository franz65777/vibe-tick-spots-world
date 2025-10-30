import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface MobileNotificationItemProps {
  notification: {
    id: string;
    type: string;
    title: string;
    message: string;
    data?: {
      user_id?: string;
      username?: string;
      avatar_url?: string;
      post_id?: string;
      post_image?: string;
    };
    created_at: string;
    is_read: boolean;
  };
  onMarkAsRead: (id: string) => void;
  onAction: (notification: any) => void;
}

const MobileNotificationItem = ({ 
  notification, 
  onMarkAsRead, 
  onAction 
}: MobileNotificationItemProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    onAction(notification);
  };

  const handleFollowClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user || !notification.data?.user_id) return;
    
    setIsLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', notification.data.user_id);
          
        if (error) throw error;
        
        setIsFollowing(false);
        toast.success(t('common.unfollowed'));
      } else {
        // Follow
        const { error } = await supabase
          .from('user_follows')
          .insert({
            follower_id: user.id,
            following_id: notification.data.user_id
          });
          
        if (error) throw error;
        
        setIsFollowing(true);
        toast.success(t('common.following'));
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast.error('Failed to update follow status');
    } finally {
      setIsLoading(false);
    }
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return t('notifications.justNow');
    if (diffInMinutes < 60) return t('notifications.minutesAgo', { count: diffInMinutes });
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return t('notifications.hoursAgo', { count: diffInHours });
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return t('notifications.daysAgo', { count: diffInDays });
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    return t('notifications.weeksAgo', { count: diffInWeeks });
  };

  const getNotificationText = () => {
    const username = notification.data?.username || 'Someone';
    
    switch (notification.type) {
      case 'like':
        return (
          <span className="text-foreground text-[15px]">
            <span className="font-semibold">{username}</span>
            {' '}{t('notifications.likedYourPost')}
          </span>
        );
      case 'follow':
        return (
          <span className="text-foreground text-[15px]">
            <span className="font-semibold">{username}</span>
            {' '}{t('notifications.startedFollowing')}
          </span>
        );
      case 'comment':
        return (
          <span className="text-foreground text-[15px]">
            <span className="font-semibold">{username}</span>
            {' '}{t('notifications.commentedOnYourPost')}
          </span>
        );
      default:
        return <span className="text-foreground text-[15px]">{notification.message}</span>;
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-accent/50 transition-colors ${
        !notification.is_read ? 'bg-accent/20' : 'bg-background'
      }`}
    >
      {/* User Avatar */}
      <Avatar 
        className="w-11 h-11 border-2 border-background cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          if (notification.data?.user_id) {
            navigate(`/profile/${notification.data.user_id}`);
          }
        }}
      >
        <AvatarImage 
          src={notification.data?.avatar_url || ''} 
          alt={notification.data?.username || 'User'} 
        />
        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
          {(notification.data?.username || 'U')[0].toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Notification Text and Time */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1">
          {getNotificationText()}
        </div>
        <div className="text-muted-foreground text-sm mt-0.5">
          {getRelativeTime(notification.created_at)}
        </div>
      </div>

      {/* Right Side - Follow Button or Post Thumbnail */}
      {notification.type === 'follow' ? (
        <Button
          onClick={handleFollowClick}
          disabled={isLoading}
          size="sm"
          variant={isFollowing ? 'outline' : 'default'}
          className={`px-6 h-8 text-sm font-semibold rounded-lg ${
            isFollowing 
              ? 'border-border hover:bg-accent' 
              : 'bg-primary hover:bg-primary/90'
          }`}
        >
          {isFollowing ? t('common.following') : t('common.follow')}
        </Button>
      ) : notification.data?.post_image ? (
        <div 
          className="w-11 h-11 rounded-md overflow-hidden flex-shrink-0 border border-border"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={notification.data.post_image}
            alt="Post"
            className="w-full h-full object-cover"
          />
        </div>
      ) : null}

      {/* Unread Indicator */}
      {!notification.is_read && (
        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
      )}
    </div>
  );
};

export default MobileNotificationItem;
