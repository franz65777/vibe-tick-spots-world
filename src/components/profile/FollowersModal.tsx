import { ArrowLeft, Search, X, Check, UserPlus, Clock } from 'lucide-react';
import { haptics } from '@/utils/haptics';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useStories } from '@/hooks/useStories';
import { useOptimizedProfile } from '@/hooks/useOptimizedProfile';
import { useMutualFollowers } from '@/hooks/useMutualFollowers';
import { useFollowList, FollowUser } from '@/hooks/useFollowList';
import { useQueryClient } from '@tanstack/react-query';
import StoriesViewer from '../StoriesViewer';
import { cn } from '@/lib/utils';
import useEmblaCarousel from 'embla-carousel-react';
import { UnfollowConfirmDialog } from './UnfollowConfirmDialog';
import { RemoveFollowerConfirmDialog } from './RemoveFollowerConfirmDialog';
import { toast } from 'sonner';

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'followers' | 'following' | 'mutuals';
  userId?: string;
  onFollowChange?: () => void;
}

interface UserWithFollowStatus {
  id: string;
  username: string;
  avatar_url: string | null;
  isFollowing?: boolean;
  savedPlacesCount?: number;
  isPrivate?: boolean;
  followRequestPending?: boolean;
}

type TabType = 'mutuals' | 'following' | 'followers';

// Skeleton component for loading state - 4 columns
const UserGridSkeleton = () => (
  <div className="grid grid-cols-4 gap-0 px-2">
    {Array.from({ length: 12 }).map((_, i) => (
      <div key={i} className="flex flex-col items-center gap-1 py-1.5 px-0.5">
        <div 
          className="w-[68px] h-[68px] rounded-full bg-muted relative overflow-hidden"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-foreground/5 to-transparent" />
        </div>
        <div className="w-12 h-3 bg-muted rounded relative overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-foreground/5 to-transparent" />
        </div>
      </div>
    ))}
  </div>
);

// ===============================
// UserGridCard - EXTRACTED TO TOP-LEVEL with React.memo
// ===============================
interface UserGridCardProps {
  user: UserWithFollowStatus;
  index: number;
  userHasStories: boolean;
  isOwnProfile: boolean;
  activeTab: TabType;
  currentUserId: string | undefined;
  onAvatarClick: (user: UserWithFollowStatus) => void;
  onActionClick: (user: UserWithFollowStatus, e: React.MouseEvent) => void;
  onUsernameClick: (userId: string) => void;
  getInitials: (username: string) => string;
}

