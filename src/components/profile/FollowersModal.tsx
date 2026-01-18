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
import StoriesViewer from '../StoriesViewer';
import { cn } from '@/lib/utils';
import useEmblaCarousel from 'embla-carousel-react';

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'followers' | 'following';
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

const FollowersModal = ({ isOpen, onClose, initialTab = 'followers', userId, onFollowChange }: FollowersModalProps) => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const targetUserId = userId || currentUser?.id;
  const { profile: targetProfile } = useOptimizedProfile(targetUserId);
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [users, setUsers] = useState<UserWithFollowStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { stories } = useStories();
  const [isStoriesViewerOpen, setIsStoriesViewerOpen] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  
  // Embla Carousel for smooth swiping
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false,
    startIndex: initialTab === 'followers' ? 0 : 1,
  });
  
  // Cache for both tabs to reduce refetching
  const followersCache = useRef<UserWithFollowStatus[]>([]);
  const followingCache = useRef<UserWithFollowStatus[]>([]);
  const cacheLoaded = useRef<{ followers: boolean; following: boolean }>({ followers: false, following: false });

  // Sync Embla with activeTab
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const index = emblaApi.selectedScrollSnap();
    setActiveTab(index === 0 ? 'followers' : 'following');
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Handle tab click - scroll carousel
  const handleTabClick = (tab: 'followers' | 'following') => {
    setActiveTab(tab);
    emblaApi?.scrollTo(tab === 'followers' ? 0 : 1);
  };

  // Sync activeTab when initialTab changes (e.g., when modal opens with different tab)
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      emblaApi?.scrollTo(initialTab === 'followers' ? 0 : 1, true);
      // Reset cache when modal opens
      cacheLoaded.current = { followers: false, following: false };
    }
  }, [initialTab, isOpen, emblaApi]);

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
      if (!targetUserId) {
        setUsers([]);
        setLoading(false);
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

          // Fetch saved places from BOTH saved_places and user_saved_locations for each user
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

          // Count distinct places for each user (combining both tables)
          const placesCountMap = new Map<string, number>();
          
          // Process saved_places (using place_id as unique identifier)
          const savedPlacesDistinct = new Map<string, Set<string>>();
          savedPlacesResult.data?.forEach((sp: any) => {
            if (!sp.user_id || !sp.place_id) return;
            if (!savedPlacesDistinct.has(sp.user_id)) savedPlacesDistinct.set(sp.user_id, new Set());
            savedPlacesDistinct.get(sp.user_id)!.add(`sp_${sp.place_id}`);
          });

          // Process user_saved_locations (using location_id as unique identifier)
          userSavedLocationsResult.data?.forEach((usl: any) => {
            if (!usl.user_id || !usl.location_id) return;
            if (!savedPlacesDistinct.has(usl.user_id)) savedPlacesDistinct.set(usl.user_id, new Set());
            savedPlacesDistinct.get(usl.user_id)!.add(`usl_${usl.location_id}`);
          });

          // Calculate total count for each user
          savedPlacesDistinct.forEach((places, userId) => {
            placesCountMap.set(userId, places.size);
          });

          // Check follow status for each user
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
          
          // Update cache
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

    if (isOpen) {
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

  const isOwnProfile = currentUser?.id === targetUserId;

  const filteredUsers = users.filter(user => 
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

  // User Row Component - Clean minimal design
  const UserRow = ({ user, index }: { user: UserWithFollowStatus; index: number }) => {
    const now = new Date();
    const userHasStories = stories.some(s => 
      s.user_id === user.id && 
      new Date(s.expires_at) > now
    );

    const renderActionButton = () => {
      if (currentUser?.id === user.id) return null;
      
      if (isOwnProfile && activeTab === 'followers') {
        return (
          <button
            onClick={() => removeFollower(user.id)}
            className="text-sm font-medium text-destructive hover:text-destructive/80 transition-colors px-3 py-1.5"
          >
            {t('remove', { ns: 'common' })}
          </button>
        );
      }
      
      if (user.isFollowing) {
        return (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => unfollowUser(user.id)}
            className="rounded-lg h-8 px-4 text-xs font-medium bg-muted hover:bg-muted/80"
          >
            {t('following', { ns: 'common' })}
          </Button>
        );
      }
      
      return (
        <Button
          size="sm"
          onClick={() => followUser(user.id)}
          className="rounded-lg h-8 px-4 text-xs font-medium"
        >
          {t('follow', { ns: 'common' })}
        </Button>
      );
    };

    return (
      <div 
        className="flex items-center gap-3 py-3 px-4 hover:bg-muted/30 transition-colors"
        style={{ 
          animationDelay: `${index * 30}ms`,
          animation: 'fadeIn 0.2s ease-out forwards',
          opacity: 0,
        }}
      >
        {/* Avatar */}
        <button
          onClick={() => handleAvatarClick(user)}
          className="shrink-0"
        >
          <div className={cn(
            "rounded-full p-[2px]",
            userHasStories 
              ? "bg-gradient-to-tr from-primary to-primary/60" 
              : ""
          )}>
            <Avatar className={cn(
              "w-12 h-12",
              userHasStories && "border-2 border-background"
            )}>
              <AvatarImage src={user.avatar_url || undefined} className="object-cover" />
              <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
                {getInitials(user.username || 'User')}
              </AvatarFallback>
            </Avatar>
          </div>
        </button>

        {/* User info */}
        <button
          onClick={() => {
            onClose();
            navigate(`/profile/${user.id}`);
          }}
          className="text-left min-w-0 flex-1"
        >
          <p className="font-semibold text-foreground text-[15px] truncate">
            {user.username || 'Unknown User'}
          </p>
          <div className="flex items-center gap-1 text-[13px] text-muted-foreground mt-0.5">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">
              {user.savedPlacesCount || 0} {t('savedPlaces', { ns: 'profile', defaultValue: 'luoghi salvati' })}
            </span>
          </div>
        </button>
        
        {/* Action button */}
        {renderActionButton()}
      </div>
    );
  };

  // Content for each tab
  const TabContent = ({ tabType }: { tabType: 'followers' | 'following' }) => {
    const isActiveTab = activeTab === tabType;
    const displayUsers = isActiveTab ? filteredUsers : [];
    
    return (
      <ScrollArea className="h-full">
        <div className="pb-20">
          {loading && isActiveTab ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            </div>
          ) : displayUsers.length === 0 && isActiveTab ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <p className="text-muted-foreground text-sm">
                {searchQuery 
                  ? t('noResults', { ns: 'common' }) 
                  : tabType === 'followers' 
                    ? t('noFollowers', { ns: 'profile' }) 
                    : t('noFollowing', { ns: 'profile' })
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {displayUsers.map((user, index) => (
                <UserRow key={user.id} user={user} index={index} />
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
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      
      <div className="fixed inset-0 bg-background z-[2000] flex flex-col pt-[env(safe-area-inset-top)]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
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

        {/* Tab Switcher - Clean underline style */}
        <div className="border-b border-border/50">
          <div className="flex">
            <button 
              onClick={() => handleTabClick('followers')}
              className={cn(
                "flex-1 py-3.5 text-center relative transition-colors",
                activeTab === 'followers' ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <span className="font-semibold">{followersCount}</span>
              <span className="ml-1.5 text-sm">
                {t('followers', { ns: 'common' })}
              </span>
              {activeTab === 'followers' && (
                <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-foreground rounded-full" />
              )}
            </button>
            
            <button 
              onClick={() => handleTabClick('following')}
              className={cn(
                "flex-1 py-3.5 text-center relative transition-colors",
                activeTab === 'following' ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <span className="font-semibold">{followingCount}</span>
              <span className="ml-1.5 text-sm">
                {t('followingTab', { ns: 'common', defaultValue: 'Seguiti' })}
              </span>
              {activeTab === 'following' && (
                <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-foreground rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-3 border-b border-border/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('search', { ns: 'common' })}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 rounded-lg bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/50"
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
            {/* Followers Panel */}
            <div className="flex-[0_0_100%] min-w-0 h-full">
              <TabContent tabType="followers" />
            </div>
            
            {/* Following Panel */}
            <div className="flex-[0_0_100%] min-w-0 h-full">
              <TabContent tabType="following" />
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
            userName: users.find(u => u.id === s.user_id)?.username || 'User',
            userAvatar: users.find(u => u.id === s.user_id)?.avatar_url || '',
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
