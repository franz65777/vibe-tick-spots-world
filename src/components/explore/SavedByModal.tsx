import { X, Search, UserPlus, Check, Bookmark } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { SAVE_TAG_OPTIONS, type SaveTag } from '@/utils/saveTags';

interface SavedByModalProps {
  isOpen: boolean;
  onClose: () => void;
  placeId?: string | null;
  googlePlaceId?: string | null;
}

interface SaverUser {
  id: string;
  username: string | null;
  avatar_url: string | null;
  isFollowing: boolean;
  save_tag: SaveTag;
}

const SavedByModal = ({ isOpen, onClose, placeId, googlePlaceId }: SavedByModalProps) => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [savers, setSavers] = useState<SaverUser[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const fetchSavers = async () => {
      if (!isOpen) return;
      if (!placeId && !googlePlaceId) {
        setSavers([]);
        return;
      }
      setLoading(true);
      try {
        // 1) Collect all user_ids who saved this location (internal + google) with their save_tag
        const userSaveTags = new Map<string, SaveTag>();

        if (placeId) {
          const { data: internal, error: internalError } = await supabase
            .from('user_saved_locations')
            .select('user_id, save_tag')
            .eq('location_id', placeId);
          
          if (internalError) {
            console.error('Error fetching from user_saved_locations:', internalError);
          }
          internal?.forEach((r: any) => {
            if (r.user_id) {
              userSaveTags.set(r.user_id, (r.save_tag as SaveTag) || 'general');
            }
          });
        }

        if (googlePlaceId) {
          const { data: google, error: googleError } = await supabase
            .from('saved_places')
            .select('user_id, save_tag')
            .eq('place_id', googlePlaceId);
          
          if (googleError) {
            console.error('Error fetching from saved_places:', googleError);
          }
          google?.forEach((r: any) => {
            if (r.user_id && !userSaveTags.has(r.user_id)) {
              userSaveTags.set(r.user_id, (r.save_tag as SaveTag) || 'general');
            }
          });
        }

        // Don't filter out current user - include everyone
        const ids = Array.from(userSaveTags.keys()).filter((id) => id);
        if (ids.length === 0) {
          setSavers([]);
          setLoading(false);
          return;
        }

        // 2) Fetch profiles for all users
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', ids);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }

        // 3) Determine following state
        let followingSet = new Set<string>();
        if (currentUser && ids.length > 0) {
          const { data: following } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', currentUser.id)
            .in('following_id', ids);
          followingSet = new Set((following || []).map((f: any) => f.following_id));
        }

        const list: SaverUser[] = (profiles || []).map((p: any) => ({
          id: p.id,
          username: p.username,
          avatar_url: p.avatar_url,
          isFollowing: followingSet.has(p.id),
          save_tag: userSaveTags.get(p.id) || 'general',
        }));

        // Sort: current user first, then following, then others
        list.sort((a, b) => {
          const aIsCurrentUser = a.id === currentUser?.id;
          const bIsCurrentUser = b.id === currentUser?.id;
          
          if (aIsCurrentUser !== bIsCurrentUser) return aIsCurrentUser ? -1 : 1;
          if (a.isFollowing !== b.isFollowing) return a.isFollowing ? -1 : 1;
          return (a.username || '').localeCompare(b.username || '');
        });

        setSavers(list);
      } catch (e) {
        console.error('Error fetching savers:', e);
        setSavers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSavers();
  }, [isOpen, placeId, googlePlaceId, currentUser?.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return savers;
    return savers.filter((u) => (u.username || '').toLowerCase().includes(q));
  }, [query, savers]);

  const toggleFollow = async (targetId: string, isFollowing: boolean) => {
    if (!currentUser) return;
    try {
      if (isFollowing) {
        // Optional: support unfollow
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', targetId);
      } else {
        await supabase
          .from('follows')
          .insert({ follower_id: currentUser.id, following_id: targetId });
      }
      setSavers((prev) =>
        prev.map((u) => (u.id === targetId ? { ...u, isFollowing: !isFollowing } : u))
      );
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-end">
      <div className="bg-background w-full h-[80vh] rounded-t-xl shadow-xl">
        <div className="flex items-center justify-between p-4">
          <h2 className="text-lg font-semibold text-foreground">{t('savedBy', { ns: 'common' })}</h2>
          <button onClick={onClose} aria-label="Close">
            <X className="w-6 h-6 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPeople', { ns: 'common' }) as string}
              className="pl-9 rounded-xl"
            />
          </div>
        </div>

        <ScrollArea className="h-[calc(80vh-112px)] scrollbar-hide">
          <div className="p-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">
                {t('noResults', { ns: 'common', defaultValue: 'No results' })}
              </div>
            ) : (
              filtered.map((u) => {
                const isCurrentUser = u.id === currentUser?.id;
                const saveTagOption = SAVE_TAG_OPTIONS.find(opt => opt.value === u.save_tag);
                return (
                  <div key={u.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Save category indicator */}
                      <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                        {u.save_tag === 'general' ? (
                          <Bookmark className="w-5 h-5 text-primary fill-primary" />
                        ) : (
                          <span className="text-lg leading-none">{saveTagOption?.emoji || '📍'}</span>
                        )}
                      </div>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={u.avatar_url || undefined} />
                        <AvatarFallback>{(u.username || 'U')[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">
                          {isCurrentUser ? t('you', { ns: 'common', defaultValue: 'You' }) : (u.username || 'User')}
                        </p>
                        {!isCurrentUser && (
                          <p className="text-sm text-muted-foreground">@{u.username}</p>
                        )}
                      </div>
                    </div>
                    {!isCurrentUser && (
                      <Button
                        size="sm"
                        variant={u.isFollowing ? 'outline' : 'default'}
                        onClick={() => toggleFollow(u.id, u.isFollowing)}
                        className="flex items-center gap-2"
                      >
                        {u.isFollowing ? (
                          <>
                            <Check className="w-4 h-4" />
                            {t('following', { ns: 'common', defaultValue: 'Following' })}
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4" />
                            {t('follow', { ns: 'common', defaultValue: 'Follow' })}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default SavedByModal;
