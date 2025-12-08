import { useState, useEffect } from 'react';
import { X, Search, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { messageService } from '@/services/messageService';
import { toast } from 'sonner';

interface ShareProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
  profileUsername: string;
}

const ShareProfileModal = ({ isOpen, onClose, profileId, profileUsername }: ShareProfileModalProps) => {
  const { user } = useAuth();
  const { t } = useTranslation('common');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  // Hide bottom navigation when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.setAttribute('data-share-profile-open', 'true');
    } else {
      document.body.removeAttribute('data-share-profile-open');
    }
    return () => {
      document.body.removeAttribute('data-share-profile-open');
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isOpen]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, bio')
        .ilike('username', `%${query}%`)
        .neq('id', user?.id || '')
        .limit(20);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSendProfile = async (recipientId: string, recipientUsername: string) => {
    if (!user) return;

    setSending(recipientId);
    try {
      // Fetch the profile data to share
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, bio, follower_count, following_count, posts_count')
        .eq('id', profileId)
        .single();

      if (error) throw error;

      await messageService.sendProfileShare(recipientId, profileData);
      
      toast.success(t('userProfile.profileShared', { username: recipientUsername }));
      onClose();
    } catch (error) {
      console.error('Error sharing profile:', error);
      toast.error(t('userProfile.shareError'));
    } finally {
      setSending(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="bg-background rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md h-[70vh] sm:h-[60vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header - no border */}
        <div className="p-4 flex items-center justify-between flex-shrink-0">
          <h3 className="font-bold text-lg">{t('userProfile.shareProfile')}</h3>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Search - no border */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={t('userProfile.searchPeople')}
              className="pl-10"
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <ScrollArea className="flex-1">
          {searching ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="p-2">
              {searchResults.map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-center gap-3 p-3 hover:bg-accent rounded-xl transition-colors"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={profile.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {profile.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">
                      {profile.username}
                    </p>
                    {profile.bio && (
                      <p className="text-sm text-muted-foreground truncate">
                        {profile.bio}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSendProfile(profile.id, profile.username)}
                    disabled={sending === profile.id}
                    className="shrink-0"
                  >
                    {sending === profile.id ? (
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          ) : searchQuery.trim() ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <p className="text-muted-foreground">{t('noResults')}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <p className="text-muted-foreground">
                {t('userProfile.searchToShare')}
              </p>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export default ShareProfileModal;