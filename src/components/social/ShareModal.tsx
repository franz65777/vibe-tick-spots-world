import React, { useEffect, useState } from 'react';
import { Drawer } from 'vaul';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, X, Search, Link as LinkIcon, Plus, Share2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShare: (recipientIds: string[]) => Promise<boolean>;
  postId?: string;
}

export const ShareModal = ({ isOpen, onClose, onShare, postId }: ShareModalProps) => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showUserList, setShowUserList] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelected(new Set());
      setQuery('');
      setShowUserList(true); // Start with user list shown
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
    if (selected.size === 0) return;
    
    setSending(true);
    try {
      const success = await onShare(Array.from(selected));
      if (success) {
        onClose();
      }
    } finally {
      setSending(false);
    }
  };

  const handleCopyLink = async () => {
    const postUrl = `${window.location.origin}/post/${postId}`;
    try {
      await navigator.clipboard.writeText(postUrl);
      toast({
        title: "Link copiato",
        description: "Il link è stato copiato negli appunti",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile copiare il link",
        variant: "destructive",
      });
    }
  };

  const handleWhatsAppShare = () => {
    const postUrl = `${window.location.origin}/post/${postId}`;
    const text = encodeURIComponent(`Guarda questo post su Spott: ${postUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    onClose();
  };

  const filteredUsers = users.filter((u) =>
    u.username?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/50 z-[70]" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-[71] bg-background rounded-t-3xl flex flex-col max-h-[90vh] outline-none">
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1.5 bg-muted-foreground/30 rounded-full" />
          </div>

            {showUserList ? (
            <>
              {/* User selection view */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 rounded-full"
                >
                  <X className="h-5 w-5" />
                </Button>
                <h3 className="font-semibold text-base">Condividi su</h3>
                <div className="w-8" />
              </div>

              <div className="px-4 py-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Cerca"
                    className="pl-10 rounded-full bg-muted border-0"
                  />
                </div>
              </div>

              <ScrollArea className="flex-1 px-4">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <p className="text-muted-foreground text-sm mb-6">
                      {query ? 'Nessun utente trovato' : 'Segui persone per condividere con loro'}
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
                        <span className="text-xs font-medium">Copia link</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4 py-4">
                    {filteredUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => toggle(u.id)}
                        className="flex flex-col items-center gap-2"
                      >
                        <div className="relative">
                          <Avatar className="w-16 h-16 ring-2 ring-background">
                            <AvatarImage src={u.avatar_url || ''} />
                            <AvatarFallback className="bg-primary/10 text-primary text-lg">
                              {u.username?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          {selected.has(u.id) && (
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary border-2 border-background flex items-center justify-center">
                              <svg className="w-3.5 h-3.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <p className="text-xs font-medium truncate w-full text-center">{u.username}</p>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {selected.size > 0 && (
                <div className="p-4 border-t shrink-0">
                  <Button
                    onClick={handleSend}
                    disabled={sending}
                    className="w-full gap-2 rounded-full h-12 text-base"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Invio...
                      </>
                    ) : (
                      <>
                        Invia {selected.size > 0 && `(${selected.size})`}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Quick actions view */}
              <div className="px-4 py-6">
                <div className="grid grid-cols-4 gap-6">
                  {/* WhatsApp */}
                  <button
                    onClick={handleWhatsAppShare}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className="w-14 h-14 rounded-full bg-[#25D366] flex items-center justify-center shadow-lg group-active:scale-95 transition-transform">
                      <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                    </div>
                    <span className="text-xs font-medium">WhatsApp</span>
                  </button>

                  {/* Copy Link */}
                  <button
                    onClick={handleCopyLink}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center shadow-lg group-active:scale-95 transition-transform">
                      <LinkIcon className="w-6 h-6 text-foreground" />
                    </div>
                    <span className="text-xs font-medium">Copia link</span>
                  </button>

                  {/* Add to Story */}
                  <button
                    onClick={onClose}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg group-active:scale-95 transition-transform">
                      <Plus className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xs font-medium">Aggiungi alla storia</span>
                  </button>

                  {/* Share to... */}
                  <button
                    onClick={() => setShowUserList(true)}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center shadow-lg group-active:scale-95 transition-transform">
                      <Share2 className="w-6 h-6 text-foreground" />
                    </div>
                    <span className="text-xs font-medium text-center leading-tight">Condividi su...</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};
