import { X, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { type SaveTag } from '@/utils/saveTags';
import { isValidUUID } from '@/utils/uuidValidation';
import saveTagBeen from '@/assets/save-tag-been.png';
import saveTagToTry from '@/assets/save-tag-to-try.png';
import saveTagFavourite from '@/assets/save-tag-favourite.png';

// Map tag values to imported icons
const TAG_ICONS: Record<string, string> = {
  been: saveTagBeen,
  to_try: saveTagToTry,
  favourite: saveTagFavourite,
};

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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [savers, setSavers] = useState<SaverUser[]>([]);
  const [query, setQuery] = useState('');

  const handleUserClick = (userId: string) => {
    if (userId !== currentUser?.id) {
      // Pass returnTo state so profile page can navigate back to reopen SavedByModal
      navigate(`/profile/${userId}`, {
        state: {
          returnTo: 'savedBy',
          savedByPlaceId: placeId,
          savedByGooglePlaceId: googlePlaceId,
        }
      });
      onClose();
    }
  };

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

        // Only query user_saved_locations if placeId is a valid UUID
        if (placeId && isValidUUID(placeId)) {
          const { data: internal, error: internalError } = await supabase
            .from('user_saved_locations')
            .select('user_id, save_tag')
            .eq('location_id', placeId);
          
          if (internalError) {
            console.error('Error fetching from user_saved_locations:', internalError);
          }
          internal?.forEach((r: any) => {
            if (r.user_id) {
              userSaveTags.set(r.user_id, (r.save_tag as SaveTag) || 'been');
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
              userSaveTags.set(r.user_id, (r.save_tag as SaveTag) || 'been');
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
          save_tag: userSaveTags.get(p.id) || 'been',
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
    <div 
      className="fixed inset-0 z-[9999] bg-black/50 flex items-end" 
      onClick={onClose}
      style={{ paddingBottom: 0 }}
    >
      {/* Hide bottom navigation when modal is open */}
      <style>{`
        [class*="bottom-navigation"],
        [class*="NewBottomNavigation"],
        [class*="BusinessBottomNavigation"],
        nav[class*="fixed bottom"],
        div[class*="fixed bottom-0"] {
          display: none !important;
        }
      `}</style>

      <div 
        className="bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl w-full rounded-t-3xl shadow-2xl flex flex-col border-t border-border/20"
        style={{ height: '80vh', marginBottom: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle indicator */}
        <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto mt-3 mb-1" />

        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
          <h2 className="text-lg font-semibold text-foreground">{t('savedBy', { ns: 'common' })}</h2>
          <button 
            onClick={onClose} 
            aria-label="Close"
            className="p-2 rounded-full hover:bg-muted/50 transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="px-4 pb-3 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPeople', { ns: 'common' }) as string}
              className="pl-9 rounded-2xl bg-white/50 dark:bg-slate-800/50 border-border/20"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 scrollbar-hide">
          <div className="px-4 pb-8 space-y-2">
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
                return (
                  <div 
                    key={u.id} 
                    className="flex items-center justify-between p-3 bg-white/60 dark:bg-slate-700/40 backdrop-blur-lg rounded-2xl border border-border/10"
                  >
                    <button
                      onClick={() => handleUserClick(u.id)}
                      className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity text-left"
                      disabled={isCurrentUser}
                    >
                      {/* Save tag indicator */}
                      <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                        <img src={TAG_ICONS[u.save_tag] || saveTagBeen} alt="" className="w-5 h-5 object-contain" />
                      </div>

                      {/* Avatar with ring styling */}
                      <Avatar className="h-12 w-12 ring-2 ring-primary/20 ring-offset-2 ring-offset-background flex-shrink-0">
                        <AvatarImage src={u.avatar_url || undefined} />
                        <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
                          {(u.username || 'U')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* Username info */}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground truncate">
                          {isCurrentUser ? t('you', { ns: 'common', defaultValue: 'You' }) : (u.username || 'User')}
                        </p>
                        {!isCurrentUser && (
                          <p className="text-sm text-muted-foreground truncate">@{u.username}</p>
                        )}
                      </div>
                    </button>

                    {/* Follow button */}
                    {!isCurrentUser && (
                      <Button
                        size="sm"
                        variant={u.isFollowing ? 'outline' : 'default'}
                        onClick={() => toggleFollow(u.id, u.isFollowing)}
                        className="rounded-full px-4 ml-2 flex-shrink-0"
                      >
                        {u.isFollowing
                          ? t('following', { ns: 'common', defaultValue: 'Following' })
                          : t('follow', { ns: 'common', defaultValue: 'Follow' })
                        }
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
