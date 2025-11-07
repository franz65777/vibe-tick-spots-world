import { ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
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

  useEffect(() => {
    const fetchFollowData = async () => {
      if (!targetUserId) {
        setUsers([]);
        setLoading(false);
        return;
      }

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
          
          // Check follow status for each user
          if (currentUser) {
            const userIds = followUsers.map((u: any) => u.id);
            const { data: followsData } = await supabase
              .from('follows')
              .select('following_id')
              .eq('follower_id', currentUser.id)
              .in('following_id', userIds);
            
            const followingIds = new Set(followsData?.map(f => f.following_id) || []);
            
            const usersWithStatus = followUsers.map((u: any) => ({
              ...u,
              isFollowing: followingIds.has(u.id)
            }));
            
            setUsers(usersWithStatus);
          } else {
            setUsers(followUsers);
          }
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
        if (activeTab === 'following') {
          setUsers(prev => prev.filter(u => u.id !== targetId));
        } else {
          setUsers(prev => prev.map(u => 
            u.id === targetId ? { ...u, isFollowing: false } : u
          ));
        }
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  };

  const removeFollower = async (followerId: string) => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', currentUser.id);

      if (!error) {
        setUsers(prev => prev.filter(u => u.id !== followerId));
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
      navigate(`/profile/${user.id}`);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-background z-[100] flex flex-col">
        {/* Header with Back Button and Username */}
        <div className="flex items-center gap-4 p-4">
          <button onClick={onClose} className="p-2 -ml-2 mt-5">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h2 className="text-xl font-bold text-foreground mt-5">
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
            {t('following', { ns: 'common' })}
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
          <div className="p-4 space-y-4">
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
                  <div key={user.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
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
                        onClick={() => navigate(`/profile/${user.id}`)}
                        className="text-left min-w-0 flex-1"
                      >
                        <p className="font-medium text-foreground truncate">{user.username || 'Unknown User'}</p>
                        <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
                      </button>
                    </div>
                    
                    {currentUser?.id !== user.id && (
                      isOwnProfile && activeTab === 'following' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => unfollowUser(user.id)}
                          className="rounded-full shrink-0"
                        >
                          {t('following', { ns: 'common' })}
                        </Button>
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
