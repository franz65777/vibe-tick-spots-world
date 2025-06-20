
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Share2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlaceEngagement } from '@/hooks/usePlaceEngagement';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  place: any;
}

interface Friend {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
}

const ShareModal = ({ isOpen, onClose, place }: ShareModalProps) => {
  const { user } = useAuth();
  const { shareWithFriends } = usePlaceEngagement();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      loadFriends();
    }
  }, [isOpen, user]);

  const loadFriends = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get users that the current user follows with explicit column specification
      const { data: followData, error: followError } = await supabase
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

      if (followError) throw followError;

      const friendsList = followData
        ?.map(f => f.profiles)
        .filter(Boolean) || [];

      setFriends(friendsList);
    } catch (error) {
      console.error('Error loading friends:', error);
      setFriends([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFriendToggle = (friendId: string) => {
    setSelectedFriends(prev => {
      const newSet = new Set(prev);
      if (newSet.has(friendId)) {
        newSet.delete(friendId);
      } else {
        newSet.add(friendId);
      }
      return newSet;
    });
  };

  const handleShare = async () => {
    if (selectedFriends.size === 0) return;

    setSharing(true);
    try {
      const success = await shareWithFriends(place, Array.from(selectedFriends));
      if (success) {
        onClose();
        setSelectedFriends(new Set());
      }
    } catch (error) {
      console.error('Error sharing:', error);
    } finally {
      setSharing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-600" />
            Share • {place?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No friends to share with</p>
              <p className="text-sm">Follow some users to share places with them!</p>
            </div>
          ) : (
            <>
              <div className="text-sm text-gray-600 mb-4">
                Select friends to share this place with:
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {friends.map((friend) => (
                  <label
                    key={friend.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={selectedFriends.has(friend.id)}
                      onCheckedChange={() => handleFriendToggle(friend.id)}
                    />
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={friend.avatar_url} />
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {(friend.full_name || friend.username || 'U')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">
                        {friend.full_name || friend.username || 'Anonymous'}
                      </div>
                      {friend.username && friend.full_name && (
                        <div className="text-xs text-gray-500 truncate">
                          @{friend.username}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleShare}
                  disabled={selectedFriends.size === 0 || sharing}
                  className="min-w-[100px]"
                >
                  {sharing ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    `Share (${selectedFriends.size})`
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareModal;
