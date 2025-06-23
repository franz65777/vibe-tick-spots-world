
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Search, Send, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { messageService } from '@/services/messageService';
import { Place } from '@/types/place';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  place: Place;
}

interface User {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
}

const ShareModal = ({ isOpen, onClose, place }: ShareModalProps) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchQuery.trim()) {
      searchUsers();
    } else {
      loadUsers();
    }
  }, [searchQuery]);

  const loadUsers = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: followers, error } = await supabase
        .from('follows')
        .select(`
          following_id,
          profiles!follows_following_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('follower_id', user.id);

      if (error) throw error;

      const userList = followers?.map(f => ({
        id: f.profiles.id,
        username: f.profiles.username || 'Unknown',
        full_name: f.profiles.full_name || 'Unknown User',
        avatar_url: f.profiles.avatar_url || ''
      })) || [];

      setUsers(userList);
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!user || !searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const { data: searchResults, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .or(`username.ilike.%${searchQuery}%, full_name.ilike.%${searchQuery}%`)
        .neq('id', user.id)
        .limit(20);

      if (error) throw error;

      const userList = searchResults?.map(u => ({
        id: u.id,
        username: u.username || 'Unknown',
        full_name: u.full_name || 'Unknown User',
        avatar_url: u.avatar_url || ''
      })) || [];

      setUsers(userList);
    } catch (error) {
      console.error('Error searching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
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

  const handleSend = async () => {
    if (selectedUsers.size === 0 || !place) return;

    setSending(true);
    try {
      const placeData = {
        id: place.id,
        name: place.name,
        category: place.category,
        address: place.address,
        city: place.city,
        image: place.image,
        coordinates: place.coordinates
      };

      // Send to all selected users
      const promises = Array.from(selectedUsers).map(userId =>
        messageService.sendPlaceShare(userId, placeData)
      );

      await Promise.all(promises);
      
      // Reset and close
      setSelectedUsers(new Set());
      setSearchQuery('');
      onClose();
    } catch (error) {
      console.error('Error sending place share:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Share {place?.name}</DialogTitle>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Selected count */}
          {selectedUsers.size > 0 && (
            <div className="text-sm text-gray-600">
              {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
            </div>
          )}

          {/* Users list */}
          <div className="max-h-60 overflow-y-auto space-y-2">
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No users found</p>
              </div>
            ) : (
              users.map((u) => (
                <div
                  key={u.id}
                  onClick={() => toggleUserSelection(u.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedUsers.has(u.id)
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={u.avatar_url} />
                    <AvatarFallback className="bg-gray-100 text-gray-600">
                      {(u.full_name || u.username)[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {u.full_name || u.username}
                    </div>
                    <div className="text-sm text-gray-500 truncate">
                      @{u.username}
                    </div>
                  </div>
                  {selectedUsers.has(u.id) && (
                    <Check className="w-5 h-5 text-blue-600" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Send button */}
          <Button
            onClick={handleSend}
            disabled={selectedUsers.size === 0 || sending}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            {sending ? 'Sending...' : `Send to ${selectedUsers.size} user${selectedUsers.size !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareModal;
