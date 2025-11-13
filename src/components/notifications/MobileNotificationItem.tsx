import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import StoriesViewer from '@/components/StoriesViewer';
import { memo } from 'react';

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
      shared_by_user_id?: string;
      shared_by_username?: string;
      shared_by_avatar?: string;
      post_id?: string;
      post_image?: string;
      comment_id?: string;
      comment_text?: string;
      location_id?: string;
      location_name?: string;
      location_address?: string;
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
  openSwipeId?: string | null;
  onSwipeOpen?: (id: string | null) => void;
}

const MobileNotificationItem = ({ 
  notification, 
  onMarkAsRead, 
  onAction,
  openSwipeId,
  onSwipeOpen
}: MobileNotificationItemProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [targetUserId, setTargetUserId] = useState<string | null>(notification.data?.user_id ?? null);
  const [avatarOverride, setAvatarOverride] = useState<string | null>(null);
  const [usernameOverride, setUsernameOverride] = useState<string | null>(null);
  const [hasActiveStory, setHasActiveStory] = useState(false);
  const [commentLiked, setCommentLiked] = useState(false);
  const [showStories, setShowStories] = useState(false);
  const [userStories, setUserStories] = useState<any[]>([]);
  const [groupedUserOverrides, setGroupedUserOverrides] = useState<Record<string, { name: string; avatar?: string }>>({});
  const [isLocationShareActive, setIsLocationShareActive] = useState(true);

  // Swipe-to-delete state
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [translateX, setTranslateX] = useState(0);
  const [swipedOpen, setSwipedOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  // Close this notification if another one is opened
  useEffect(() => {
    if (openSwipeId && openSwipeId !== notification.id) {
      setSwipedOpen(false);
      setTranslateX(0);
    }
  }, [openSwipeId, notification.id]);

  // Check if location share is still active
  useEffect(() => {
    if (notification.type === 'location_share' && notification.data?.location_id) {
      const checkLocationShareStatus = async () => {
        try {
          const { data, error } = await supabase
            .from('user_location_shares')
            .select('expires_at')
            .eq('location_id', notification.data.location_id)
            .eq('user_id', notification.data?.shared_by_user_id || notification.data?.user_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (!error && data) {
            const now = new Date();
            const expiresAt = new Date(data.expires_at);
            setIsLocationShareActive(expiresAt > now);
          }
        } catch (err) {
          console.error('Error checking location share status:', err);
        }
      };

      checkLocationShareStatus();
    }
  }, [notification.type, notification.data?.location_id, notification.data?.shared_by_user_id, notification.data?.user_id]);

  // Cache for profile data to avoid redundant queries
  const profileCacheRef = useRef<Map<string, { avatar: string | null; username: string; timestamp: number }>>(new Map());
  const CACHE_DURATION = 30 * 1000; // 30 seconds for more frequent updates

  // Resolve target user (id and avatar), check follow status, and check for active stories
  useEffect(() => {
    const resolveAndCheck = async () => {
      try {
        let uid = notification.data?.user_id ?? null;
        let uname = notification.data?.user_name || notification.data?.username || null;
        let avatar = notification.data?.user_avatar || notification.data?.avatar_url || null;

        // For location_share notifications, prefer shared_by_* fields
        if (notification.type === 'location_share') {
          uid = notification.data?.shared_by_user_id ?? uid;
          uname = notification.data?.shared_by_username || uname;
          avatar = notification.data?.shared_by_avatar || avatar;
        }

        // Check cache first
        const cached = uid ? profileCacheRef.current.get(uid) : null;
        const isCacheValid = cached && (Date.now() - cached.timestamp < CACHE_DURATION);

        if (isCacheValid && cached) {
          avatar = cached.avatar ?? avatar;
          uname = cached.username ?? uname;
          setTargetUserId(uid);
          setAvatarOverride(avatar);
          setUsernameOverride(uname);
        } else {
          // Fetch from database if not cached
          if (uid) {
            const { data: profileById } = await supabase
              .from('profiles')
              .select('id, username, avatar_url')
              .eq('id', uid)
              .maybeSingle();
            
            if (profileById) {
              avatar = profileById.avatar_url ?? avatar;
              uname = profileById.username ?? uname;
              // Cache the result
              profileCacheRef.current.set(uid, {
                avatar: profileById.avatar_url,
                username: profileById.username,
                timestamp: Date.now()
              });
            }
          } else if (uname) {
            // Resolve by username if no user_id
            let resolvedId: string | null = null;
            let resolvedUsername: string | null = null;
            let resolvedAvatar: string | null = null;

            // 1) Exact match
            const { data: exact } = await supabase
              .from('profiles')
              .select('id, username, avatar_url')
              .eq('username', uname)
              .maybeSingle();

            if (exact) {
              resolvedId = exact.id;
              resolvedUsername = exact.username;
              resolvedAvatar = exact.avatar_url;
            } else {
              // 2) Case-insensitive prefix match (handles renamed usernames like 'sartori' -> 'sartoriz')
              const { data: prefix } = await supabase
                .from('profiles')
                .select('id, username, avatar_url')
                .ilike('username', `${uname}%`)
                .limit(1);

              if (prefix && prefix.length > 0) {
                resolvedId = prefix[0].id;
                resolvedUsername = prefix[0].username;
                resolvedAvatar = prefix[0].avatar_url;
              } else {
                // 3) Contains match as last resort
                const { data: contains } = await supabase
                  .from('profiles')
                  .select('id, username, avatar_url')
                  .ilike('username', `%${uname}%`)
                  .limit(1);
                if (contains && contains.length > 0) {
                  resolvedId = contains[0].id;
                  resolvedUsername = contains[0].username;
                  resolvedAvatar = contains[0].avatar_url;
                }
              }
            }

            if (resolvedId) {
              uid = resolvedId;
              avatar = resolvedAvatar ?? avatar;
              uname = resolvedUsername ?? uname;
              // Cache the result
              profileCacheRef.current.set(uid, {
                avatar: resolvedAvatar,
                username: uname,
                timestamp: Date.now()
              });
            }
          }

          setTargetUserId(uid);
          setAvatarOverride(avatar);
          setUsernameOverride(uname);
        }

        // Check follow status when we have both current user and target
        if (user?.id && uid) {
          const { data } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', user.id)
            .eq('following_id', uid)
            .maybeSingle();
          setIsFollowing(!!data);

          // Check if user has active stories and fetch them
          const { data: stories } = await supabase
            .from('stories')
            .select('id, user_id, media_url, media_type, created_at, location_id, location_name, location_address, metadata')
            .eq('user_id', uid)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false });
          
          if (stories && stories.length > 0) {
            setHasActiveStory(true);
            // Get profile data
            const { data: profileData } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', uid)
              .single();
            
            // Transform stories to the format expected by StoriesViewer
            const transformedStories = stories.map(story => ({
              id: story.id,
              userId: story.user_id,
              userName: profileData?.username || 'User',
              userAvatar: profileData?.avatar_url || '',
              mediaUrl: story.media_url,
              mediaType: story.media_type as 'image' | 'video',
              locationId: story.location_id || '',
              locationName: story.location_name || '',
              locationAddress: story.location_address || '',
              locationCategory: (story.metadata as any)?.category,
              timestamp: story.created_at,
              isViewed: false,
              bookingUrl: (story.metadata as any)?.booking_url
            }));
            setUserStories(transformedStories);
          } else {
            setHasActiveStory(false);
            setUserStories([]);
          }
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

  // Fetch latest profiles for grouped users (for grouped likes)
  useEffect(() => {
    const grouped = notification.data?.grouped_users || [];
    const ids = grouped.map(u => u.id).filter(Boolean);
    if (ids.length === 0) return;

    const fetchProfiles = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', ids as string[]);
      if (data && data.length > 0) {
        const map: Record<string, { name: string; avatar?: string }> = {};
        data.forEach(p => {
          map[p.id] = { name: p.username, avatar: p.avatar_url || undefined };
          // Cache too
          profileCacheRef.current.set(p.id, {
            avatar: p.avatar_url,
            username: p.username,
            timestamp: Date.now(),
          });
        });
        setGroupedUserOverrides(prev => ({ ...prev, ...map }));
      }
    };

    fetchProfiles();
  }, [notification.id]);

  // Live subscribe to profile updates (single and grouped)
  useEffect(() => {
    const ids = new Set<string>();
    if (targetUserId) ids.add(targetUserId);
    (notification.data?.grouped_users || []).forEach(u => {
      if (u.id) ids.add(u.id);
    });

    if (ids.size === 0) return;

    const channel = supabase.channel(`profiles_live_${notification.id}`);
    ids.forEach((id) => {
      channel.on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${id}`,
      }, (payload: any) => {
        const newUsername = payload.new?.username as string;
        const newAvatar = (payload.new?.avatar_url as string) || null;

        if (id === targetUserId && newUsername) {
          setUsernameOverride(newUsername);
          setAvatarOverride(newAvatar);
        }
        if (newUsername) {
          setGroupedUserOverrides(prev => ({
            ...prev,
            [id]: { name: newUsername, avatar: newAvatar || undefined },
          }));
        }
        profileCacheRef.current.set(id, {
          avatar: newAvatar,
          username: newUsername,
          timestamp: Date.now(),
        });
      });
    });

    const sub = channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetUserId, notification.data?.grouped_users]);

  const handleClick = () => {
    // Handle grouped likes - navigate to post
    if (notification.type === 'like' && notification.data?.post_id) {
      navigate(`/post/${notification.data.post_id}`, { state: { fromNotifications: true } });
      return;
    }
    // Handle location_share - open location detail card
    if (notification.type === 'location_share') {
      if (notification.data?.location_id) {
        // Navigate to home with specific location to open
        navigate('/', { 
          state: { 
            openLocationId: notification.data.location_id,
            fromNotifications: true 
          } 
        });
      }
      return;
    }
    onAction(notification);
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!targetUserId) return;

    // If user has active story, open story viewer
    if (hasActiveStory && userStories.length > 0) {
      setShowStories(true);
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
      navigate(`/post/${notification.data.post_id}`, { state: { fromNotifications: true } });
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

  const handleOnMyWayClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !targetUserId || !notification.data?.location_name) {
      console.log('Missing data for on my way:', { user: !!user, targetUserId, locationName: notification.data?.location_name });
      return;
    }

    setIsLoading(true);
    try {
      const message = t('onMyWayMessage', { 
        ns: 'notifications', 
        location: notification.data.location_name 
      });

      console.log('Sending message:', { from: user.id, to: targetUserId, message });

      // Send message using direct_messages table
      const { error, data } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: user.id,
          receiver_id: targetUserId,
          content: message,
          message_type: 'text'
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Message sent successfully:', data);
      toast.success(t('messageSent', { ns: 'notifications' }));
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const getNotificationText = () => {
    // Use the fetched username if available, otherwise fall back to notification data
    const username = usernameOverride || notification.data?.user_name || notification.data?.username || notification.title || 'Someone';
    const locationName = notification.data?.location_name || '';
    
    switch (notification.type) {
      case 'location_share':
        const displayName = usernameOverride || notification.data?.shared_by_username || notification.data?.user_name || notification.data?.username || notification.title || 'Someone';
        return (
          <span className="text-foreground text-[13px] leading-tight">
            <span 
              className="font-semibold cursor-pointer hover:underline" 
              onClick={handleUsernameClick}
            >
              {displayName}
            </span>
            {' '}{t(isLocationShareActive ? 'isAtLocation' : 'wasAtLocation', { ns: 'notifications' })}{' '}
            <span className="font-semibold">{locationName}</span>
          </span>
        );
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
                  {groupedUserOverrides[groupedUsers[0].id]?.name || groupedUsers[0].name}
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
                <span className="font-semibold">{groupedUserOverrides[groupedUsers[1].id]?.name || groupedUsers[1].name}</span>
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
                  {groupedUserOverrides[groupedUsers[0].id]?.name || groupedUsers[0].name}
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
              {displayUsername}
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
              {displayUsername}
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
              {displayUsername}
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
                {displayUsername}
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
              {displayUsername}
            </span>
            {' '}{t('repliedToYourStory', { ns: 'notifications' })}
          </span>
        );
      default:
        return <span className="text-foreground text-[13px] leading-tight">{notification.message}</span>;
    }
  };

  // Get avatar URL - support both field name formats
  const avatarUrl = notification.data?.shared_by_avatar || notification.data?.user_avatar || notification.data?.avatar_url || '';
  const baseUsername = notification.data?.shared_by_username || notification.data?.user_name || notification.data?.username || notification.title || 'User';
  const displayUsername = usernameOverride || baseUsername;
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
                src={groupedUserOverrides[user.id]?.avatar || user.avatar || undefined} 
                alt={groupedUserOverrides[user.id]?.name || user.name} 
              />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                {(groupedUserOverrides[user.id]?.name || user.name)[0].toUpperCase()}
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
          alt={displayUsername} 
        />
        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
          {(displayUsername?.[0] || '?').toUpperCase()}
        </AvatarFallback>
      </Avatar>
    );
  };

  return (
    <>
      {hidden ? null : (
        <div className="relative overflow-hidden select-none">
          {/* Right action - Delete (revealed on swipe) */}
          <div 
            className="absolute inset-y-0 right-0 flex items-center justify-center w-24 z-0"
            style={{ pointerEvents: swipedOpen ? 'auto' : 'none', opacity: swipedOpen ? 1 : 0, transition: 'opacity 180ms ease' }}
          >
            <Button
              size="icon"
              variant="ghost"
              className="h-10 w-10 rounded-full bg-destructive/10 hover:bg-destructive/20"
              onClick={async (e) => {
                e.stopPropagation();
                setIsLoading(true);
                try {
                  // Try hard delete first
                  const { error: delErr } = await supabase
                    .from('notifications')
                    .delete()
                    .eq('id', notification.id);

                  if (delErr) {
                    // Fallback: expire the notification so backend queries can ignore it
                    const { error: updErr } = await supabase
                      .from('notifications')
                      .update({ expires_at: new Date().toISOString() })
                      .eq('id', notification.id);
                    if (updErr) {
                      console.warn('Delete blocked by RLS, hiding locally');
                    }
                  }

                  // Hide locally regardless
                  setHidden(true);
                } finally {
                  setIsLoading(false);
                }
              }}
            >
              <Trash2 className="h-5 w-5 text-destructive" />
            </Button>
          </div>

          {/* Swipeable row */}
          <div
            onClick={(e) => {
              if (swipedOpen) {
                e.preventDefault();
                e.stopPropagation();
                return;
              }
              handleClick();
            }}
            onPointerDown={(e) => {
              (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
              setTouchStartX(e.clientX);
            }}
            onPointerMove={(e) => {
              if (touchStartX === null) return;
              e.preventDefault();
              const dx = e.clientX - touchStartX;
              const next = Math.max(Math.min(dx, 0), -96);
              setTranslateX(swipedOpen ? -96 + dx : next);
            }}
            onPointerUp={() => {
              const threshold = -48;
              if (translateX <= threshold) {
                setTranslateX(-96);
                setSwipedOpen(true);
                onSwipeOpen?.(notification.id);
              } else {
                setTranslateX(0);
                setSwipedOpen(false);
                if (openSwipeId === notification.id) {
                  onSwipeOpen?.(null);
                }
              }
              setTouchStartX(null);
            }}
            onPointerCancel={() => {
              setTouchStartX(null);
              if (!swipedOpen) setTranslateX(0);
            }}
            className={`relative z-10 w-full ${swipedOpen ? '' : 'cursor-pointer active:bg-accent/50'} transition-colors ${
              !notification.is_read ? 'bg-accent/20' : 'bg-background'
            }`}
            style={{ touchAction: 'pan-y', transform: `translateX(${translateX}px)`, transition: touchStartX ? 'none' : 'transform 180ms ease' }}
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

              {/* Right Side - Follow Button, Post Thumbnail, Comment Actions, or On My Way Button */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {notification.type === 'location_share' ? (
                  <Button
                    onClick={handleOnMyWayClick}
                    disabled={isLoading || !isLocationShareActive}
                    size="sm"
                    variant="default"
                    className="px-4 h-7 text-[12px] font-semibold rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('onMyWay', { ns: 'notifications' })}
                  </Button>
                ) : notification.type === 'follow' ? (
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
        </div>
      )}

      {/* Stories Viewer */}
      {showStories && userStories.length > 0 && (
        <StoriesViewer
          stories={userStories}
          initialStoryIndex={0}
          onClose={() => setShowStories(false)}
          onStoryViewed={() => {}}
        />
      )}
    </>
  );
};

export default memo(MobileNotificationItem, (prevProps, nextProps) => {
  // Re-render also when swipe state controller changes
  const notifEqual =
    prevProps.notification.id === nextProps.notification.id &&
    prevProps.notification.is_read === nextProps.notification.is_read &&
    JSON.stringify(prevProps.notification.data) === JSON.stringify(nextProps.notification.data);
  const swipeControllerEqual = prevProps.openSwipeId === nextProps.openSwipeId;
  return notifEqual && swipeControllerEqual;
});