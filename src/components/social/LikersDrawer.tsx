import React, { useState, useEffect, useRef } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Search } from 'lucide-react';

const PAGE_SIZE = 50;

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
  const [likers, setLikers] = useState<Liker[]>([]);
  const [filteredLikers, setFilteredLikers] = useState<Liker[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [followLoading, setFollowLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const followingIdsRef = useRef<Set<string>>(new Set());

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
      // reset state and load first page
      setLikers([]);
      setFilteredLikers([]);
      setSearchQuery('');
      setHasMore(true);
      setPage(0);
      loadPage(0, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const ensureFollowingIds = async () => {
    if (!user?.id) {
      followingIdsRef.current = new Set();
      return;
    }

    const { data: follows, error } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);

    if (!error) {
      followingIdsRef.current = new Set(follows?.map((f) => f.following_id) || []);
    }
  };

  const loadPage = async (pageToLoad: number, initial = false) => {
    if (!postId) return;

    if (initial) {
      setLoading(true);
      await ensureFollowingIds();
    } else {
      setLoadingMore(true);
    }

    try {
      const from = pageToLoad * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data: likes, error } = await supabase
        .from('post_likes')
        .select('user_id, created_at')
        .eq('post_id', postId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching likes:', error);
        if (initial) setLikers([]);
        setHasMore(false);
        return;
      }

      const batch = likes || [];
      if (batch.length < PAGE_SIZE) setHasMore(false);

      if (batch.length === 0) {
        if (initial) setLikers([]);
        return;
      }

      const userIds = batch.map((l) => l.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return;
      }

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
      const followingIds = followingIdsRef.current;

      const likersBatch: Liker[] = batch
        .map((like) => {
          const profile = profileMap.get(like.user_id);
          if (!profile) return null;
          return {
            user_id: like.user_id,
            username: profile.username || 'User',
            full_name: profile.full_name || null,
            avatar_url: profile.avatar_url || null,
            is_followed: followingIds.has(like.user_id),
          };
        })
        .filter((u): u is Liker => u !== null);

      setLikers((prev) => {
        const seen = new Set(prev.map((p) => p.user_id));
        const merged = [...prev];
        for (const l of likersBatch) {
          if (!seen.has(l.user_id)) {
            seen.add(l.user_id);
            merged.push(l);
          }
        }
        return merged;
      });

      setPage(pageToLoad);
    } catch (e) {
      console.error('Error loading likers:', e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleListScroll = () => {
    const el = listRef.current;
    if (!el || loading || loadingMore || !hasMore) return;
    // load more when within 200px of bottom
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
      loadPage(page + 1, false);
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
    <Drawer
      open={isOpen}
      modal={false}
      shouldScaleBackground={false}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DrawerContent showHandle={false} className="h-[82vh] max-h-[90vh]">
        <DrawerHeader className="border-b-0 pb-2">
          <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mb-2" />
          <DrawerTitle className="text-center">
            {t('likes', { ns: 'common', defaultValue: 'Likes' })}
          </DrawerTitle>
        </DrawerHeader>
        
        {/* Search bar */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('search', { ns: 'common', defaultValue: 'Search' })}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/50 border-0"
            />
          </div>
        </div>

        <div ref={listRef} onScroll={handleListScroll} className="flex-1 overflow-y-auto px-4 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLikers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? t('noResults', { ns: 'common', defaultValue: 'No results' }) : t('noLikesYet', { ns: 'common', defaultValue: 'No likes yet' })}
            </div>
          ) : (
            <div className="space-y-0">
              {filteredLikers.map((liker) => (
                <div 
                  key={liker.user_id}
                  className="flex items-center justify-between py-3"
                >
                  <button
                    onClick={() => handleUserClick(liker.user_id)}
                    className="flex items-center gap-3 flex-1 text-left"
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
                      className={`rounded-lg px-6 ${
                        liker.is_followed 
                          ? 'bg-muted hover:bg-muted/80' 
                          : 'bg-primary hover:bg-primary/90'
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

              {hasMore && !searchQuery && (
                <div className="flex items-center justify-center py-4">
                  {loadingMore ? (
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => loadPage(page + 1, false)}>
                      {t('loadMore', { ns: 'common', defaultValue: 'Load more' })}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
