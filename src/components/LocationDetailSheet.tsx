import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Heart, MessageCircle, Share, X, Play, Bookmark, Camera, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Place {
  id: string;
  name: string;
  category: string;
  likes: number;
  friendsWhoSaved?: { name: string; avatar: string }[];
  visitors: string[];
  isNew: boolean;
  coordinates: { lat: number; lng: number };
  image?: string;
}

interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
  user: {
    name: string;
    avatar: string;
    isFollowing: boolean;
  };
  likes: number;
  caption?: string;
  createdAt: string;
}

interface LocationDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  location: Place | null;
}

const LocationDetailSheet = ({ isOpen, onClose, location }: LocationDetailSheetProps) => {
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  // Generate mock media data based on location category
  const generateMockMedia = (location: Place): MediaItem[] => {
    if (location.category === 'hotel') {
      return [
        {
          id: '1',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=600&fit=crop',
          user: { name: 'Emma', avatar: 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=100&h=100&fit=crop&crop=face', isFollowing: true },
          likes: 24,
          caption: 'Luxurious stay with amazing city views! 🏨✨',
          createdAt: '2h ago'
        },
        {
          id: '2',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=600&fit=crop',
          user: { name: 'Michael', avatar: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=100&h=100&fit=crop&crop=face', isFollowing: true },
          likes: 18,
          caption: 'Best rooftop view in the city! 🌃',
          createdAt: '4h ago'
        },
        {
          id: '3',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=600&fit=crop',
          user: { name: 'Alex', avatar: 'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=100&h=100&fit=crop&crop=face', isFollowing: false },
          likes: 12,
          caption: 'Perfect for business trips!',
          createdAt: '6h ago'
        },
        {
          id: '4',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=400&h=600&fit=crop',
          user: { name: 'Sarah', avatar: 'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=100&h=100&fit=crop&crop=face', isFollowing: false },
          likes: 9,
          caption: 'Spa day was incredible! 💆‍♀️',
          createdAt: '8h ago'
        }
      ];
    } else if (location.category === 'restaurant') {
      return [
        {
          id: '1',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=600&fit=crop',
          user: { name: 'Emma', avatar: 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=100&h=100&fit=crop&crop=face', isFollowing: true },
          likes: 32,
          caption: 'Best seafood in town! 🦞🍤',
          createdAt: '1h ago'
        },
        {
          id: '2',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=600&fit=crop',
          user: { name: 'Michael', avatar: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=100&h=100&fit=crop&crop=face', isFollowing: true },
          likes: 28,
          caption: 'Ocean breeze and amazing food 🌊',
          createdAt: '3h ago'
        },
        {
          id: '3',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=600&fit=crop',
          user: { name: 'Julia', avatar: 'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=100&h=100&fit=crop&crop=face', isFollowing: false },
          likes: 15,
          caption: 'Perfect date night spot 💕',
          createdAt: '5h ago'
        }
      ];
    } else if (location.category === 'cafe') {
      return [
        {
          id: '1',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=600&fit=crop',
          user: { name: 'Emma', avatar: 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=100&h=100&fit=crop&crop=face', isFollowing: true },
          likes: 24,
          caption: 'Amazing coffee here! ☕️ Perfect for work',
          createdAt: '2h ago'
        },
        {
          id: '2',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=400&h=600&fit=crop',
          user: { name: 'David', avatar: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=100&h=100&fit=crop&crop=face', isFollowing: true },
          likes: 18,
          caption: 'Best latte art in the city! ☕🎨',
          createdAt: '4h ago'
        },
        {
          id: '3',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=400&h=600&fit=crop',
          user: { name: 'Lisa', avatar: 'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=100&h=100&fit=crop&crop=face', isFollowing: false },
          likes: 12,
          caption: 'Cozy atmosphere for reading 📚',
          createdAt: '6h ago'
        }
      ];
    } else if (location.category === 'bar') {
      return [
        {
          id: '1',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=600&fit=crop',
          user: { name: 'Emma', avatar: 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=100&h=100&fit=crop&crop=face', isFollowing: true },
          likes: 42,
          caption: 'Neon vibes and great cocktails! 🍸✨',
          createdAt: '1h ago'
        },
        {
          id: '2',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1470337458703-185af2aa9deb?w=400&h=600&fit=crop',
          user: { name: 'Jake', avatar: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=100&h=100&fit=crop&crop=face', isFollowing: true },
          likes: 36,
          caption: 'Live music night was incredible! 🎵🎸',
          createdAt: '3h ago'
        },
        {
          id: '3',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=400&h=600&fit=crop',
          user: { name: 'Maya', avatar: 'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=100&h=100&fit=crop&crop=face', isFollowing: false },
          likes: 21,
          caption: 'Happy hour deals are amazing! 🍻',
          createdAt: '5h ago'
        }
      ];
    }
    return [];
  };

  if (!location) return null;

  const mockMedia = generateMockMedia(location);
  const followingMedia = mockMedia.filter(item => item.user.isFollowing);
  const otherMedia = mockMedia.filter(item => !item.user.isFollowing);

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-[90vh] p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="text-left">{location.name}</SheetTitle>
            <p className="text-sm text-gray-500 text-left">
              {location.category === 'hotel' ? '456 Park Ave, Midtown' : 
               location.category === 'restaurant' ? '789 Coastal Rd, Seafront' :
               location.category === 'cafe' ? '123 Main St, Downtown' :
               '321 Night St, Entertainment District'}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                {location.category}
              </span>
              <span className="text-xs text-gray-500">
                {mockMedia.length} posts
              </span>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Following Media Section */}
            {followingMedia.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  From people you follow
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {followingMedia.map((media) => (
                    <MediaCard 
                      key={media.id} 
                      media={media} 
                      onClick={() => setSelectedMedia(media)} 
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Other Media Section */}
            {otherMedia.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Other posts</h3>
                <div className="grid grid-cols-2 gap-3">
                  {otherMedia.map((media) => (
                    <MediaCard 
                      key={media.id} 
                      media={media} 
                      onClick={() => setSelectedMedia(media)} 
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Media Detail Modal */}
      {selectedMedia && (
        <MediaDetailModal 
          media={selectedMedia} 
          onClose={() => setSelectedMedia(null)} 
        />
      )}
    </>
  );
};

const MediaCard = ({ media, onClick }: { media: MediaItem; onClick: () => void }) => (
  <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={onClick}>
    <CardContent className="p-0">
      <div className="relative aspect-square">
        <img 
          src={media.type === 'video' ? media.thumbnail : media.url} 
          alt="Media" 
          className="w-full h-full object-cover rounded-t-lg"
        />
        {media.type === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center">
              <Play className="w-6 h-6 text-white ml-1" />
            </div>
          </div>
        )}
        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
          {media.createdAt}
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <img 
            src={media.user.avatar} 
            alt={media.user.name}
            className="w-6 h-6 rounded-full object-cover"
          />
          <span className="text-sm font-medium">{media.user.name}</span>
          {media.user.isFollowing && (
            <span className="text-xs bg-blue-100 text-blue-600 px-1 rounded">Following</span>
          )}
        </div>
        <p className="text-sm text-gray-600 line-clamp-2">{media.caption}</p>
        <div className="flex items-center gap-1 mt-2">
          <Heart className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-500">{media.likes}</span>
        </div>
      </div>
    </CardContent>
  </Card>
);

const MediaDetailModal = ({ media, onClose }: { media: MediaItem; onClose: () => void }) => (
  <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
    <div className="w-full h-full max-w-md mx-auto bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <img 
            src={media.user.avatar} 
            alt={media.user.name}
            className="w-8 h-8 rounded-full object-cover"
          />
          <span className="font-medium">{media.user.name}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Media */}
      <div className="flex-1 flex items-center justify-center bg-black">
        {media.type === 'video' ? (
          <video 
            src={media.url} 
            controls 
            className="max-w-full max-h-full"
            autoPlay
          />
        ) : (
          <img 
            src={media.url} 
            alt="Media" 
            className="max-w-full max-h-full object-contain"
          />
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm">
              <Heart className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm">
              <MessageCircle className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm">
              <Share className="w-5 h-5" />
            </Button>
          </div>
        </div>
        <p className="text-sm font-medium mb-1">{media.likes} likes</p>
        <p className="text-sm">
          <span className="font-medium">{media.user.name}</span> {media.caption}
        </p>
        <p className="text-xs text-gray-500 mt-2">{media.createdAt}</p>
      </div>
    </div>
  </div>
);

export default LocationDetailSheet;
