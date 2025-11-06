import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
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
      comment_id?: string;
      comment_text?: string;
      grouped_users?: Array<{
        id: string;
        name: string;
        avatar: string;
      }>;
      total_count?: number;
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
  const [hasActiveStory, setHasActiveStory] = useState(false);
  const [commentLiked, setCommentLiked] = useState(false);

  // Resolve target user (id and avatar), check follow status, and check for active stories
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

          // Check if user has active stories
          const { data: stories } = await supabase
            .from('stories')
            .select('id')
            .eq('user_id', uid)
            .gt('expires_at', new Date().toISOString())
            .limit(1);
          setHasActiveStory(!!stories && stories.length > 0);
        }

        // Check if comment is liked (for comment notifications)
        if (notification.type === 'comment' && notification.data?.comment_id && user?.id) {
          const { data } = await supabase
            .from('comment_likes')
            .select('id')
            .eq('comment_id', notification.data.comment_id)
            .eq('user_id', user.id)
            .maybeSingle();
          setCommentLiked(!!data);
        }
      } catch (e) {
        console.warn('Failed to resolve notification target', e);
      }
    };

    resolveAndCheck();
  }, [user?.id, notification.id]);

  const handleClick = () => {
    // Handle grouped likes - navigate to post
    if (notification.type === 'like' && notification.data?.post_id) {
      navigate(`/profile`, { state: { openPostId: notification.data.post_id } });
      return;
    }
    onAction(notification);
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!targetUserId) return;

    // If user has active story, open story viewer
    if (hasActiveStory) {
      // TODO: Open story viewer with this user's stories
      navigate(`/profile/${targetUserId}`);
    } else {
      // Open profile
      navigate(`/profile/${targetUserId}`);
    }
  };

  const handleUsernameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (targetUserId) {
      navigate(`/profile/${targetUserId}`);
    }
  };

  const handlePostClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (notification.data?.post_id) {
      navigate(`/profile`, { state: { openPostId: notification.data.post_id } });
    }
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

  const handleCommentLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !notification.data?.comment_id) return;

    try {
      if (commentLiked) {
        // Unlike
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', notification.data.comment_id)
          .eq('user_id', user.id);
        if (!error) {
          setCommentLiked(false);
          toast.success(t('unliked', { ns: 'common' }));
        }
      } else {
        // Like
        const { error } = await supabase
          .from('comment_likes')
          .insert({
            comment_id: notification.data.comment_id,
            user_id: user.id,
          });
        if (!error) {
          setCommentLiked(true);
          toast.success(t('liked', { ns: 'common' }));
        }
      }
    } catch (error) {
      console.error('Error liking comment:', error);
      toast.error('Failed to like comment');
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
        // Check if this is a grouped notification
        if (notification.data?.grouped_users && notification.data.grouped_users.length > 0) {
          const groupedUsers = notification.data.grouped_users;
          const totalCount = notification.data.total_count || groupedUsers.length;
          
          if (groupedUsers.length === 1) {
            return (
              <span className="text-foreground text-[13px] leading-tight">
                <span 
                  className="font-semibold cursor-pointer hover:underline" 
                  onClick={handleUsernameClick}
                >
                  {groupedUsers[0].name}
                </span>
                {' '}<span className="cursor-pointer" onClick={handlePostClick}>{t('likedYourPost', { ns: 'notifications' })}</span>
              </span>
            );
          } else if (groupedUsers.length === 2) {
            return (
              <span className="text-foreground text-[13px] leading-tight">
                <span 
                  className="font-semibold cursor-pointer hover:underline" 
                  onClick={handleUsernameClick}
                >
                  {groupedUsers[0].name}
                </span>
                {' '}{t('and', { ns: 'common' })}{' '}
                <span className="font-semibold">{groupedUsers[1].name}</span>
                {' '}<span className="cursor-pointer" onClick={handlePostClick}>{t('likedYourPost', { ns: 'notifications' })}</span>
              </span>
            );
          } else {
            const othersCount = totalCount - 1;
            return (
              <span className="text-foreground text-[13px] leading-tight">
                <span 
                  className="font-semibold cursor-pointer hover:underline" 
                  onClick={handleUsernameClick}
                >
                  {groupedUsers[0].name}
                </span>
                {' '}{t('and', { ns: 'common' })}{' '}
                <span className="font-semibold">
                  {t('others', { ns: 'common', count: othersCount })}
                </span>
                {' '}<span className="cursor-pointer" onClick={handlePostClick}>{t('likedYourPost', { ns: 'notifications' })}</span>
              </span>
            );
          }
        }
        
        // Single like notification
        return (
          <span className="text-foreground text-[13px] leading-tight">
            <span 
              className="font-semibold cursor-pointer hover:underline" 
              onClick={handleUsernameClick}
            >
              {username}
            </span>
            {' '}<span className="cursor-pointer" onClick={handlePostClick}>{t('likedYourPost', { ns: 'notifications' })}</span>
          </span>
        );
      case 'story_like':
        return (
          <span className="text-foreground text-[13px] leading-tight">
            <span 
              className="font-semibold cursor-pointer hover:underline" 
              onClick={handleUsernameClick}
            >
              {username}
            </span>
            {' '}{t('likedYourStory', { ns: 'notifications' })}
          </span>
        );
      case 'follow':
        return (
          <span className="text-foreground text-[13px] leading-tight">
            <span 
              className="font-semibold cursor-pointer hover:underline" 
              onClick={handleUsernameClick}
            >
              {username}
            </span>
            {' '}{t('startedFollowing', { ns: 'notifications' })}
          </span>
        );
      case 'comment':
        return (
          <div className="space-y-1">
            <span className="text-foreground text-[13px] leading-tight">
              <span 
                className="font-semibold cursor-pointer hover:underline" 
                onClick={handleUsernameClick}
              >
                {username}
              </span>
              {' '}{t('commentedOnYourPost', { ns: 'notifications' })}
            </span>
            {notification.data?.comment_text && (
              <p className="text-muted-foreground text-[12px] line-clamp-2">
                {notification.data.comment_text}
              </p>
            )}
          </div>
        );
      case 'story_reply':
        return (
          <span className="text-foreground text-[13px] leading-tight">
            <span 
              className="font-semibold cursor-pointer hover:underline" 
              onClick={handleUsernameClick}
            >
              {username}
            </span>
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

  // For grouped likes, show multiple avatars
  const renderAvatars = () => {
    if (notification.type === 'like' && notification.data?.grouped_users && notification.data.grouped_users.length > 1) {
      const groupedUsers = notification.data.grouped_users.slice(0, 3); // Show max 3 avatars
      return (
        <div className="flex -space-x-2 flex-shrink-0">
          {groupedUsers.map((user, index) => (
            <Avatar 
              key={user.id}
              className="w-11 h-11 border-2 border-background cursor-pointer relative"
              style={{ zIndex: groupedUsers.length - index }}
              onClick={handleAvatarClick}
            >
              <AvatarImage 
                src={user.avatar || undefined} 
                alt={user.name} 
              />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                {user.name[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
      );
    }

    // Single avatar
    return (
      <Avatar 
        className={`w-11 h-11 border-2 ${hasActiveStory ? 'border-primary' : 'border-background'} cursor-pointer flex-shrink-0`}
        onClick={handleAvatarClick}
      >
        <AvatarImage 
          src={computedAvatar || undefined} 
          alt={username} 
        />
        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
          {username[0].toUpperCase()}
        </AvatarFallback>
      </Avatar>
    );
  };

  return (
    <div
      onClick={handleClick}
      className={`w-full cursor-pointer active:bg-accent/50 transition-colors ${
        !notification.is_read ? 'bg-accent/20' : 'bg-background'
      }`}
    >
      <div className="flex items-start gap-2.5 py-3 px-4">
        {/* User Avatar(s) */}
        {renderAvatars()}

      {/* Notification Text and Time */}
      <div className="flex-1 min-w-0">
        <div className="text-left">
          {getNotificationText()}
          <span className="text-muted-foreground text-[12px] ml-1.5">
            {getRelativeTime(notification.created_at)}
          </span>
        </div>
      </div>

      {/* Right Side - Follow Button, Post Thumbnail, or Comment Actions */}
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
        ) : notification.type === 'comment' ? (
          <Button
            onClick={handleCommentLike}
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
          >
            <Heart 
              className={`w-5 h-5 ${commentLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`}
            />
          </Button>
        ) : notification.data?.post_image ? (
          <div 
            className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 border border-border cursor-pointer"
            onClick={handlePostClick}
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
    </div>
  );
};

export default MobileNotificationItem;