const UserGridCard = memo(({ 
  user, 
  index, 
  userHasStories,
  isOwnProfile,
  activeTab,
  currentUserId,
  onAvatarClick,
  onActionClick,
  onUsernameClick,
  getInitials,
}: UserGridCardProps) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const avatarUrl = user.avatar_url || undefined;

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptics.selection();
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 200);
    onActionClick(user, e);
  };

  // Determine icon and color based on state
  const getActionIcon = () => {
    if (isOwnProfile && activeTab === 'followers') {
      return { icon: X, iconColor: 'text-rose-500' };
    }
    if (user.isFollowing) {
      return { icon: Check, iconColor: 'text-emerald-500' };
    }
    if (user.followRequestPending) {
      return { icon: Clock, iconColor: 'text-amber-500' };
    }
    return { icon: UserPlus, iconColor: 'text-primary' };
  };

  const { icon: ActionIcon, iconColor } = getActionIcon();

  return (
    <div 
      className="flex flex-col items-center gap-1 py-1.5 px-0.5 animate-in fade-in duration-200"
      style={{ animationDelay: `${index * 20}ms` }}
    >
      {/* Avatar with overlay action icon */}
      <div className="relative">
        <button
          onClick={() => onAvatarClick(user)}
          className="group"
        >
          <div className={cn(
            "rounded-full p-[2px] transition-transform group-hover:scale-105",
            userHasStories 
              ? "bg-gradient-to-br from-primary via-primary/80 to-primary/60" 
              : ""
          )}>
            <Avatar className={cn(
              "w-[68px] h-[68px] rounded-full",
              userHasStories && "border-2 border-background"
            )}>
              <AvatarImage 
                src={avatarUrl} 
                className="object-cover rounded-full" 
                loading="lazy"
              />
              <AvatarFallback className="bg-muted text-muted-foreground text-base font-semibold rounded-full">
                {getInitials(user.username || 'User')}
              </AvatarFallback>
            </Avatar>
          </div>
        </button>
        
        {/* Action icon overlay - positioned outside top-left */}
        {currentUserId !== user.id && (
          <button
            onClick={handleActionClick}
            className={cn(
              "absolute -top-1 -left-1 w-6 h-6 rounded-full flex items-center justify-center",
              "backdrop-blur-md bg-white/90 dark:bg-black/50",
              "border border-white/50 dark:border-white/20",
              "shadow-md",
              "hover:bg-white dark:hover:bg-black/60 active:scale-95 transition-all duration-150",
              "z-20",
              isAnimating && "scale-110"
            )}
          >
            <ActionIcon className={cn("w-3 h-3", iconColor)} strokeWidth={2.5} />
          </button>
        )}

        {/* Places badge - bottom center with glass effect */}
        {(user.savedPlacesCount ?? 0) > 0 && (
          <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-white/80 dark:bg-white/15 backdrop-blur-md border border-white/50 dark:border-white/20 text-foreground text-[9px] font-medium px-1.5 py-0.5 rounded-full shadow-sm z-10">
            <span className="leading-none">📌</span>
            <span>{user.savedPlacesCount}</span>
          </div>
        )}
      </div>

      {/* Username */}
      <button
        onClick={() => onUsernameClick(user.id)}
        className="w-full flex justify-center"
      >
        <p className="font-medium text-foreground text-[11px] truncate text-center max-w-[70px]">
          {user.username || 'User'}
        </p>
      </button>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo - only re-render if these change
  return (
    prevProps.user.id === nextProps.user.id &&
    prevProps.user.avatar_url === nextProps.user.avatar_url &&
    prevProps.user.username === nextProps.user.username &&
    prevProps.user.isFollowing === nextProps.user.isFollowing &&
    prevProps.user.followRequestPending === nextProps.user.followRequestPending &&
    prevProps.user.savedPlacesCount === nextProps.user.savedPlacesCount &&
    prevProps.user.isPrivate === nextProps.user.isPrivate &&
    prevProps.userHasStories === nextProps.userHasStories &&
    prevProps.isOwnProfile === nextProps.isOwnProfile &&
    prevProps.activeTab === nextProps.activeTab &&
    prevProps.index === nextProps.index
  );
});

UserGridCard.displayName = 'UserGridCard';

// ===============================
// TabGridContent - EXTRACTED TO TOP-LEVEL
// ===============================
interface TabGridContentProps {
  tabType: TabType;
  activeTab: TabType;
  filteredUsers: UserWithFollowStatus[];
  tabLoading: boolean;
  searchQuery: string;
  t: (key: string, options?: any) => string;
  stories: any[];
  isOwnProfile: boolean;
  currentUserId: string | undefined;
  onAvatarClick: (user: UserWithFollowStatus) => void;
  onActionClick: (user: UserWithFollowStatus, e: React.MouseEvent) => void;
  onUsernameClick: (userId: string) => void;
  getInitials: (username: string) => string;
}

const TabGridContent = memo(({ 
  tabType, 
  activeTab, 
  filteredUsers, 
  tabLoading, 
  searchQuery, 
  t,
  stories,
  isOwnProfile,
  currentUserId,
  onAvatarClick,
  onActionClick,
  onUsernameClick,
  getInitials,
}: TabGridContentProps) => {
  const isActiveTab = activeTab === tabType;
  const displayUsers = isActiveTab ? filteredUsers : [];
  const now = new Date();
  
  return (
    <ScrollArea className="h-full">
      <div className="pb-4 pt-2">
        {tabLoading && isActiveTab ? (
          <UserGridSkeleton />
        ) : displayUsers.length === 0 && isActiveTab ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <p className="text-muted-foreground text-sm text-center">
              {searchQuery 
                ? t('noResults', { ns: 'common' }) 
                : tabType === 'mutuals'
                  ? t('noMutuals', { ns: 'profile', defaultValue: 'Nessun amico in comune' })
                  : tabType === 'followers' 
                    ? t('noFollowers', { ns: 'profile' }) 
                    : t('noFollowing', { ns: 'profile' })
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-0 px-2">
            {displayUsers.map((user, index) => {
              const userHasStories = stories.some(s => 
                s.user_id === user.id && 
                new Date(s.expires_at) > now
              );
              return (
                <UserGridCard 
                  key={user.id} 
                  user={user} 
                  index={index}
                  userHasStories={userHasStories}
                  isOwnProfile={isOwnProfile}
                  activeTab={activeTab}
                  currentUserId={currentUserId}
                  onAvatarClick={onAvatarClick}
                  onActionClick={onActionClick}
                  onUsernameClick={onUsernameClick}
                  getInitials={getInitials}
                />
              );
            })}
          </div>
        )}
      </div>
    </ScrollArea>
  );
});

