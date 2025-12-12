import React, { useEffect, useState } from 'react';
import { Drawer } from 'vaul';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, X, Search, Link as LinkIcon, MessageCircle, Send, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFrequentContacts } from '@/hooks/useFrequentContacts';
import { messageService } from '@/services/messageService';
import { useTranslation } from 'react-i18next';

interface LocationShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  place: any;
  zIndex?: number; // Optional z-index override for nested modals
}

export const LocationShareModal = ({ isOpen, onClose, place, zIndex }: LocationShareModalProps) => {
  const { user } = useAuth();
  const { t } = useTranslation('messages');
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const { frequentContacts } = useFrequentContacts();

  useEffect(() => {
    if (isOpen) {
      setSelected(new Set());
      setQuery('');
      loadFollowing();
    }
  }, [isOpen]);

  const loadFollowing = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const ids = follows?.map((f) => f.following_id) || [];
      if (ids.length === 0) {
        setUsers([]);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', ids)
        .order('username');

      setUsers(profiles || []);
    } catch (e) {
      console.error('Error loading following:', e);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  };

  const handleSend = async () => {
    if (selected.size === 0 || !place) {
      console.log('Cannot send: no users selected or no place', { selectedSize: selected.size, place });
      toast.error(t('selectAtLeastOneUser', { ns: 'common', defaultValue: 'Seleziona almeno un utente' }));
      return;
    }

    setSending(true);
    try {
      let promises;

      // Check if sharing a folder or trip
      if (place.type === 'folder') {
        console.log('Sharing folder:', place.id);
        
        // Fetch full folder data with cover image
        const { data: folderData, error: folderError } = await supabase
          .from('saved_folders')
          .select('*, profiles!saved_folders_user_id_fkey(id, username, avatar_url)')
          .eq('id', place.id)
          .single();

        if (folderError) {
          console.error('Error fetching folder data:', folderError);
          throw folderError;
        }

        console.log('Fetched folder data:', folderData);

        // Count actual locations in the folder
        const { count: locationCount } = await supabase
          .from('folder_locations')
          .select('*', { count: 'exact', head: true })
          .eq('folder_id', place.id);

        const folderShareData = {
          folder_id: folderData?.id || place.id,
          creator_id: folderData?.user_id,
          name: folderData?.name || place.name,
          description: folderData?.description,
          cover_image_url: folderData?.cover_image_url,
          location_count: locationCount || 0,
          creator: folderData?.profiles
        };

        console.log('Sending folder share data:', folderShareData);

        promises = Array.from(selected).map(userId =>
          messageService.sendFolderShare(userId, folderShareData)
        );
      } else if (place.type === 'trip') {
        // Fetch full trip data
        const { data: tripData } = await supabase
          .from('trips')
          .select('*, profiles(username, avatar_url)')
          .eq('id', place.id)
          .single();

        const tripShareData = {
          id: place.id,
          name: tripData?.name || place.name,
          description: tripData?.description,
          city: tripData?.city,
          country: tripData?.country,
          cover_image: tripData?.cover_image_url,
          creator: tripData?.profiles
        };

        promises = Array.from(selected).map(userId =>
          messageService.sendTripShare(userId, tripShareData)
        );
      } else {
        // Regular place share
        const placeData = {
          id: place.id || place.google_place_id,
          name: place.name,
          category: place.category,
          address: place.address,
          city: place.city,
          image: place.image,
          coordinates: place.coordinates
        };

        promises = Array.from(selected).map(userId =>
          messageService.sendPlaceShare(userId, placeData)
        );
      }

      await Promise.all(promises);
      
      // Show appropriate success message based on share type
      if (place.type === 'folder') {
        toast.success(t('listShared', { ns: 'common' }));
      } else if (place.type === 'trip') {
        toast.success(t('tripShared', { ns: 'common' }));
      } else {
        toast.success(t('locationShared', { ns: 'common' }));
      }
      onClose();
    } catch (error) {
      console.error('Error sending share:', error);
      toast.error(t('shareError', { ns: 'common', defaultValue: 'Errore durante la condivisione' }));
    } finally {
      setSending(false);
    }
  };

  const handleCopyLink = async () => {
    let url = '';
    if (place.type === 'folder') {
      url = `${window.location.origin}/folder/${place.id}`;
    } else if (place.type === 'trip') {
      url = `${window.location.origin}/trip/${place.id}`;
    } else {
      url = `${window.location.origin}/place/${place.id || place.google_place_id}`;
    }
    
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('linkCopied', { ns: 'common', defaultValue: 'Link copiato negli appunti' }));
      onClose();
    } catch (error) {
      toast.error(t('copyError', { ns: 'common', defaultValue: 'Impossibile copiare il link' }));
    }
  };

  const handleWhatsAppShare = () => {
    let url = '';
    let itemType = 'questo posto';
    
    if (place.type === 'folder') {
      url = `${window.location.origin}/folder/${place.id}`;
      itemType = 'questa lista';
    } else if (place.type === 'trip') {
      url = `${window.location.origin}/trip/${place.id}`;
      itemType = 'questo viaggio';
    } else {
      url = `${window.location.origin}/place/${place.id || place.google_place_id}`;
    }
    
    const text = encodeURIComponent(`Guarda ${itemType} su Spott: ${place.name} - ${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    onClose();
  };

  const filteredUsers = users.filter((u) =>
    u.username?.toLowerCase().includes(query.toLowerCase())
  );

  const isSearching = query.trim().length > 0;
  const baseZIndex = zIndex || 20000;
 
  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/50" style={{ zIndex: baseZIndex }} />
        <Drawer.Content className="fixed inset-x-0 bottom-0 bg-background rounded-t-3xl flex flex-col max-h-[85vh] outline-none w-full" style={{ zIndex: baseZIndex + 1 }}>
          <style>{`
            [data-vaul-drawer-wrapper] { z-index: ${baseZIndex} !important; }
            body:has([data-vaul-drawer][data-state="open"]) .bottom-navigation { display: none !important; }
          `}</style>
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1.5 bg-muted-foreground/30 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
            <h3 className="font-semibold text-base">{t('share', { ns: 'common' })} {place?.name}</h3>
            <div className="w-8" />
          </div>

          {/* Search */}
          <div className="px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="pl-10 rounded-full bg-muted border-0"
              />
            </div>
          </div>

          <ScrollArea className="flex-1 px-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* When searching, show only All Contacts */}
                {isSearching ? (
                  filteredUsers.length > 0 ? (
                    <div className="py-4">
                      <h4 className="text-xs font-semibold text-muted-foreground tracking-wide mb-3 px-1">
                        {t('allContacts')}
                      </h4>
                      <div className="overflow-x-auto scrollbar-hide">
                        <div className="flex gap-4 pt-1" style={{ paddingRight: '2rem' }}>
                          {filteredUsers.map((u) => (
                            <button
                              key={u.id}
                              onClick={() => toggle(u.id)}
                              className="flex flex-col items-center gap-2 min-w-[72px] flex-shrink-0"
                            >
                              <div className="relative">
                                <Avatar className={`w-14 h-14 transition-all ${selected.has(u.id) ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}>
                                  <AvatarImage src={u.avatar_url || ''} />
                                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                                    {u.username?.[0]?.toUpperCase() || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                {selected.has(u.id) && (
                                  <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-0.5">
                                    <Check className="w-3 h-3 text-primary-foreground" />
                                  </div>
                                )}
                              </div>
                              <p className="text-xs font-medium truncate w-full text-center">{u.username}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16 px-4">
                      <p className="text-muted-foreground text-sm">
                        {t('noResults', { ns: 'common' })}
                      </p>
                    </div>
                  )
                ) : (
                  <>
                    {/* Frequent Contacts Section */}
                    {frequentContacts.length > 0 && (
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3 px-1">
                          <MessageCircle className="w-4 h-4 text-muted-foreground" />
                          <h4 className="text-xs font-semibold text-muted-foreground tracking-wide">
                            {t('frequentContacts')}
                          </h4>
                        </div>
                        <div className="overflow-x-auto scrollbar-hide">
                          <div className="flex gap-4 pt-1" style={{ paddingRight: '2rem' }}>
                            {frequentContacts.slice(0, 8).map((contact) => (
                              <button
                                key={contact.id}
                                onClick={() => toggle(contact.id)}
                                className="flex flex-col items-center gap-2 min-w-[72px] flex-shrink-0"
                              >
                                <div className="relative">
                                  <Avatar className={`w-14 h-14 transition-all ${selected.has(contact.id) ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}>
                                    <AvatarImage src={contact.avatar_url || ''} />
                                    <AvatarFallback className="bg-primary/10 text-primary text-lg">
                                      {contact.username?.[0]?.toUpperCase() || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                  {selected.has(contact.id) && (
                                    <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-0.5">
                                      <Check className="w-3 h-3 text-primary-foreground" />
                                    </div>
                                  )}
                                </div>
                                <p className="text-xs font-medium truncate w-full text-center">{contact.username}</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* All Users */}
                    {filteredUsers.length > 0 ? (
                      <div className="py-4">
                        {frequentContacts.length > 0 && (
                          <h4 className="text-xs font-semibold text-muted-foreground tracking-wide mb-3 px-1">
                            {t('allContacts')}
                          </h4>
                        )}
                        <div className="overflow-x-auto scrollbar-hide">
                          <div className="flex gap-4 pt-1" style={{ paddingRight: '2rem' }}>
                            {filteredUsers.map((u) => (
                              <button
                                key={u.id}
                                onClick={() => toggle(u.id)}
                                className="flex flex-col items-center gap-2 min-w-[72px] flex-shrink-0"
                              >
                                <div className="relative">
                                  <Avatar className={`w-14 h-14 transition-all ${selected.has(u.id) ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}>
                                    <AvatarImage src={u.avatar_url || ''} />
                                    <AvatarFallback className="bg-primary/10 text-primary text-lg">
                                      {u.username?.[0]?.toUpperCase() || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                  {selected.has(u.id) && (
                                    <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-0.5">
                                      <Check className="w-3 h-3 text-primary-foreground" />
                                    </div>
                                  )}
                                </div>
                                <p className="text-xs font-medium truncate w-full text-center">{u.username}</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-16 px-4">
                        <p className="text-muted-foreground text-sm mb-6">
                          {t('noContacts', { ns: 'common', defaultValue: 'Segui persone per condividere con loro' })}
                        </p>
                        {/* Quick share actions when no users */}
                        <div className="flex justify-center gap-8 mt-8">
                          <button
                            onClick={handleWhatsAppShare}
                            className="flex flex-col items-center gap-2"
                          >
                            <div className="w-16 h-16 rounded-full bg-[#25D366] flex items-center justify-center shadow-lg">
                              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                              </svg>
                            </div>
                            <span className="text-xs font-medium">WhatsApp</span>
                          </button>
                          <button
                            onClick={handleCopyLink}
                            className="flex flex-col items-center gap-2"
                          >
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center shadow-lg">
                              <LinkIcon className="w-7 h-7 text-foreground" />
                            </div>
                            <span className="text-xs font-medium">{t('copyLink', { ns: 'common', defaultValue: 'Copia link' })}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </ScrollArea>

          {/* Share Button - only visible when users are selected */}
          {selected.size > 0 && (
            <div className="p-4 shrink-0">
              <Button
                onClick={handleSend}
                disabled={sending}
                className="w-full gap-2 rounded-xl h-12 text-base"
              >
                {sending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                {t('share', { ns: 'common' })}
              </Button>
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};
