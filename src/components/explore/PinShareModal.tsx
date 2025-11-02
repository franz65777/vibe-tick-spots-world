import React, { useState, useEffect } from 'react';
import { X, Share2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { pinSharingService } from '@/services/pinSharingService';
import { toast } from 'sonner';

interface PinShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  place: any;
}

const PinShareModal = ({ isOpen, onClose, place }: PinShareModalProps) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      loadFollowingUsers();
    } else {
      setSelectedUsers(new Set());
      setSearchQuery('');
    }
  }, [isOpen, user]);

  const loadFollowingUsers = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = follows?.map(f => f.following_id) || [];

      if (followingIds.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', followingIds)
        .order('username');

      setUsers(profiles || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSend = async () => {
    if (selectedUsers.size === 0) {
      toast.error('Please select at least one person');
      return;
    }

    setSending(true);
    try {
      const pinData = {
        place_id: place.google_place_id || place.id,
        name: place.name,
        category: place.category || 'place',
        coordinates: place.coordinates || { lat: 0, lng: 0 },
        address: place.address,
        description: place.description,
        image: place.image_url,
        google_place_id: place.google_place_id
      };

      const promises = Array.from(selectedUsers).map(userId =>
        pinSharingService.sharePin(userId, pinData)
      );

      await Promise.all(promises);
      
      toast.success(`Shared with ${selectedUsers.size} ${selectedUsers.size === 1 ? 'person' : 'people'}`);
      onClose();
    } catch (error) {
      console.error('Error sharing pin:', error);
      toast.error('Failed to share pin');
    } finally {
      setSending(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share {place?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Search people..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {filteredUsers.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  {searchQuery ? 'No users found' : 'Follow people to share with them'}
                </p>
              ) : (
                filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => toggleUser(user.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                      selectedUsers.has(user.id)
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={user.avatar_url || ''} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-400 text-white">
                        {user.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-gray-900">{user.username}</p>
                    </div>
                    {selectedUsers.has(user.id) && (
                      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
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
              disabled={selectedUsers.size === 0 || sending}
              className="flex-1 gap-2"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  Send {selectedUsers.size > 0 && `(${selectedUsers.size})`}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PinShareModal;
