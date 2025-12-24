import { ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useStories } from '@/hooks/useStories';
import { useOptimizedProfile } from '@/hooks/useOptimizedProfile';
import StoriesViewer from '../StoriesViewer';
import { cn } from '@/lib/utils';

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'followers' | 'following';
  userId?: string;
}

interface UserWithFollowStatus {
  id: string;
  username: string;
  avatar_url: string | null;
  isFollowing?: boolean;
  savedPlacesCount?: number;
}

const FollowersModal = ({ isOpen, onClose, initialTab = 'followers', userId }: FollowersModalProps) => {
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
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  
  // Cache for both tabs to reduce refetching
  const followersCache = useRef<UserWithFollowStatus[]>([]);
  const followingCache = useRef<UserWithFollowStatus[]>([]);
  const cacheLoaded = useRef<{ followers: boolean; following: boolean }>({ followers: false, following: false });

  // Sync activeTab when initialTab changes (e.g., when modal opens with different tab)
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      // Reset cache when modal opens
      cacheLoaded.current = { followers: false, following: false };
    }
  }, [initialTab, isOpen]);

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

          // Fetch saved places (distinct by place_id) for each user
          const { data: savedPlacesData } = await supabase
            .from('saved_places')
            .select('user_id, place_id')
            .in('user_id', userIds);

          const savedPlacesDistinct = new Map<string, Set<string>>();
          savedPlacesData?.forEach((sp: any) => {
            if (!sp.user_id || !sp.place_id) return;
            if (!savedPlacesDistinct.has(sp.user_id)) savedPlacesDistinct.set(sp.user_id, new Set());
            savedPlacesDistinct.get(sp.user_id)!.add(sp.place_id);
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
              savedPlacesCount: savedPlacesDistinct.get(u.id)?.size || 0,
            }));
          } else {
            usersWithStatus = followUsers.map((u: any) => ({
              ...u,
              savedPlacesCount: savedPlacesDistinct.get(u.id)?.size || 0,
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
        // Keep user in list but mark as not following (show "Segui" button)
        setUsers(prev => prev.map(u => 
          u.id === targetId ? { ...u, isFollowing: false } : u
        ));
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  };

  const removeFollower = async (followerId: string) => {
    if (!currentUser) return;

    try {
      // Use the RPC function to remove follower (bypasses RLS)
      const { error } = await supabase.rpc('remove_follower', {
        follower_user_id: followerId
      });

      if (!error) {
        setUsers(prev => prev.filter(u => u.id !== followerId));
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

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
  };

  const handleTouchMove = (_e: React.TouchEvent) => {
    // We only care about the final position on touch end
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const touch = e.changedTouches[0];
    const dx = touchStartX.current - touch.clientX;
    const dy = touchStartY.current - touch.clientY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const minDistance = 30;

    if (absDx > absDy && absDx > minDistance) {
      if (dx > 0 && activeTab === 'followers') {
        setActiveTab('following');
      } else if (dx < 0 && activeTab === 'following') {
        setActiveTab('followers');
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-background z-[2000] flex flex-col pt-[env(safe-area-inset-top)]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header with Back Button and Username */}
        <div className="flex items-center gap-4 p-4">
          <button onClick={onClose} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h2 className="text-xl font-bold text-foreground">
            {targetProfile?.username || 'User'}
          </h2>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto px-4 mb-4">
          <button
            onClick={() => setActiveTab('followers')}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors relative min-w-[120px]",
              activeTab === 'followers' 
                ? "text-foreground" 
                : "text-muted-foreground"
            )}
          >
            {t('followers', { ns: 'common' })}
            {activeTab === 'followers' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors relative min-w-[120px]",
              activeTab === 'following' 
                ? "text-foreground" 
                : "text-muted-foreground"
            )}
          >
            {t('followingTab', { ns: 'common', defaultValue: 'Seguiti' })}
            {activeTab === 'following' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('search', { ns: 'common' })}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        {/* Content */}
        <ScrollArea className="flex-1">
          <div 
            className="p-4 space-y-4"
          >
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? t('noResults', { ns: 'common' }) : activeTab === 'followers' ? t('noFollowers', { ns: 'profile' }) : t('noFollowing', { ns: 'profile' })}
              </div>
            ) : (
              filteredUsers.map((user) => {
                const now = new Date();
                const userHasStories = stories.some(s => 
                  s.user_id === user.id && 
                  new Date(s.expires_at) > now
                );

                return (
                  <div key={user.id} className="flex items-center gap-3">
                    <button
                      onClick={() => handleAvatarClick(user)}
                      className="shrink-0"
                    >
                      <div className={cn(
                        "rounded-full p-[2px]",
                        userHasStories ? "bg-gradient-to-tr from-primary to-primary/50" : ""
                      )}>
                        <Avatar className="w-12 h-12 border-2 border-background">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>
                            {getInitials(user.username || 'User')}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        navigate(`/profile/${user.id}`);
                      }}
                      className="text-left min-w-0 flex-1"
                    >
                      <p className="font-medium text-foreground truncate">{user.username || 'Unknown User'}</p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground overflow-x-auto scrollbar-hide">
                        <span className="whitespace-nowrap">{t('visitedOn', { ns: 'explore', defaultValue: 'ha visitato' })}</span>
                        <span className="whitespace-nowrap">·</span>
                        <span className="whitespace-nowrap">{user.savedPlacesCount || 0} {t('place', { ns: 'explore', count: user.savedPlacesCount || 0, defaultValue: 'Luoghi' })}</span>
                      </div>
                    </button>
                    
                    {currentUser?.id !== user.id && (
                      isOwnProfile && activeTab === 'following' ? (
                        user.isFollowing ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => unfollowUser(user.id)}
                            className="rounded-full shrink-0"
                          >
                            {t('following', { ns: 'common' })}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => followUser(user.id)}
                            className="rounded-full shrink-0"
                          >
                            {t('follow', { ns: 'common' })}
                          </Button>
                        )
                      ) : isOwnProfile && activeTab === 'followers' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeFollower(user.id)}
                          className="rounded-full text-destructive hover:bg-destructive/10 shrink-0"
                        >
                          {t('remove', { ns: 'common' })}
                        </Button>
                      ) : user.isFollowing ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => unfollowUser(user.id)}
                          className="rounded-full shrink-0"
                        >
                          {t('following', { ns: 'common' })}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => followUser(user.id)}
                          className="rounded-full shrink-0"
                        >
                          {t('follow', { ns: 'common' })}
                        </Button>
                      )
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
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
