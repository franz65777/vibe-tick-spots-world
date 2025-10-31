import { useState, useEffect } from 'react';
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
      user_name?: string;
      username?: string;
      user_avatar?: string;
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
  const [targetUserId, setTargetUserId] = useState<string | null>(notification.data?.user_id ?? null);
  const [avatarOverride, setAvatarOverride] = useState<string | null>(null);

  // Resolve target user (id and avatar) and check follow status
  useEffect(() => {
    if (notification.type !== 'follow') return;

    const resolveAndCheck = async () => {
      try {
        let uid = notification.data?.user_id ?? null;
        let avatar = notification.data?.user_avatar || notification.data?.avatar_url || null;

        if (!uid) {
          const uname = notification.data?.user_name || notification.data?.username || null;
          if (uname) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, avatar_url')
              .eq('username', uname)
              .maybeSingle();
            if (profile) {
              uid = profile.id;
              if (!avatar) avatar = profile.avatar_url;
            }
          }
        }

        setTargetUserId(uid);
        if (avatar) setAvatarOverride(avatar);

        if (user && uid) {
          const { data } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', user.id)
            .eq('following_id', uid)
            .maybeSingle();
          setIsFollowing(!!data);
        }
      } catch (e) {
        console.warn('Failed to resolve follow target', e);
      }
    };

    resolveAndCheck();
  }, [user?.id, notification.id, notification.type]);

  const handleClick = () => {
    onAction(notification);
  };

  const handleFollowClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !targetUserId) return;

    setIsLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId);
        if (error) throw error;

        setIsFollowing(false);
        toast.success(t('unfollowed', { ns: 'common' }));
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: targetUserId,
          });
        if (error) throw error;

        setIsFollowing(true);
        toast.success(t('following', { ns: 'common' }));
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
    
    if (diffInMinutes < 1) return t('justNow', { ns: 'notifications' });
    if (diffInMinutes < 60) return t('minutesAgo', { ns: 'notifications', count: diffInMinutes });
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return t('hoursAgo', { ns: 'notifications', count: diffInHours });
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return t('daysAgo', { ns: 'notifications', count: diffInDays });
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    return t('weeksAgo', { ns: 'notifications', count: diffInWeeks });
  };

  const getNotificationText = () => {
    // Support both field name formats from database
    const username = notification.data?.user_name || notification.data?.username || notification.title || 'Someone';
    
    switch (notification.type) {
      case 'like':
        return (
          <span className="text-foreground text-[15px] leading-snug">
            <span className="font-semibold">{username}</span>
            {' '}{t('likedYourPost', { ns: 'notifications' })}
          </span>
        );
      case 'follow':
        return (
          <span className="text-foreground text-[15px] leading-snug">
            <span className="font-semibold">{username}</span>
            {' '}{t('startedFollowing', { ns: 'notifications' })}
          </span>
        );
      case 'comment':
        return (
          <span className="text-foreground text-[15px] leading-snug">
            <span className="font-semibold">{username}</span>
            {' '}{t('commentedOnYourPost', { ns: 'notifications' })}
          </span>
        );
      default:
        return <span className="text-foreground text-[15px] leading-snug">{notification.message}</span>;
    }
  };

  // Get avatar URL - support both field name formats
  const avatarUrl = notification.data?.user_avatar || notification.data?.avatar_url || '';
  const username = notification.data?.user_name || notification.data?.username || 'User';
  const computedAvatar = avatarOverride || avatarUrl;

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
          if (targetUserId) {
            navigate(`/profile/${targetUserId}`);
          }
        }}
      >
        <AvatarImage 
          src={computedAvatar || undefined} 
          alt={username} 
        />
        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
          {username[0].toUpperCase()}
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
          {isFollowing ? t('following', { ns: 'common' }) : t('follow', { ns: 'common' })}
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
