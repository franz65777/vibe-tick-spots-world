import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
    const resolveAndCheck = async () => {
      try {
        let uid = notification.data?.user_id ?? null;
        const uname = notification.data?.user_name || notification.data?.username || null;
        let avatar = notification.data?.user_avatar || notification.data?.avatar_url || null;

        // Resolve missing id or avatar from profiles
        if (!uid && uname) {
          const { data: profileByUsername } = await supabase
            .from('profiles')
            .select('id, avatar_url')
            .eq('username', uname)
            .maybeSingle();
          if (profileByUsername) {
            uid = profileByUsername.id;
            if (!avatar) avatar = profileByUsername.avatar_url ?? null;
          }
        } else if (uid && !avatar) {
          const { data: profileById } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', uid)
            .maybeSingle();
          if (profileById?.avatar_url) avatar = profileById.avatar_url;
        }

        setTargetUserId(uid);
        if (avatar) setAvatarOverride(avatar);

        // Check follow status when we have both current user and target
        if (user?.id && uid) {
          const { data } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', user.id)
            .eq('following_id', uid)
            .maybeSingle();
          setIsFollowing(!!data);
        }
      } catch (e) {
        console.warn('Failed to resolve notification target', e);
      }
    };

    resolveAndCheck();
  }, [user?.id, notification.id]);

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
          <span className="text-foreground text-[13px] leading-tight">
            <span className="font-semibold">{username}</span>
            {' '}{t('likedYourPost', { ns: 'notifications' })}
          </span>
        );
      case 'story_like':
        return (
          <span className="text-foreground text-[13px] leading-tight">
            <span className="font-semibold">{username}</span>
            {' '}{t('likedYourStory', { ns: 'notifications' })}
          </span>
        );
      case 'follow':
        return (
          <span className="text-foreground text-[13px] leading-tight">
            <span className="font-semibold">{username}</span>
            {' '}{t('startedFollowing', { ns: 'notifications' })}
          </span>
        );
      case 'comment':
        return (
          <span className="text-foreground text-[13px] leading-tight">
            <span className="font-semibold">{username}</span>
            {' '}{t('commentedOnYourPost', { ns: 'notifications' })}
          </span>
        );
      case 'story_reply':
        return (
          <span className="text-foreground text-[13px] leading-tight">
            <span className="font-semibold">{username}</span>
            {' '}{t('repliedToYourStory', { ns: 'notifications' })}
          </span>
        );
      default:
        return <span className="text-foreground text-[13px] leading-tight">{notification.message}</span>;
    }
  };

  // Get avatar URL - support both field name formats
  const avatarUrl = notification.data?.user_avatar || notification.data?.avatar_url || '';
  const username = notification.data?.user_name || notification.data?.username || 'User';
  const computedAvatar = avatarOverride || avatarUrl;

  return (
    <div
      onClick={handleClick}
      className={`flex items-start gap-2.5 px-4 py-3 cursor-pointer active:bg-accent/50 transition-colors ${
        !notification.is_read ? 'bg-accent/20' : 'bg-background'
      }`}
    >
      {/* User Avatar */}
      <Avatar 
        className="w-11 h-11 border-2 border-background cursor-pointer flex-shrink-0"
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
        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
          {username[0].toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Notification Text and Time */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="text-left">
          {getNotificationText()}
        </div>
        <div className="text-muted-foreground text-[12px]">
          {getRelativeTime(notification.created_at)}
        </div>
      </div>

      {/* Right Side - Follow Button or Post Thumbnail */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {notification.type === 'follow' ? (
          <Button
            onClick={handleFollowClick}
            disabled={isLoading}
            size="sm"
            variant={isFollowing ? 'outline' : 'default'}
            className={`px-4 h-7 text-[12px] font-semibold rounded-lg ${
              isFollowing 
                ? 'border-border hover:bg-accent' 
                : 'bg-primary hover:bg-primary/90'
            }`}
          >
            {isFollowing ? t('following', { ns: 'common' }) : t('follow', { ns: 'common' })}
          </Button>
        ) : notification.data?.post_image ? (
          <div 
            className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 border border-border"
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
    </div>
  );
};

export default MobileNotificationItem;
