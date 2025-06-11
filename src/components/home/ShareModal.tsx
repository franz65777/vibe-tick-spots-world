
import { useState } from 'react';
import { X, Search, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Friend {
  id: string;
  name: string;
  avatar: string;
  isOnline: boolean;
}

interface Place {
  id: string;
  name: string;
  category: string;
  likes: number;
  friendsWhoSaved: { name: string; avatar: string; }[];
  visitors: string[];
  isNew: boolean;
  coordinates: { lat: number; lng: number };
  rating: number;
  reviews: number;
  distance: string;
  addedBy: { name: string; avatar: string; isFollowing: boolean };
  addedDate: string;
  image: string;
  description?: string;
  totalSaves: number;
}

interface Trip {
  id: string;
  name: string;
}

interface Post {
  id: string;
  caption: string;
  location: string;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Place | Trip | Post | null;
  itemType: 'place' | 'trip' | 'post';
  onShare: (friendIds: string[], item: any) => void;
  // Legacy support for place prop
  place?: Place;
}

const ShareModal = ({ isOpen, onClose, item, itemType, onShare, place }: ShareModalProps) => {
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Use item or fallback to place for backward compatibility
  const shareItem = item || place;

  const mockFriends: Friend[] = [
    { id: '1', name: 'Emma', avatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png', isOnline: true },
    { id: '2', name: 'Michael', avatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png', isOnline: false },
    { id: '3', name: 'Sophia', avatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png', isOnline: true },
    { id: '4', name: 'James', avatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png', isOnline: true },
    { id: '5', name: 'Olivia', avatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png', isOnline: false },
  ];

  const handleFriendToggle = (friendId: string) => {
    setSelectedFriends(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(friendId)) {
        newSelected.delete(friendId);
      } else {
        newSelected.add(friendId);
      }
      return newSelected;
    });
  };

  const handleShare = () => {
    if (shareItem && selectedFriends.size > 0) {
      onShare(Array.from(selectedFriends), shareItem);
      setSelectedFriends(new Set());
      onClose();
    }
  };

  const filteredFriends = mockFriends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getItemName = () => {
    if (!shareItem) return '';
    if (itemType === 'place' || place) return (shareItem as Place).name;
    if (itemType === 'trip') return (shareItem as Trip).name;
    if (itemType === 'post') return (shareItem as Post).location;
    return '';
  };

  if (!isOpen || !shareItem) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Share {getItemName()}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search friends"
              className="pl-10 rounded-full border-gray-300"
            />
          </div>
        </div>

        {/* Friends List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {filteredFriends.map((friend) => (
              <div
                key={friend.id}
                onClick={() => handleFriendToggle(friend.id)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                {/* Friend Avatar */}
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-sm font-medium">{friend.name[0]}</span>
                  </div>
                  {friend.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>

                {/* Friend Info */}
                <div className="flex-1">
                  <h3 className="font-medium text-sm">{friend.name}</h3>
                  <p className="text-xs text-gray-500">
                    {friend.isOnline ? 'Active now' : 'Offline'}
                  </p>
                </div>

                {/* Selection Indicator */}
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedFriends.has(friend.id) 
                    ? 'bg-blue-600 border-blue-600' 
                    : 'border-gray-300'
                }`}>
                  {selectedFriends.has(friend.id) && (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100">
          <Button
            onClick={handleShare}
            disabled={selectedFriends.size === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="w-4 h-4 mr-2" />
            Share with {selectedFriends.size} friend{selectedFriends.size !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
