import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShare: (recipientIds: string[]) => Promise<boolean>;
}

export const ShareModal = ({ isOpen, onClose, onShare }: ShareModalProps) => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

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

  const filteredUsers = users.filter((u) =>
    u.username?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share post</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people..."
            className="w-full"
          />

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {filteredUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  {query ? 'No users found' : 'Follow people to share with them'}
                </p>
              ) : (
                filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => toggle(u.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                      selected.has(u.id)
                        ? 'bg-primary/10 border-2 border-primary'
                        : 'bg-muted/40 hover:bg-muted border-2 border-transparent'
                    }`}
                  >
                    <Avatar className="w-10 h-10 shrink-0">
                      <AvatarImage src={u.avatar_url || ''} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {u.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-semibold truncate">{u.username}</p>
                    </div>
                    {selected.has(u.id) && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={selected.size === 0 || sending}
              className="flex-1 gap-2"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send {selected.size > 0 && `(${selected.size})`}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
