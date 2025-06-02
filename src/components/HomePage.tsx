import { useState } from 'react';
import { Heart, Bell, MessageCircle, Users, TrendingUp, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import MapSection from '@/components/home/MapSection';
import StoriesSection from '@/components/home/StoriesSection';
import PlaceCard from '@/components/home/PlaceCard';
import CreateStoryModal from '@/components/CreateStoryModal';
import NotificationsModal from '@/components/NotificationsModal';
import MessagesModal from '@/components/MessagesModal';
import StoriesViewer from '@/components/StoriesViewer';
import ShareModal from '@/components/home/ShareModal';
import CommentModal from '@/components/home/CommentModal';

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
  addedBy?: string;
  addedDate?: string;
  isFollowing?: boolean;
  popularity?: number;
}

interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  isViewed: boolean;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  locationId: string;
  locationName: string;
  locationAddress: string;
  timestamp: string;
  bookingUrl?: string;
}

const mockPlaces: Place[] = [
  {
    id: '1',
    name: 'The Cozy Corner Café',
    category: 'cafe',
    likes: 24,
    friendsWhoSaved: [
      { name: 'Sarah', avatar: '1649972904349-6e44c42644a7' },
      { name: 'Mike', avatar: '1581091226825-a6a2a5aee158' }
    ],
    visitors: ['user1', 'user2'],
    isNew: false,
    coordinates: { lat: 37.7849, lng: -122.4094 },
    image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop',
    addedBy: 'user1',
    addedDate: '2024-05-25',
    isFollowing: true,
    popularity: 85
  },
  {
    id: '2',
    name: 'Sunset View Restaurant',
    category: 'restaurant',
    likes: 18,
    visitors: ['user3'],
    isNew: true,
    coordinates: { lat: 37.7849, lng: -122.4194 },
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
    addedBy: 'user2',
    addedDate: '2024-06-01',
    isFollowing: true,
    popularity: 92
  },
  {
    id: '3',
    name: 'Grand Plaza Hotel',
    category: 'hotel',
    likes: 45,
    friendsWhoSaved: [
      { name: 'Emma', avatar: '1581092795360-fd1ca04f0952' }
    ],
    visitors: ['user4', 'user5'],
    isNew: false,
    coordinates: { lat: 37.7749, lng: -122.4094 },
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop',
    addedBy: 'user5',
    addedDate: '2024-05-15',
    isFollowing: false,
    popularity: 96
  },
  {
    id: '4',
    name: 'Neon Nights Bar',
    category: 'bar',
    likes: 32,
    visitors: ['user6'],
    isNew: true,
    coordinates: { lat: 37.7649, lng: -122.4194 },
    image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=300&fit=crop',
    addedBy: 'user3',
    addedDate: '2024-05-30',
    isFollowing: true,
    popularity: 78
  },
  {
    id: '5',
    name: 'Ocean Breeze Restaurant',
    category: 'restaurant',
    likes: 28,
    friendsWhoSaved: [
      { name: 'Alex', avatar: '1535268647677-300dbf3d78d1' },
      { name: 'Jordan', avatar: '1649972904349-6e44c42644a7' },
      { name: 'Casey', avatar: '1581091226825-a6a2a5aee158' }
    ],
    visitors: ['user7', 'user8'],
    isNew: false,
    coordinates: { lat: 37.7549, lng: -122.4294 },
    image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=300&fit=crop',
    addedBy: 'user6',
    addedDate: '2024-05-10',
    isFollowing: false,
    popularity: 88
  },
  {
    id: '6',
    name: 'Artisan Coffee House',
    category: 'cafe',
    likes: 22,
    visitors: ['user9'],
    isNew: false,
    coordinates: { lat: 37.7949, lng: -122.4294 },
    image: 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=400&h=300&fit=crop',
    addedBy: 'user4',
    addedDate: '2024-05-20',
    isFollowing: true,
    popularity: 71
  }
];

const mockStories: Story[] = [
  {
    id: '1',
    userId: 'user1',
    userName: 'Sarah',
    userAvatar: '1649972904349-6e44c42644a7',
    isViewed: false,
    mediaUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=600&fit=crop',
    mediaType: 'image',
    locationId: '1',
    locationName: 'The Cozy Corner Café',
    locationAddress: '123 Main St, Downtown',
    timestamp: '2 hours ago',
    bookingUrl: 'https://www.opentable.com/booking'
  },
  {
    id: '2',
    userId: 'user2',
    userName: 'Mike',
    userAvatar: '1581091226825-a6a2a5aee158',
    isViewed: true,
    mediaUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=600&fit=crop',
    mediaType: 'image',
    locationId: '3',
    locationName: 'Grand Plaza Hotel',
    locationAddress: '456 Park Ave, Midtown',
    timestamp: '4 hours ago',
    bookingUrl: 'https://www.booking.com/hotel'
  },
  {
    id: '3',
    userId: 'user3',
    userName: 'Emma',
    userAvatar: '1581092795360-fd1ca04f0952',
    isViewed: false,
    mediaUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=600&fit=crop',
    mediaType: 'image',
    locationId: '5',
    locationName: 'Ocean Breeze Restaurant',
    locationAddress: '789 Coastal Rd, Seafront',
    timestamp: '6 hours ago',
    bookingUrl: 'https://www.opentable.com/r/ocean-breeze'
  }
];

const HomePage = () => {
  console.log('HomePage rendering...');
  
  const [isCreateStoryModalOpen, setIsCreateStoryModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isMessagesModalOpen, setIsMessagesModalOpen] = useState(false);
  const [isStoriesViewerOpen, setIsStoriesViewerOpen] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [stories, setStories] = useState(mockStories);
  const [activeFilter, setActiveFilter] = useState<'following' | 'popular' | 'new'>('following');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [likedPlaces, setLikedPlaces] = useState<Set<string>>(new Set());
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [sharePlace, setSharePlace] = useState<Place | null>(null);
  const [commentPlace, setCommentPlace] = useState<Place | null>(null);

  const getFilteredPlaces = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    switch (activeFilter) {
      case 'following':
        return mockPlaces.filter(place => place.isFollowing);
      case 'popular':
        return mockPlaces.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      case 'new':
        return mockPlaces.filter(place => {
          const addedDate = new Date(place.addedDate || '');
          return place.isFollowing && addedDate >= oneWeekAgo;
        });
      default:
        return mockPlaces;
    }
  };

  const handleCreateStory = () => {
    console.log('Create story clicked');
    setIsCreateStoryModalOpen(true);
  };

  const handleStoryCreated = () => {
    console.log('Story created successfully');
    // TODO: Refresh stories list
  };

  const handleStoryClick = (index: number) => {
    console.log('Story clicked:', index);
    setCurrentStoryIndex(index);
    setIsStoriesViewerOpen(true);
  };

  const handleStoryViewed = (storyId: string) => {
    setStories(prev => prev.map(story => 
      story.id === storyId ? { ...story, isViewed: true } : story
    ));
  };

  const handlePinClick = (place: Place) => {
    console.log('Map pin clicked:', place.name);
    setSelectedPlace(place);
  };

  const handleLikeToggle = (placeId: string) => {
    setLikedPlaces(prev => {
      const newLiked = new Set(prev);
      if (newLiked.has(placeId)) {
        newLiked.delete(placeId);
      } else {
        newLiked.add(placeId);
      }
      return newLiked;
    });
  };

  const handleShare = (place: Place) => {
    setSharePlace(place);
    setIsShareModalOpen(true);
  };

  const handleComment = (place: Place) => {
    setCommentPlace(place);
    setIsCommentModalOpen(true);
  };

  const handleCardClick = (place: Place) => {
    console.log('Place card clicked:', place.name);
    // TODO: Navigate to place detail view
  };

  const filteredPlaces = getFilteredPlaces();

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Discover</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsNotificationsModalOpen(true)}
              className="relative w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                3
              </div>
            </button>
            <button
              onClick={() => setIsMessagesModalOpen(true)}
              className="relative w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <MessageCircle className="w-5 h-5 text-gray-600" />
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                2
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Stories Section */}
      <div className="bg-white px-4 py-4 border-b border-gray-200">
        <div className="overflow-x-auto">
          <StoriesSection 
            stories={stories}
            onCreateStory={handleCreateStory}
            onStoryClick={handleStoryClick}
          />
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="bg-white px-4 py-3 border-b border-gray-200">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveFilter('following')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
              activeFilter === 'following'
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            <Users className="w-4 h-4" />
            Following
          </button>
          <button
            onClick={() => setActiveFilter('popular')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
              activeFilter === 'popular'
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            <Heart className="w-4 h-4" />
            Popular
          </button>
          <button
            onClick={() => setActiveFilter('new')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors relative",
              activeFilter === 'new'
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            <Sparkles className="w-4 h-4" />
            New
            {getFilteredPlaces().length > 0 && activeFilter !== 'new' && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
            )}
          </button>
        </div>
      </div>

      {/* Map Section */}
      <div className="flex-1">
        <MapSection places={filteredPlaces} onPinClick={handlePinClick} />
      </div>

      {/* Selected Place Card */}
      {selectedPlace && (
        <div className="bg-white border-t border-gray-200 p-4">
          <PlaceCard
            place={selectedPlace}
            isLiked={likedPlaces.has(selectedPlace.id)}
            onCardClick={handleCardClick}
            onLikeToggle={handleLikeToggle}
            onShare={handleShare}
            onComment={handleComment}
          />
        </div>
      )}

      {/* Modals */}
      <CreateStoryModal
        isOpen={isCreateStoryModalOpen}
        onClose={() => setIsCreateStoryModalOpen(false)}
        onStoryCreated={handleStoryCreated}
      />

      <NotificationsModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
      />

      <MessagesModal
        isOpen={isMessagesModalOpen}
        onClose={() => setIsMessagesModalOpen(false)}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        place={sharePlace}
      />

      <CommentModal
        isOpen={isCommentModalOpen}
        onClose={() => setIsCommentModalOpen(false)}
        place={commentPlace}
      />

      {/* Stories Viewer */}
      {isStoriesViewerOpen && (
        <StoriesViewer
          stories={stories}
          initialStoryIndex={currentStoryIndex}
          onClose={() => setIsStoriesViewerOpen(false)}
          onStoryViewed={handleStoryViewed}
        />
      )}
    </div>
  );
};

export default HomePage;
