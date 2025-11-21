import { X, Search, UserPlus, Check, Bookmark } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';

interface FolderSavedByModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderId: string;
}

interface SaverUser {
  id: string;
  username: string | null;
  avatar_url: string | null;
  isFollowing: boolean;
}

const FolderSavedByModal = ({ isOpen, onClose, folderId }: FolderSavedByModalProps) => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [savers, setSavers] = useState<SaverUser[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const fetchSavers = async () => {
      if (!isOpen || !folderId) return;
      
      setLoading(true);
      try {
        // Fetch all users who saved this folder
        const { data: folderSaves, error: savesError } = await supabase
          .from('folder_saves')
          .select('user_id')
          .eq('folder_id', folderId);

        if (savesError) throw savesError;

        const userIds = folderSaves?.map((s: any) => s.user_id).filter(Boolean) || [];
        
        if (userIds.length === 0) {
          setSavers([]);
          setLoading(false);
          return;
        }

        // Fetch profiles for all users
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);

        if (profilesError) throw profilesError;

        // Determine following state
        let followingSet = new Set<string>();
        if (currentUser) {
          const { data: following } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', currentUser.id)
            .in('following_id', userIds);
          followingSet = new Set((following || []).map((f: any) => f.following_id));
        }

        const list: SaverUser[] = (profiles || []).map((p: any) => ({
          id: p.id,
          username: p.username,
          avatar_url: p.avatar_url,
          isFollowing: followingSet.has(p.id),
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
  }, [isOpen, folderId, currentUser?.id]);

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

  const handleUserClick = (userId: string) => {
    if (userId !== currentUser?.id) {
      navigate(`/profile/${userId}`);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10001] bg-black/50 flex items-end">
      <div className="bg-background w-full h-[80vh] rounded-t-xl shadow-xl">
        <div className="flex items-center justify-between p-4">
          <h2 className="text-lg font-semibold text-foreground">
            {t('common:savedBy', { defaultValue: 'Salvato da' })}
          </h2>
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
              placeholder={t('common:searchPeople', { defaultValue: 'Cerca persone' }) as string}
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
                {t('common:noResults', { defaultValue: 'Nessun risultato' })}
              </div>
            ) : (
              filtered.map((u) => {
                const isCurrentUser = u.id === currentUser?.id;
                return (
                  <div key={u.id} className="flex items-center justify-between">
                    <button
                      onClick={() => handleUserClick(u.id)}
                      className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={u.avatar_url || undefined} />
                        <AvatarFallback>{(u.username || 'U')[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="text-left">
                        <p className="font-medium text-foreground">
                          {isCurrentUser ? t('common:you', { defaultValue: 'Tu' }) : (u.username || 'User')}
                        </p>
                        {!isCurrentUser && (
                          <p className="text-sm text-muted-foreground">@{u.username}</p>
                        )}
                      </div>
                    </button>
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
                            {t('common:following', { defaultValue: 'Segui già' })}
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4" />
                            {t('common:follow', { defaultValue: 'Segui' })}
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

export default FolderSavedByModal;
