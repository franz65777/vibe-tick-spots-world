import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Share, X, Play } from 'lucide-react';
import { Location } from '@/services/locationService';

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
  location: Location | null;
}

const LocationDetailSheet = ({ isOpen, onClose, location }: LocationDetailSheetProps) => {
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  // Mock media data - in a real app this would come from your API
  const mockMedia: MediaItem[] = [
    {
      id: '1',
      type: 'image',
      url: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png',
      user: { name: 'Emma', avatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png', isFollowing: true },
      likes: 24,
      caption: 'Amazing coffee here! ☕️',
      createdAt: '2h ago'
    },
    {
      id: '2',
      type: 'video',
      url: '/lovable-uploads/5bb15f7b-b3ba-4eae-88b1-7fa789eb67c4.png',
      thumbnail: '/lovable-uploads/5bb15f7b-b3ba-4eae-88b1-7fa789eb67c4.png',
      user: { name: 'Michael', avatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png', isFollowing: true },
      likes: 18,
      caption: 'Best rooftop view in the city! 🌃',
      createdAt: '4h ago'
    },
    {
      id: '3',
      type: 'image',
      url: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png',
      user: { name: 'Alex', avatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png', isFollowing: false },
      likes: 12,
      caption: 'Great atmosphere!',
      createdAt: '6h ago'
    },
    {
      id: '4',
      type: 'image',
      url: '/lovable-uploads/5bb15f7b-b3ba-4eae-88b1-7fa789eb67c4.png',
      user: { name: 'Sarah', avatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png', isFollowing: false },
      likes: 9,
      caption: 'Perfect spot for a date night 💕',
      createdAt: '8h ago'
    }
  ];

  const followingMedia = mockMedia.filter(item => item.user.isFollowing);
  const otherMedia = mockMedia.filter(item => !item.user.isFollowing);

  if (!location) return null;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-[90vh] p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="text-left">{location.name}</SheetTitle>
            <p className="text-sm text-gray-500 text-left">{location.address}</p>
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
                  <span className="text-xs">👥</span>
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
          <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-xs">{media.user.name[0]}</span>
          </div>
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
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-sm">{media.user.name[0]}</span>
          </div>
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
