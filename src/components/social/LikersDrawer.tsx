import React, { useState, useEffect } from 'react';
import { Drawer } from 'vaul';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import UserListSkeleton from '@/components/common/skeletons/UserListSkeleton';
import { invalidateFollowList } from '@/hooks/useFollowList';

interface Liker {
  user_id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_followed: boolean;
}

interface LikersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
}

export const LikersDrawer: React.FC<LikersDrawerProps> = ({ isOpen, onClose, postId }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [likers, setLikers] = useState<Liker[]>([]);
  const [filteredLikers, setFilteredLikers] = useState<Liker[]>([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Hide bottom navigation when drawer is open
  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('ui:overlay-open'));
    } else {
      window.dispatchEvent(new CustomEvent('ui:overlay-close'));
    }
    return () => {
      window.dispatchEvent(new CustomEvent('ui:overlay-close'));
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && postId) {
      loadLikers();
    }
  }, [isOpen, postId]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredLikers(likers.filter(l => 
        l.username.toLowerCase().includes(query) ||
        (l.full_name && l.full_name.toLowerCase().includes(query))
      ));
    } else {
      setFilteredLikers(likers);
    }
  }, [searchQuery, likers]);

  const loadLikers = async () => {
    setLoading(true);
    try {
      // First get all like user_ids for this post
      const { data: likes, error: likesError } = await supabase
        .from('post_likes')
        .select('user_id, created_at')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (likesError) {
        console.error('Error fetching likes:', likesError);
        setLikers([]);
        setLoading(false);
        return;
      }

      if (!likes || likes.length === 0) {
        setLikers([]);
        setLoading(false);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(likes.map(l => l.user_id))];

      // Fetch profiles separately for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Create a map of user_id to profile
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Get current user's follows
      let followingIds = new Set<string>();
      if (user?.id) {
        const { data: follows } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);
        followingIds = new Set(follows?.map(f => f.following_id) || []);
      }

      // Map likes to Liker format using the profile map
      const likersList = likes
        .map(like => {
          const profile = profileMap.get(like.user_id);
          
          return {
            user_id: like.user_id,
            username: profile?.username || 'User',
            full_name: profile?.full_name || null,
            avatar_url: profile?.avatar_url || null,
            is_followed: followingIds.has(like.user_id)
          };
        })
        .filter((u): u is Liker => u !== null);

      // Prioritize followed users, then others
      const followedUsers = likersList.filter(u => u.is_followed);
      const otherUsers = likersList.filter(u => !u.is_followed);

      setLikers([...followedUsers, ...otherUsers]);
    } catch (error) {
      console.error('Error loading likers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async (likerId: string) => {
    if (!user?.id || likerId === user.id) return;
    
    setFollowLoading(likerId);
    try {
      const liker = likers.find(l => l.user_id === likerId);
      if (!liker) return;

      if (liker.is_followed) {
        // Unfollow
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', likerId);
      } else {
        // Follow
        await supabase
          .from('follows')
          .insert({ follower_id: user.id, following_id: likerId });
      }

      // Update local state
      setLikers(prev => prev.map(l => 
        l.user_id === likerId 
          ? { ...l, is_followed: !l.is_followed }
          : l
      ));

      // Invalidate follow-list cache so FollowersModal shows the updated list
      if (user?.id) {
        invalidateFollowList(queryClient, user.id, 'following');
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setFollowLoading(null);
    }
  };

  const handleUserClick = (userId: string) => {
    onClose();
    navigate(`/profile/${userId}`);
  };

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      modal={true}
      dismissible={true}
    >
      <Drawer.Portal>
        <Drawer.Overlay 
          className="fixed inset-0 bg-black/40 z-[2147483647]" 
          onClick={onClose} 
        />
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-[2147483647] bg-[#F5F1EA]/90 dark:bg-background/90 backdrop-blur-xl rounded-t-3xl flex flex-col outline-none shadow-2xl"
          style={{
            height: '85vh',
            maxHeight: '85vh',
          }}
        >
          {/* Handle bar - centered */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1.5 bg-muted-foreground/30 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-center px-4 py-3 shrink-0">
            <h3 className="font-semibold text-base">
              {t('likes', { ns: 'common', defaultValue: 'Likes' })}
            </h3>
          </div>

          {/* Search bar - premium style with emoji */}
          <div className="px-4 pb-3">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base z-10">🔍</span>
              <Input
                placeholder={t('search', { ns: 'common', defaultValue: 'Cerca' })}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-12 rounded-full bg-white dark:bg-muted border-0 text-base shadow-sm"
              />
            </div>
          </div>

          {/* User list with ScrollArea */}
          <ScrollArea className="flex-1 px-4">
            {loading ? (
              <UserListSkeleton count={6} />
            ) : filteredLikers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery 
                  ? t('noResults', { ns: 'common', defaultValue: 'No results' }) 
                  : t('noLikesYet', { ns: 'common', defaultValue: 'No likes yet' })}
              </div>
            ) : (
              <div className="space-y-0 pb-6">
                {filteredLikers.map((liker) => (
                  <div 
                    key={liker.user_id}
                    className="flex items-center justify-between py-3"
                  >
                    <button
                      onClick={() => handleUserClick(liker.user_id)}
                      className="flex items-center gap-3 flex-1 text-left active:opacity-70 transition-opacity"
                    >
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={liker.avatar_url || undefined} />
                        <AvatarFallback className="bg-muted text-muted-foreground text-lg">
                          {liker.username?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{liker.username}</span>
                        {liker.full_name && (
                          <span className="text-sm text-muted-foreground">{liker.full_name}</span>
                        )}
                      </div>
                    </button>
                    
                    {user?.id && liker.user_id !== user.id && (
                      <Button
                        variant={liker.is_followed ? "secondary" : "default"}
                        size="sm"
                        onClick={() => handleFollowToggle(liker.user_id)}
                        disabled={followLoading === liker.user_id}
                        className={`rounded-full px-6 h-9 text-sm font-semibold active:scale-[0.97] transition-all ${
                          liker.is_followed 
                            ? 'bg-muted hover:bg-muted/80' 
                            : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                        }`}
                      >
                        {followLoading === liker.user_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : liker.is_followed ? (
                          t('following', { ns: 'common', defaultValue: 'Following' })
                        ) : (
                          t('follow', { ns: 'common', defaultValue: 'Follow' })
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};
