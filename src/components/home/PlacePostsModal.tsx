
import { useState } from 'react';
import { X, Heart, MessageCircle, Share, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Place {
  id: string;
  name: string;
  category: string;
  likes: number;
  visitors: string[];
  isNew: boolean;
  coordinates: { lat: number; lng: number };
  image?: string;
  addedBy?: string;
  addedDate?: string;
  isFollowing?: boolean;
  popularity?: number;
}

interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  image: string;
  caption: string;
  likes: number;
  comments: number;
  timestamp: string;
  isLiked: boolean;
}

interface PlacePostsModalProps {
  isOpen: boolean;
  onClose: () => void;
  place: Place;
}

// Mock posts data for demonstration
const generateMockPosts = (place: Place): Post[] => {
  const baseImages = [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=600&fit=crop'
  ];

  const users = [
    { name: 'Sarah Johnson', avatar: 'photo-1494790108755-2616b5a5c75b' },
    { name: 'Mike Chen', avatar: 'photo-1507003211169-0a1dd7228f2d' },
    { name: 'Emma Wilson', avatar: 'photo-1438761681033-6461ffad8d80' },
    { name: 'Alex Rivera', avatar: 'photo-1472099645785-5658abf4ff4e' },
    { name: 'Lisa Park', avatar: 'photo-1544005313-94ddf0286df2' }
  ];

  const captions = [
    `Amazing experience at ${place.name}! The atmosphere is incredible 🌟`,
    `Perfect spot for a weekend visit. Highly recommend ${place.name}! ✨`,
    `Just discovered this gem! ${place.name} exceeded all expectations 💎`,
    `Great vibes and even better food at ${place.name} 🍽️`,
    `Can't get enough of this place! ${place.name} is my new favorite spot ❤️`
  ];

  return Array.from({ length: 5 }, (_, index) => ({
    id: `post-${place.id}-${index}`,
    userId: `user-${index}`,
    userName: users[index].name,
    userAvatar: `https://images.unsplash.com/${users[index].avatar}?w=100&h=100&fit=crop&crop=face`,
    image: baseImages[index],
    caption: captions[index],
    likes: Math.floor(Math.random() * 50) + 10,
    comments: Math.floor(Math.random() * 20) + 3,
    timestamp: `${Math.floor(Math.random() * 12) + 1}h`,
    isLiked: Math.random() > 0.5
  }));
};

const PlacePostsModal = ({ isOpen, onClose, place }: PlacePostsModalProps) => {
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  const [posts] = useState(() => generateMockPosts(place));
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  const currentPost = posts[currentPostIndex];

  const handlePrevious = () => {
    setCurrentPostIndex((prev) => (prev > 0 ? prev - 1 : posts.length - 1));
  };

  const handleNext = () => {
    setCurrentPostIndex((prev) => (prev < posts.length - 1 ? prev + 1 : 0));
  };

  const handleLikeToggle = (postId: string) => {
    setLikedPosts(prev => {
      const newLiked = new Set(prev);
      if (newLiked.has(postId)) {
        newLiked.delete(postId);
      } else {
        newLiked.add(postId);
      }
      return newLiked;
    });
  };

  if (!currentPost) return null;

  const isPostLiked = likedPosts.has(currentPost.id) || currentPost.isLiked;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto h-[90vh] p-0 bg-white rounded-3xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <img
              src={currentPost.userAvatar}
              alt={currentPost.userName}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <div className="font-semibold text-sm">{currentPost.userName}</div>
              <div className="text-xs text-gray-500">{place.name}</div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Post Content */}
        <div className="flex-1 relative">
          {/* Navigation Arrows */}
          {posts.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevious}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </>
          )}

          {/* Post Image */}
          <div className="aspect-[4/5] relative bg-gray-100">
            <img
              src={currentPost.image}
              alt="Post content"
              className="w-full h-full object-cover"
            />
            
            {/* Post Counter */}
            {posts.length > 1 && (
              <div className="absolute top-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                {currentPostIndex + 1} / {posts.length}
              </div>
            )}
          </div>

          {/* Post Actions */}
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleLikeToggle(currentPost.id)}
                  className="rounded-full p-2"
                >
                  <Heart
                    className={`w-6 h-6 ${
                      isPostLiked 
                        ? 'fill-red-500 text-red-500' 
                        : 'text-gray-700'
                    }`}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full p-2"
                >
                  <MessageCircle className="w-6 h-6 text-gray-700" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full p-2"
                >
                  <Share className="w-6 h-6 text-gray-700" />
                </Button>
              </div>
            </div>

            {/* Like Count */}
            <div className="font-semibold text-sm">
              {currentPost.likes + (isPostLiked && !currentPost.isLiked ? 1 : 0)} likes
            </div>

            {/* Caption */}
            <div className="text-sm">
              <span className="font-semibold">{currentPost.userName}</span>{' '}
              <span className="text-gray-700">{currentPost.caption}</span>
            </div>

            {/* Comments */}
            <div className="text-sm text-gray-500">
              View all {currentPost.comments} comments
            </div>

            {/* Timestamp */}
            <div className="text-xs text-gray-400 uppercase">
              {currentPost.timestamp} ago
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlacePostsModal;