TabGridContent.displayName = 'TabGridContent';

// ===============================
// Main FollowersModal Component
// ===============================
const FollowersModal = ({ isOpen, onClose, initialTab = 'followers', userId, onFollowChange }: FollowersModalProps) => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const targetUserId = userId || currentUser?.id;
  const { profile: targetProfile } = useOptimizedProfile(targetUserId);
  
  // Determine initial tab - mutuals only shown when viewing other profiles
  const isOwnProfile = currentUser?.id === targetUserId;
  const getInitialTab = (): TabType => {
    if (initialTab === 'mutuals' && !isOwnProfile) return 'mutuals';
    if (initialTab === 'followers') return 'followers';
    if (initialTab === 'following') return 'following';
    return isOwnProfile ? 'following' : 'followers';
  };
  
  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab());
  const [searchQuery, setSearchQuery] = useState('');
  const { stories } = useStories();
  const [isStoriesViewerOpen, setIsStoriesViewerOpen] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'unfollow' | 'remove-follower' | null;
    user: UserWithFollowStatus | null;
  }>({ type: null, user: null });
  
  // Use optimized React Query hooks for data fetching
  const { 
    data: followers = [], 
    isLoading: followersLoading,
    updateFollowStatus: updateFollowerStatus,
    removeUser: removeFollowerFromList,
  } = useFollowList(targetUserId, 'followers', isOpen);
  
  const { 
    data: following = [], 
    isLoading: followingLoading,
    updateFollowStatus: updateFollowingStatus,
  } = useFollowList(targetUserId, 'following', isOpen);
  
  // Mutuals data - only fetch when viewing other profiles
  const shouldFetchMutuals = !isOwnProfile && isOpen;
  const { mutualFollowers, totalCount: mutualsCount, loading: mutualsLoading } = useMutualFollowers(
    shouldFetchMutuals ? targetUserId : undefined, 
    shouldFetchMutuals
  );
  
  // Embla Carousel for smooth swiping
  const tabCount = isOwnProfile ? 2 : 3;
  const getTabIndex = (tab: TabType): number => {
    if (isOwnProfile) {
      return tab === 'following' ? 0 : 1;
    }
    return tab === 'mutuals' ? 0 : tab === 'following' ? 1 : 2;
  };
  const getTabFromIndex = (index: number): TabType => {
    if (isOwnProfile) {
      return index === 0 ? 'following' : 'followers';
    }
    return index === 0 ? 'mutuals' : index === 1 ? 'following' : 'followers';
  };
  
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false,
    startIndex: getTabIndex(getInitialTab()),
  });
  

  // Sync Embla with activeTab
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const index = emblaApi.selectedScrollSnap();
    setActiveTab(getTabFromIndex(index));
  }, [emblaApi, isOwnProfile]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Handle tab click - scroll carousel
  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab);
    emblaApi?.scrollTo(getTabIndex(tab));
  };

  // Sync activeTab when initialTab changes
  useEffect(() => {
    if (isOpen) {
      const newTab = getInitialTab();
      setActiveTab(newTab);
      emblaApi?.scrollTo(getTabIndex(newTab), true);
    }
  }, [initialTab, isOpen, emblaApi, isOwnProfile]);

  // Update counts from React Query data
  useEffect(() => {
    if (followers.length > 0 || !followersLoading) {
      setFollowersCount(followers.length);
    }
  }, [followers, followersLoading]);

  useEffect(() => {
    if (following.length > 0 || !followingLoading) {
      setFollowingCount(following.length);
    }
  }, [following, followingLoading]);

  const followUser = async (targetId: string) => {
    if (!currentUser) return;

    try {
      // Optimistic update
      updateFollowerStatus(targetId, true);
      updateFollowingStatus(targetId, true);
      
      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: currentUser.id,
          following_id: targetId,
        });

      if (error) {
        // Revert on error
        updateFollowerStatus(targetId, false);
        updateFollowingStatus(targetId, false);
        console.error('Error following user:', error);
      } else {
        // Update counter - no invalidateQueries to avoid reload
        setFollowingCount(prev => prev + 1);
        onFollowChange?.();
      }
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  // Unfollow but keep user in the list (for Following tab)
  const unfollowUserKeepInList = async (targetId: string) => {
    if (!currentUser) return;

    try {
      // Optimistic update - only update isFollowing status, don't remove from list
      updateFollowerStatus(targetId, false);
      updateFollowingStatus(targetId, false);
      
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', targetId);

      if (error) {
        // Revert on error
        updateFollowerStatus(targetId, true);
        updateFollowingStatus(targetId, true);
        console.error('Error unfollowing user:', error);
      } else {
        // Update counter - no invalidateQueries to avoid reload
        setFollowingCount(prev => Math.max(0, prev - 1));
        onFollowChange?.();
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  };

  // Send follow request for private profiles
  const sendFollowRequest = async (targetId: string) => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('friend_requests')
        .insert({
          requester_id: currentUser.id,
          requested_id: targetId,
          status: 'pending',
        });

      if (error) {
        if (error.code === '23505') {
          // Duplicate request
          toast.info(t('userProfile.requestAlreadySent', { ns: 'common', defaultValue: 'Richiesta già inviata' }));
        } else {
          console.error('Error sending follow request:', error);
          toast.error(t('userProfile.requestFailed', { ns: 'common', defaultValue: 'Errore nell\'invio della richiesta' }));
        }
        return;
      }

      // Update local state to show pending icon
      queryClient.setQueryData<FollowUser[]>(
        ['follow-list', targetUserId, 'following'],
        (old) => old?.map(u => u.id === targetId ? { ...u, followRequestPending: true } : u)
      );
      
      toast.success(t('userProfile.requestSent', { ns: 'common', defaultValue: 'Richiesta inviata' }));
    } catch (error) {
      console.error('Error sending follow request:', error);
    }
  };

  const removeFollower = async (followerId: string) => {
    if (!currentUser) return;

    try {
      const { error } = await supabase.rpc('remove_follower', {
        follower_user_id: followerId
      });

      if (!error) {
        removeFollowerFromList(followerId);
        setFollowersCount(prev => Math.max(0, prev - 1));
        onFollowChange?.();
        // No invalidateQueries - optimistic update already done
      } else {
        console.error('Error removing follower:', error);
      }
    } catch (error) {
      console.error('Error removing follower:', error);
    }
  };

  const getInitials = useCallback((username: string) => {
    return username ? username.substring(0, 2).toUpperCase() : 'U';
  }, []);

  // Get current data based on active tab - now uses React Query data
  const getCurrentUsers = useCallback((): UserWithFollowStatus[] => {
    if (activeTab === 'mutuals') {
      return mutualFollowers.map(m => ({
        id: m.id,
        username: m.username,
        avatar_url: m.avatar_url,
        isFollowing: m.isFollowing,
        savedPlacesCount: m.savedPlacesCount,
      }));
    }
    if (activeTab === 'followers') {
      return followers;
    }
    return following;
  }, [activeTab, mutualFollowers, followers, following]);

  const filteredUsers = getCurrentUsers().filter(user => 
    user.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stable callback for avatar click
  const handleAvatarClick = useCallback((user: UserWithFollowStatus) => {
    const now = new Date();
    const userStories = stories.filter(s => 
      s.user_id === user.id && 
      new Date(s.expires_at) > now
    );
    
    if (userStories.length > 0) {
      const storyIndex = stories.findIndex(s => s.user_id === user.id);
      setSelectedStoryIndex(storyIndex >= 0 ? storyIndex : 0);
      setIsStoriesViewerOpen(true);
    } else {
      onClose();
      navigate(`/profile/${user.id}`);
    }
  }, [stories, onClose, navigate]);

  // Stable callback for action click
  const handleActionClick = useCallback(async (user: UserWithFollowStatus, e: React.MouseEvent) => {
    if (isOwnProfile && activeTab === 'followers') {
      // Remove follower - always show confirmation
      setConfirmDialog({ type: 'remove-follower', user });
    } else if (user.isFollowing) {
      // Unfollow
      if (user.isPrivate) {
        // Private profile - show confirmation
        setConfirmDialog({ type: 'unfollow', user });
      } else {
        // Public profile - unfollow directly but keep in list
        await unfollowUserKeepInList(user.id);
      }
    } else if (user.followRequestPending) {
      // Already has pending request - do nothing or show info
      toast.info(t('userProfile.requestPending', { ns: 'common', defaultValue: 'Richiesta in attesa di approvazione' }));
    } else {
      // Follow
      if (user.isPrivate) {
        // Private profile - send follow request (don't bypass)
        await sendFollowRequest(user.id);
      } else {
        await followUser(user.id);
      }
    }
  }, [isOwnProfile, activeTab, unfollowUserKeepInList, sendFollowRequest, followUser, t]);

  // Stable callback for username click
  const handleUsernameClick = useCallback((userId: string) => {
    onClose();
    navigate(`/profile/${userId}`);
  }, [onClose, navigate]);

  // Get loading state for specific tab
  const getTabLoading = useCallback((tabType: TabType) => {
    if (tabType === 'mutuals') return mutualsLoading;
    if (tabType === 'followers') return followersLoading;
    return followingLoading;
  }, [mutualsLoading, followersLoading, followingLoading]);

  // Get users for specific tab
  const getUsersForTab = useCallback((tabType: TabType): UserWithFollowStatus[] => {
    if (tabType === 'mutuals') {
      return mutualFollowers.map(m => ({
        id: m.id,
        username: m.username,
        avatar_url: m.avatar_url,
        isFollowing: m.isFollowing,
        savedPlacesCount: m.savedPlacesCount,
      }));
    }
    if (tabType === 'followers') {
      return followers;
    }
    return following;
  }, [mutualFollowers, followers, following]);

  const getFilteredUsersForTab = useCallback((tabType: TabType) => {
    return getUsersForTab(tabType).filter(user => 
      user.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [getUsersForTab, searchQuery]);

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        
        /* Hide bottom navigation when modal is open */
        [class*="bottom-navigation"],
        [class*="NewBottomNavigation"],
        [class*="BusinessBottomNavigation"],
        nav[class*="fixed bottom"],
        div[class*="fixed bottom-0"]:not([class*="z-[2000]"]) {
          display: none !important;
        }
      `}</style>
      
      <div className="fixed inset-0 bg-background z-[2000] flex flex-col pt-[env(safe-area-inset-top)]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose} 
              className="p-1.5 -ml-1.5 rounded-full hover:bg-muted/80 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h2 className="text-lg font-semibold text-foreground">
              {targetProfile?.username || 'User'}
            </h2>
          </div>
        </div>

        {/* Pill Tab Switcher */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {!isOwnProfile && (
              <button 
                onClick={() => handleTabClick('mutuals')}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap shrink-0",
                  activeTab === 'mutuals' 
                    ? "bg-foreground text-background" 
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                )}
              >
                <span className="font-semibold">{mutualsCount}</span>
                <span>{t('mutuals', { ns: 'profile', defaultValue: 'in comune' })}</span>
              </button>
            )}
            
            <button 
              onClick={() => handleTabClick('following')}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap shrink-0",
                activeTab === 'following' 
                  ? "bg-foreground text-background" 
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              )}
            >
              <span className="font-semibold">{followingCount}</span>
              <span>{t('followingTab', { ns: 'common', defaultValue: 'seguiti' })}</span>
            </button>
            
            <button 
              onClick={() => handleTabClick('followers')}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap shrink-0",
                activeTab === 'followers' 
                  ? "bg-foreground text-background" 
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              )}
            >
              <span className="font-semibold">{followersCount}</span>
              <span>{t('followers', { ns: 'common' })}</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('search', { ns: 'common' })}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 rounded-full bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/50"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
        
        {/* Embla Carousel Content */}
        <div className="flex-1 overflow-hidden" ref={emblaRef}>
          <div className="flex h-full">
            {!isOwnProfile && (
              <div className="flex-[0_0_100%] min-w-0 h-full">
                <TabGridContent 
                  tabType="mutuals"
                  activeTab={activeTab}
                  filteredUsers={getFilteredUsersForTab('mutuals')}
                  tabLoading={getTabLoading('mutuals')}
                  searchQuery={searchQuery}
                  t={t}
                  stories={stories}
                  isOwnProfile={isOwnProfile}
                  currentUserId={currentUser?.id}
                  onAvatarClick={handleAvatarClick}
                  onActionClick={handleActionClick}
                  onUsernameClick={handleUsernameClick}
                  getInitials={getInitials}
                />
              </div>
            )}
            
            <div className="flex-[0_0_100%] min-w-0 h-full">
              <TabGridContent 
                tabType="following"
                activeTab={activeTab}
                filteredUsers={getFilteredUsersForTab('following')}
                tabLoading={getTabLoading('following')}
                searchQuery={searchQuery}
                t={t}
                stories={stories}
                isOwnProfile={isOwnProfile}
                currentUserId={currentUser?.id}
                onAvatarClick={handleAvatarClick}
                onActionClick={handleActionClick}
                onUsernameClick={handleUsernameClick}
                getInitials={getInitials}
              />
            </div>
            
            <div className="flex-[0_0_100%] min-w-0 h-full">
              <TabGridContent 
                tabType="followers"
                activeTab={activeTab}
                filteredUsers={getFilteredUsersForTab('followers')}
                tabLoading={getTabLoading('followers')}
                searchQuery={searchQuery}
                t={t}
                stories={stories}
                isOwnProfile={isOwnProfile}
                currentUserId={currentUser?.id}
                onAvatarClick={handleAvatarClick}
                onActionClick={handleActionClick}
                onUsernameClick={handleUsernameClick}
                getInitials={getInitials}
              />
            </div>
          </div>
        </div>
      </div>

      {isStoriesViewerOpen && (
        <StoriesViewer
          onClose={() => setIsStoriesViewerOpen(false)}
          stories={stories.map(s => ({
            id: s.id,
            userId: s.user_id,
            userName: getCurrentUsers().find(u => u.id === s.user_id)?.username || 'User',
            userAvatar: getCurrentUsers().find(u => u.id === s.user_id)?.avatar_url || '',
            mediaUrl: s.media_url,
            mediaType: s.media_type as 'image' | 'video',
            locationId: s.location_id || '',
            locationName: s.location_name || '',
            locationAddress: s.location_address || '',
            locationCategory: '',
            timestamp: s.created_at,
            isViewed: false
          }))}
          initialStoryIndex={selectedStoryIndex}
          onStoryViewed={() => {}}
        />
      )}

      {/* Unfollow Confirmation Dialog */}
      <UnfollowConfirmDialog
        isOpen={confirmDialog.type === 'unfollow' && !!confirmDialog.user}
        onClose={() => setConfirmDialog({ type: null, user: null })}
        onConfirm={async () => {
          if (confirmDialog.user) {
            await unfollowUserKeepInList(confirmDialog.user.id);
          }
          setConfirmDialog({ type: null, user: null });
        }}
        avatarUrl={confirmDialog.user?.avatar_url || null}
        username={confirmDialog.user?.username || ''}
      />

      {/* Remove Follower Confirmation Dialog */}
      <RemoveFollowerConfirmDialog
        isOpen={confirmDialog.type === 'remove-follower' && !!confirmDialog.user}
        onClose={() => setConfirmDialog({ type: null, user: null })}
        onConfirm={async () => {
          if (confirmDialog.user) {
            await removeFollower(confirmDialog.user.id);
          }
          setConfirmDialog({ type: null, user: null });
        }}
        avatarUrl={confirmDialog.user?.avatar_url || null}
        username={confirmDialog.user?.username || ''}
      />
    </>
  );
};

export default FollowersModal;
