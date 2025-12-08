import { useState, useEffect } from 'react';
import { X, Search, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { messageService } from '@/services/messageService';
import { toast } from 'sonner';
import { useUIState } from '@/contexts/UIStateContext';
import { useFrequentContacts } from '@/hooks/useFrequentContacts';

interface ShareProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
  profileUsername: string;
}

const ShareProfileModal = ({ isOpen, onClose, profileId, profileUsername }: ShareProfileModalProps) => {
  const { user } = useAuth();
  const { t } = useTranslation('common');
  const { setIsShareProfileOpen } = useUIState();
  const [searchQuery, setSearchQuery] = useState('');
  const [allContacts, setAllContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const { frequentContacts, loading: frequentLoading } = useFrequentContacts();

  // Update UI state when modal opens/closes
  useEffect(() => {
    setIsShareProfileOpen(isOpen);
    return () => setIsShareProfileOpen(false);
  }, [isOpen, setIsShareProfileOpen]);

  // Load all contacts (followed users)
  useEffect(() => {
    if (isOpen && user) {
      loadAllContacts();
    }
    if (!isOpen) {
      setSearchQuery('');
      setAllContacts([]);
    }
  }, [isOpen, user]);

  const loadAllContacts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = follows?.map(f => f.following_id) || [];

      if (followingIds.length === 0) {
        setAllContacts([]);
        setLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', followingIds)
        .order('username');

      setAllContacts(profiles || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendProfile = async (recipientId: string, recipientUsername: string) => {
    if (!user) return;

    // Prevent sharing profile with the same user
    if (recipientId === profileId) {
      toast.error(t('userProfile.cannotShareWithSameUser'));
      return;
    }

    setSending(recipientId);
    try {
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

  // Filter contacts based on search and exclude the profile being shared
  const filteredFrequent = frequentContacts.filter(c =>
    c.username?.toLowerCase().includes(searchQuery.toLowerCase()) && c.id !== profileId
  );
  
  const filteredAll = allContacts.filter(c =>
    c.username?.toLowerCase().includes(searchQuery.toLowerCase()) && c.id !== profileId
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="bg-background rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md h-[70vh] sm:h-[60vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 flex items-center justify-between flex-shrink-0">
          <div className="w-8" />
          <h3 className="font-bold text-lg text-center">{t('userProfile.shareProfile')}</h3>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Search */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('shareLocation.searchPlaceholder')}
              className="pl-10"
              autoFocus
            />
          </div>
        </div>

        <ScrollArea className="flex-1 px-4">
          {loading || frequentLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              {/* Frequent Contacts */}
              {filteredFrequent.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <MessageCircle className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('shareLocation.frequentContacts')}
                    </span>
                  </div>
                  <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
                    <div className="flex gap-4 pr-8">
                      {filteredFrequent.map((contact) => (
                        <button
                          key={contact.id}
                          onClick={() => handleSendProfile(contact.id, contact.username)}
                          disabled={sending === contact.id}
                          className="flex flex-col items-center gap-2 min-w-[72px] flex-shrink-0"
                        >
                          <div className="relative">
                            <Avatar className="h-14 w-14">
                              <AvatarImage src={contact.avatar_url} />
                              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                                {contact.username?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {sending === contact.id && (
                              <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-full">
                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-center truncate w-full">
                            {contact.username}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* All Contacts */}
              {filteredAll.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('shareLocation.allContacts')}
                    </span>
                  </div>
                  <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
                    <div className="flex gap-4 pr-8">
                      {filteredAll.map((contact) => (
                        <button
                          key={contact.id}
                          onClick={() => handleSendProfile(contact.id, contact.username)}
                          disabled={sending === contact.id}
                          className="flex flex-col items-center gap-2 min-w-[72px] flex-shrink-0"
                        >
                          <div className="relative">
                            <Avatar className="h-14 w-14">
                              <AvatarImage src={contact.avatar_url} />
                              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                                {contact.username?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {sending === contact.id && (
                              <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-full">
                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-center truncate w-full">
                            {contact.username}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {filteredFrequent.length === 0 && filteredAll.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <p className="text-muted-foreground">
                    {searchQuery.trim() ? t('noResults') : t('userProfile.searchToShare')}
                  </p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export default ShareProfileModal;