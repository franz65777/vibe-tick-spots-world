
import { useState } from 'react';
import { Heart, Bell, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import MapSection from '@/components/home/MapSection';
import StoriesSection from '@/components/home/StoriesSection';
import PlaceCard from '@/components/home/PlaceCard';
import CreateStoryModal from '@/components/CreateStoryModal';
import NotificationsModal from '@/components/NotificationsModal';
import MessagesModal from '@/components/MessagesModal';
import ShareModal from '@/components/home/ShareModal';
import StoriesViewer from '@/components/StoriesViewer';

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
    isNew: true,
    coordinates: { lat: 37.7849, lng: -122.4094 },
    image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop'
  },
  {
    id: '2',
    name: 'Sunset View Restaurant',
    category: 'restaurant',
    likes: 18,
    visitors: ['user3'],
    isNew: false,
    coordinates: { lat: 37.7849, lng: -122.4194 },
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop'
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
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop'
  },
  {
    id: '4',
    name: 'Neon Nights Bar',
    category: 'bar',
    likes: 32,
    visitors: ['user6'],
    isNew: true,
    coordinates: { lat: 37.7649, lng: -122.4194 },
    image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=300&fit=crop'
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
    image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=300&fit=crop'
  },
  {
    id: '6',
    name: 'Artisan Coffee House',
    category: 'cafe',
    likes: 22,
    visitors: ['user9'],
    isNew: false,
    coordinates: { lat: 37.7949, lng: -122.4294 },
    image: 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=400&h=300&fit=crop'
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
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [likedPlaces, setLikedPlaces] = useState<Set<string>>(new Set());
  const [isCreateStoryModalOpen, setIsCreateStoryModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isMessagesModalOpen, setIsMessagesModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedPlaceToShare, setSelectedPlaceToShare] = useState<Place | null>(null);
  const [isStoriesViewerOpen, setIsStoriesViewerOpen] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [stories, setStories] = useState(mockStories);

  const handleCategoryClick = (category: string) => {
    console.log('Category clicked:', category);
    setSelectedCategory(category);
  };

  const handleLikeToggle = (placeId: string) => {
    setLikedPlaces(prev => {
      const newLikes = new Set(prev);
      if (newLikes.has(placeId)) {
        newLikes.delete(placeId);
      } else {
        newLikes.add(placeId);
      }
      return newLikes;
    });
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

  const handleCardClick = (place: Place) => {
    console.log('Place card clicked:', place.name);
  };

  const handleShare = (place: Place) => {
    console.log('Share place:', place.name);
    setSelectedPlaceToShare(place);
    setIsShareModalOpen(true);
  };

  const handleShareComplete = (friendIds: string[], place: Place) => {
    console.log('Sharing place with friends:', friendIds, place.name);
    // TODO: Send location to selected friends' DMs
  };

  const handleComment = (place: Place) => {
    console.log('Comment on place:', place.name);
  };

  const handlePinClick = (place: Place) => {
    console.log('Map pin clicked:', place.name);
  };

  const filteredPlaces = selectedCategory === 'all'
    ? mockPlaces
    : mockPlaces.filter(place => place.category === selectedCategory);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Discover</h1>
            <p className="text-gray-500 mt-1">Explore new places and share your experiences</p>
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

      {/* Stories Section - Moved above map */}
      <div className="bg-white px-4 py-4 border-b border-gray-200">
        <div className="overflow-x-auto">
          <StoriesSection 
            stories={stories}
            onCreateStory={handleCreateStory}
            onStoryClick={handleStoryClick}
          />
        </div>
      </div>

      {/* Map Section */}
      <MapSection places={filteredPlaces} onPinClick={handlePinClick} />

      {/* Filter Buttons */}
      <div className="bg-white px-4 py-3 border-b border-gray-200">
        <div className="flex space-x-2 overflow-x-auto">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            onClick={() => handleCategoryClick('all')}
          >
            All
          </Button>
          <Button
            variant={selectedCategory === 'restaurant' ? 'default' : 'outline'}
            onClick={() => handleCategoryClick('restaurant')}
          >
            Restaurants
          </Button>
          <Button
            variant={selectedCategory === 'hotel' ? 'default' : 'outline'}
            onClick={() => handleCategoryClick('hotel')}
          >
            Hotels
          </Button>
          <Button
            variant={selectedCategory === 'cafe' ? 'default' : 'outline'}
            onClick={() => handleCategoryClick('cafe')}
          >
            Cafes
          </Button>
          <Button
            variant={selectedCategory === 'bar' ? 'default' : 'outline'}
            onClick={() => handleCategoryClick('bar')}
          >
            Bars
          </Button>
        </div>
      </div>

      {/* Places Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white">
          <div className="px-4 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedCategory === 'all' 
                ? 'Nearby Places' 
                : `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}s Nearby`
              }
            </h2>
          </div>
          <div className="px-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              {filteredPlaces.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  isLiked={likedPlaces.has(place.id)}
                  onCardClick={handleCardClick}
                  onLikeToggle={handleLikeToggle}
                  onShare={handleShare}
                  onComment={handleComment}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

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
        place={selectedPlaceToShare}
        onShare={handleShareComplete}
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
