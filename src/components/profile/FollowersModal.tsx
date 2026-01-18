import { ArrowLeft, Search, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useStories } from '@/hooks/useStories';
import { useOptimizedProfile } from '@/hooks/useOptimizedProfile';
import { useMutualFollowers } from '@/hooks/useMutualFollowers';
import StoriesViewer from '../StoriesViewer';
import { cn } from '@/lib/utils';
import useEmblaCarousel from 'embla-carousel-react';

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
}

type TabType = 'mutuals' | 'following' | 'followers';

const FollowersModal = ({ isOpen, onClose, initialTab = 'followers', userId, onFollowChange }: FollowersModalProps) => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const targetUserId = userId || currentUser?.id;
  const { profile: targetProfile } = useOptimizedProfile(targetUserId);
  
  // Determine initial tab - mutuals only shown when viewing other profiles
  const isOwnProfile = currentUser?.id === targetUserId;
  const getInitialTab = (): TabType => {
    if (initialTab === 'mutuals' && !isOwnProfile) return 'mutuals';
    if (initialTab === 'followers') return 'followers';
    if (initialTab === 'following') return 'following';
    // Default to following for own profile, followers for others
    return isOwnProfile ? 'following' : 'followers';
  };
  
  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab());
  const [users, setUsers] = useState<UserWithFollowStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { stories } = useStories();
  const [isStoriesViewerOpen, setIsStoriesViewerOpen] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  
  // Mutuals data - only fetch when viewing other profiles
  const shouldFetchMutuals = !isOwnProfile && isOpen;
  const { mutualFollowers, totalCount: mutualsCount, loading: mutualsLoading } = useMutualFollowers(
    shouldFetchMutuals ? targetUserId : undefined, 
    shouldFetchMutuals
  );
  
  // Embla Carousel for smooth swiping - 3 panels when viewing others, 2 for own profile
  const tabCount = isOwnProfile ? 2 : 3;
  const getTabIndex = (tab: TabType): number => {
    if (isOwnProfile) {
      // Own profile: following (0), followers (1)
      return tab === 'following' ? 0 : 1;
    }
    // Other profile: mutuals (0), following (1), followers (2)
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
  
  // Cache for tabs to reduce refetching
  const followersCache = useRef<UserWithFollowStatus[]>([]);
  const followingCache = useRef<UserWithFollowStatus[]>([]);
  const cacheLoaded = useRef<{ followers: boolean; following: boolean }>({ followers: false, following: false });

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
      cacheLoaded.current = { followers: false, following: false };
    }
  }, [initialTab, isOpen, emblaApi, isOwnProfile]);

  // Fetch counts on modal open
  useEffect(() => {
    const fetchCounts = async () => {
      if (!targetUserId || !isOpen) return;
      
      const [followersResult, followingResult] = await Promise.all([
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', targetUserId),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', targetUserId),
      ]);
      
      setFollowersCount(followersResult.count || 0);
      setFollowingCount(followingResult.count || 0);
    };
    
    fetchCounts();
  }, [targetUserId, isOpen]);

  useEffect(() => {
    const fetchFollowData = async () => {
      if (!targetUserId || activeTab === 'mutuals') {
        if (activeTab !== 'mutuals') {
          setUsers([]);
          setLoading(false);
        }
        return;
      }

      // Check cache first
      if (activeTab === 'followers' && cacheLoaded.current.followers) {
        setUsers(followersCache.current);
        setLoading(false);
        return;
      }
      if (activeTab === 'following' && cacheLoaded.current.following) {
        setUsers(followingCache.current);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        let query = supabase
          .from('follows')
          .select(`
            ${activeTab === 'followers' ? 'follower_id' : 'following_id'},
            profiles!${activeTab === 'followers' ? 'follows_follower_id_fkey' : 'follows_following_id_fkey'} (
              id,
              username,
              avatar_url
            )
          `);

        if (activeTab === 'followers') {
          query = query.eq('following_id', targetUserId);
        } else {
          query = query.eq('follower_id', targetUserId);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching follow data:', error);
          setUsers([]);
        } else {
          const followUsers = data?.map((item: any) => item.profiles).filter(Boolean) || [];
          
          const userIds = followUsers.map((u: any) => u.id);

          const [savedPlacesResult, userSavedLocationsResult] = await Promise.all([
            supabase
              .from('saved_places')
              .select('user_id, place_id')
              .in('user_id', userIds),
            supabase
              .from('user_saved_locations')
              .select('user_id, location_id')
              .in('user_id', userIds)
          ]);

          const savedPlacesDistinct = new Map<string, Set<string>>();
          savedPlacesResult.data?.forEach((sp: any) => {
            if (!sp.user_id || !sp.place_id) return;
            if (!savedPlacesDistinct.has(sp.user_id)) savedPlacesDistinct.set(sp.user_id, new Set());
            savedPlacesDistinct.get(sp.user_id)!.add(`sp_${sp.place_id}`);
          });

          userSavedLocationsResult.data?.forEach((usl: any) => {
            if (!usl.user_id || !usl.location_id) return;
            if (!savedPlacesDistinct.has(usl.user_id)) savedPlacesDistinct.set(usl.user_id, new Set());
            savedPlacesDistinct.get(usl.user_id)!.add(`usl_${usl.location_id}`);
          });

          const placesCountMap = new Map<string, number>();
          savedPlacesDistinct.forEach((places, usrId) => {
            placesCountMap.set(usrId, places.size);
          });

          let usersWithStatus: UserWithFollowStatus[];
          if (currentUser) {
            const { data: followsData } = await supabase
              .from('follows')
              .select('following_id')
              .eq('follower_id', currentUser.id)
              .in('following_id', userIds);

            const followingIds = new Set(followsData?.map(f => f.following_id) || []);

            usersWithStatus = followUsers.map((u: any) => ({
              ...u,
              isFollowing: followingIds.has(u.id),
              savedPlacesCount: placesCountMap.get(u.id) || 0,
            }));
          } else {
            usersWithStatus = followUsers.map((u: any) => ({
              ...u,
              savedPlacesCount: placesCountMap.get(u.id) || 0,
            }));
          }
          
          if (activeTab === 'followers') {
            followersCache.current = usersWithStatus;
            cacheLoaded.current.followers = true;
          } else {
            followingCache.current = usersWithStatus;
            cacheLoaded.current.following = true;
          }
          
          setUsers(usersWithStatus);
        }
      } catch (error) {
        console.error('Error fetching follow data:', error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && activeTab !== 'mutuals') {
      fetchFollowData();
    }
  }, [targetUserId, activeTab, isOpen, currentUser]);

  const followUser = async (targetId: string) => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: currentUser.id,
          following_id: targetId,
        });

      if (!error) {
        setUsers(prev => prev.map(u => 
          u.id === targetId ? { ...u, isFollowing: true } : u
        ));
        onFollowChange?.();
      }
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const unfollowUser = async (targetId: string) => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', targetId);

      if (!error) {
        setUsers(prev => prev.map(u => 
          u.id === targetId ? { ...u, isFollowing: false } : u
        ));
        onFollowChange?.();
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  };

  const removeFollower = async (followerId: string) => {
    if (!currentUser) return;

    try {
      const { error } = await supabase.rpc('remove_follower', {
        follower_user_id: followerId
      });

      if (!error) {
        setUsers(prev => prev.filter(u => u.id !== followerId));
        setFollowersCount(prev => Math.max(0, prev - 1));
        onFollowChange?.();
      } else {
        console.error('Error removing follower:', error);
      }
    } catch (error) {
      console.error('Error removing follower:', error);
    }
  };

  const getInitials = (username: string) => {
    return username ? username.substring(0, 2).toUpperCase() : 'U';
  };

  // Get current data based on active tab
  const getCurrentUsers = (): UserWithFollowStatus[] => {
    if (activeTab === 'mutuals') {
      return mutualFollowers.map(m => ({
        id: m.id,
        username: m.username,
        avatar_url: m.avatar_url,
        isFollowing: m.isFollowing,
        savedPlacesCount: m.savedPlacesCount,
      }));
    }
    return users;
  };

  const filteredUsers = getCurrentUsers().filter(user => 
    user.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAvatarClick = (user: UserWithFollowStatus) => {
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
  };

  // User Grid Card Component - memoize to prevent unnecessary re-renders
  const UserGridCard = ({ user, index }: { user: UserWithFollowStatus; index: number }) => {
    const now = new Date();
    const userHasStories = stories.some(s => 
      s.user_id === user.id && 
      new Date(s.expires_at) > now
    );

    // Cache avatar URL to prevent reload
    const avatarUrl = user.avatar_url || undefined;

    return (
      <div 
        className="flex flex-col items-center gap-2 p-3"
        style={{ 
          animationDelay: `${index * 40}ms`,
          animation: 'fadeIn 0.25s ease-out forwards',
          opacity: 0,
        }}
      >
        {/* Avatar */}
        <button
          onClick={() => handleAvatarClick(user)}
          className="relative group"
        >
          <div className={cn(
            "rounded-[22px] p-[2.5px] transition-transform group-hover:scale-105",
            userHasStories 
              ? "bg-gradient-to-br from-primary via-primary/80 to-primary/60" 
              : ""
          )}>
            <Avatar className={cn(
              "w-20 h-20 rounded-[20px]",
              userHasStories && "border-2 border-background"
            )}>
              <AvatarImage 
                src={avatarUrl} 
                className="object-cover rounded-[20px]" 
                loading="lazy"
              />
              <AvatarFallback className="bg-muted text-muted-foreground text-lg font-semibold rounded-[20px]">
                {getInitials(user.username || 'User')}
              </AvatarFallback>
            </Avatar>
          </div>
          
          {/* Places badge */}
          {(user.savedPlacesCount ?? 0) > 0 && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-primary text-primary-foreground text-[10px] font-medium px-1.5 py-0.5 rounded-full shadow-sm">
              <MapPin className="w-2.5 h-2.5" />
              <span>{user.savedPlacesCount}</span>
            </div>
          )}
        </button>

        {/* Username */}
        <button
          onClick={() => {
            onClose();
            navigate(`/profile/${user.id}`);
          }}
          className="text-center w-full"
        >
          <p className="font-medium text-foreground text-xs truncate max-w-[80px]">
            {user.username || 'User'}
          </p>
        </button>

        {/* Action Button */}
        {currentUser?.id !== user.id && (
          <div className="mt-1">
            {isOwnProfile && activeTab === 'followers' ? (
              <button
                onClick={() => removeFollower(user.id)}
                className="text-[10px] font-medium text-destructive hover:text-destructive/80 transition-colors px-2 py-1 rounded-md hover:bg-destructive/10"
              >
                {t('remove', { ns: 'common' })}
              </button>
            ) : user.isFollowing ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => unfollowUser(user.id)}
                className="rounded-full h-6 px-3 text-[10px] font-medium bg-muted hover:bg-muted/80"
              >
                {t('following', { ns: 'common' })}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => followUser(user.id)}
                className="rounded-full h-6 px-3 text-[10px] font-medium"
              >
                {t('follow', { ns: 'common' })}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  // Grid Content for each tab
  const TabGridContent = ({ tabType }: { tabType: TabType }) => {
    const isActiveTab = activeTab === tabType;
    const isLoading = tabType === 'mutuals' ? mutualsLoading : loading;
    const displayUsers = isActiveTab ? filteredUsers : [];
    
    return (
      <ScrollArea className="h-full">
        <div className="pb-20 pt-2">
          {isLoading && isActiveTab ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            </div>
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
            <div className="grid grid-cols-3 gap-1 px-2">
              {displayUsers.map((user, index) => (
                <UserGridCard key={user.id} user={user} index={index} />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
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
                <TabGridContent tabType="mutuals" />
              </div>
            )}
            
            <div className="flex-[0_0_100%] min-w-0 h-full">
              <TabGridContent tabType="following" />
            </div>
            
            <div className="flex-[0_0_100%] min-w-0 h-full">
              <TabGridContent tabType="followers" />
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
    </>
  );
};

export default FollowersModal;
