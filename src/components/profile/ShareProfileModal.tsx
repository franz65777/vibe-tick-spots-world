import { useState, useEffect } from 'react';
import { X, Search, MessageCircle, Send, Check } from 'lucide-react';
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
  const { t } = useTranslation('messages');
  const { setIsShareProfileOpen } = useUIState();
  const [searchQuery, setSearchQuery] = useState('');
  const [allContacts, setAllContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
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
      setSelectedUsers(new Set());
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

  const toggleUserSelection = (userId: string) => {
    // Prevent selecting the profile being shared
    if (userId === profileId) {
      toast.error(t('userProfile.cannotShareWithSameUser', { ns: 'common' }));
      return;
    }
    
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleSendToSelected = async () => {
    if (!user || selectedUsers.size === 0) return;

    setSending(true);
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, bio, follower_count, following_count, posts_count')
        .eq('id', profileId)
        .single();

      if (error) throw error;

      // Send to all selected users
      await Promise.all(
        Array.from(selectedUsers).map(recipientId =>
          messageService.sendProfileShare(recipientId, profileData)
        )
      );
      
      toast.success(t('userProfile.profileShared', { username: profileUsername, ns: 'common' }));
      onClose();
    } catch (error) {
      console.error('Error sharing profile:', error);
      toast.error(t('userProfile.shareError', { ns: 'common' }));
    } finally {
      setSending(false);
    }
  };

  // Filter contacts based on search and exclude the profile being shared
  const filteredFrequent = frequentContacts.filter(c =>
    c.username?.toLowerCase().includes(searchQuery.toLowerCase()) && c.id !== profileId
  );
  
  const filteredAll = allContacts.filter(c =>
    c.username?.toLowerCase().includes(searchQuery.toLowerCase()) && c.id !== profileId
  );

  const isSearching = searchQuery.trim().length > 0;

  if (!isOpen) return null;

  const renderContactButton = (contact: any) => (
    <button
      key={contact.id}
      onClick={() => toggleUserSelection(contact.id)}
      className="flex flex-col items-center gap-2 min-w-[72px] flex-shrink-0 pt-1"
    >
      <div className="relative">
        <Avatar className={`h-14 w-14 transition-all ${selectedUsers.has(contact.id) ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}>
          <AvatarImage src={contact.avatar_url} />
          <AvatarFallback className="bg-primary/10 text-primary text-lg">
            {contact.username?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {selectedUsers.has(contact.id) && (
          <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-0.5">
            <Check className="w-3 h-3 text-primary-foreground" />
          </div>
        )}
      </div>
      <span className="text-xs text-center truncate w-full">
        {contact.username}
      </span>
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="bg-background rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md h-[70vh] sm:h-[60vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 flex items-center justify-between flex-shrink-0">
          <div className="w-8" />
          <h3 className="font-bold text-lg text-center">{t('userProfile.shareProfile', { ns: 'common' })}</h3>
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
              placeholder={t('searchPlaceholder')}
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
              {/* When searching, show only All Contacts */}
              {isSearching ? (
                filteredAll.length > 0 ? (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-semibold text-muted-foreground tracking-wide">
                        {t('allContacts')}
                      </span>
                    </div>
                    <div className="overflow-x-auto scrollbar-hide">
                      <div className="flex gap-4" style={{ paddingRight: '2rem' }}>
                        {filteredAll.map(renderContactButton)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                    <p className="text-muted-foreground">
                      {t('noResults', { ns: 'common' })}
                    </p>
                  </div>
                )
              ) : (
                <>
                  {/* Frequent Contacts */}
                  {filteredFrequent.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <MessageCircle className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs font-semibold text-muted-foreground tracking-wide">
                          {t('frequentContacts')}
                        </span>
                      </div>
                      <div className="overflow-x-auto scrollbar-hide">
                        <div className="flex gap-4" style={{ paddingRight: '2rem' }}>
                          {filteredFrequent.map(renderContactButton)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* All Contacts */}
                  {filteredAll.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-semibold text-muted-foreground tracking-wide">
                          {t('allContacts')}
                        </span>
                      </div>
                      <div className="overflow-x-auto scrollbar-hide">
                        <div className="flex gap-4" style={{ paddingRight: '2rem' }}>
                          {filteredAll.map(renderContactButton)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {filteredFrequent.length === 0 && filteredAll.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                      <p className="text-muted-foreground">
                        {t('userProfile.searchToShare', { ns: 'common' })}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Share Button - only visible when users are selected */}
        {selectedUsers.size > 0 && (
          <div className="p-4 flex-shrink-0">
            <Button
              onClick={handleSendToSelected}
              disabled={sending}
              className="w-full gap-2 rounded-xl"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {t('share', { ns: 'common' })}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareProfileModal;