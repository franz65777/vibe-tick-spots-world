import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMutualFollowers } from '@/hooks/useMutualFollowers';
import { useTranslation } from 'react-i18next';

type SortBy = 'proximity' | 'likes' | 'saves' | 'following' | 'recent';

interface UserCardProps {
  user: any;
  onUserClick: (user: any) => void;
  onFollowUser: (userId: string) => void;
  onMessageUser: (userId: string) => void;
  sortBy?: SortBy;
  searchQuery?: string;
  searchMode?: 'locations' | 'users';
}

const UserCard = ({
  user,
  onUserClick,
  onFollowUser,
  onMessageUser,
  sortBy,
  searchQuery = '',
  searchMode = 'users'
}: UserCardProps) => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [isOptimisticFollowing, setIsOptimisticFollowing] = useState(user.is_following || user.isFollowing);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [hasActiveStory, setHasActiveStory] = useState(false);
  const { mutualFollowers, totalCount } = useMutualFollowers(user.id);

  // Check if user has active stories
  useEffect(() => {
    const checkStories = async () => {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('stories')
        .select('id')
        .eq('user_id', user.id)
        .gt('created_at', dayAgo)
        .limit(1);
      setHasActiveStory(!!data && data.length > 0);
    };
    checkStories();
  }, [user.id]);

  const handleFollowClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFollowLoading) return;
    
    setIsFollowLoading(true);
    const previousState = isOptimisticFollowing;
    
    // Optimistic update
    setIsOptimisticFollowing(!isOptimisticFollowing);
    
    try {
      await onFollowUser(user.id);
    } catch (error) {
      // Revert on error
      setIsOptimisticFollowing(previousState);
      console.error('Failed to update follow status:', error);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleAvatarClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasActiveStory) {
      // Open stories viewer
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: stories } = await supabase
        .from('stories')
        .select('*')
        .eq('user_id', user.id)
        .gt('created_at', dayAgo)
        .order('created_at', { ascending: true });
      
      if (stories && stories.length > 0) {
        console.log('Open stories for user:', user.id);
        navigate(`/profile/${user.id}`, { 
          state: { 
            from: 'explore',
            searchQuery: searchQuery,
            searchMode: searchMode
          } 
        });
      }
    } else {
      navigate(`/profile/${user.id}`, { 
        state: { 
          from: 'explore',
          searchQuery: searchQuery,
          searchMode: searchMode
        } 
      });
    }
  };

  const handleRowClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('.avatar-clickable')) {
      return;
    }
    navigate(`/profile/${user.id}`, { 
      state: { 
        from: 'explore',
        searchQuery: searchQuery,
        searchMode: searchMode
      } 
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500', 
      'bg-purple-500',
      'bg-pink-500',
      'bg-orange-500',
      'bg-teal-500',
      'bg-indigo-500',
      'bg-red-500'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div 
      className="flex items-center justify-between py-2 px-1 hover:bg-gray-50/50 transition-colors cursor-pointer"
      onClick={handleRowClick}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div 
          className="avatar-clickable cursor-pointer relative"
          onClick={handleAvatarClick}
        >
          <Avatar className={`w-12 h-12 ${hasActiveStory ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className={`${getAvatarColor(user.name)} text-white font-semibold`}>
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
        </div>
        
        <div className="flex-1 min-w-0 text-left">
          <p className="font-bold text-foreground truncate text-[15px]">
            {user.name || user.username}
          </p>
          
          {/* Mutual followers display */}
          {mutualFollowers.length > 0 ? (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {t('followers')}: {mutualFollowers.slice(0, 2).map(f => f.username).join(', ')}
              {totalCount > 2 && ` + ${totalCount - 2} ${t('more')}`}
            </p>
          ) : user.follower_count > 0 ? (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {user.follower_count} {t('followers')}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {user.bio || user.username}
            </p>
          )}
        </div>
      </div>

      <div className="ml-3">
        <Button 
          size="sm"
          variant={isOptimisticFollowing ? "secondary" : "default"}
          onClick={handleFollowClick}
          disabled={isFollowLoading}
          className={`h-8 px-6 rounded-lg font-semibold text-sm transition-all ${
            isOptimisticFollowing 
              ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80' 
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
          aria-label={isOptimisticFollowing ? t('following') : t('follow')}
        >
          {isFollowLoading ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : isOptimisticFollowing ? (
            t('following')
          ) : (
            t('follow')
          )}
        </Button>
      </div>
    </div>
  );
};

export default UserCard;
