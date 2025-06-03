import { useState } from 'react';
import { Heart, Bell, MessageCircle, Users, TrendingUp, Sparkles, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MapSection from '@/components/home/MapSection';
import StoriesSection from '@/components/home/StoriesSection';
import PlaceCard from '@/components/home/PlaceCard';
import CreateStoryModal from '@/components/CreateStoryModal';
import NotificationsModal from '@/components/NotificationsModal';
import MessagesModal from '@/components/MessagesModal';
import StoriesViewer from '@/components/StoriesViewer';
import ShareModal from '@/components/home/ShareModal';
import CommentModal from '@/components/home/CommentModal';
import LocationOfTheWeek from '@/components/home/LocationOfTheWeek';
import LocationDetailSheet from '@/components/LocationDetailSheet';
import Header from '@/components/home/Header';
import FilterButtons from '@/components/home/FilterButtons';
import ModalsManager from '@/components/home/ModalsManager';

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
  locationCategory?: string;
}

// City data with places for different cities
const cityData: Record<string, { coordinates: { lat: number; lng: number }; places: Place[] }> = {
  'san francisco': {
    coordinates: { lat: 37.7749, lng: -122.4194 },
    places: [
      {
        id: '1',
        name: 'The Cozy Corner Café',
        category: 'cafe',
        likes: 24,
        friendsWhoSaved: [
          { name: 'Sarah', avatar: 'photo-1494790108755-2616b5a5c75b' },
          { name: 'Mike', avatar: 'photo-1507003211169-0a1dd7228f2d' }
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
          { name: 'Emma', avatar: 'photo-1438761681033-6461ffad8d80' }
        ],
        visitors: ['user4', 'user5'],
        isNew: false,
        coordinates: { lat: 37.7749, lng: -122.4094 },
        image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop',
        addedBy: 'user5',
        addedDate: '2024-05-15',
        isFollowing: false,
        popularity: 96
      }
    ]
  },
  'milan': {
    coordinates: { lat: 45.4642, lng: 9.1900 },
    places: [
      {
        id: 'milan1',
        name: 'Café Milano',
        category: 'cafe',
        likes: 32,
        friendsWhoSaved: [
          { name: 'Marco', avatar: 'photo-1527980965255-d3b416303d12' },
          { name: 'Sofia', avatar: 'photo-1534528741775-53994a69daeb' }
        ],
        visitors: ['user1', 'user2', 'user3'],
        isNew: true,
        coordinates: { lat: 45.4642, lng: 9.1900 },
        image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop',
        addedBy: 'user1',
        addedDate: '2024-05-28',
        isFollowing: true,
        popularity: 88
      },
      {
        id: 'milan2',
        name: 'Duomo Restaurant',
        category: 'restaurant',
        likes: 45,
        visitors: ['user4', 'user5'],
        isNew: false,
        coordinates: { lat: 45.4640, lng: 9.1896 },
        image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop',
        addedBy: 'user2',
        addedDate: '2024-05-20',
        isFollowing: true,
        popularity: 94
      },
      {
        id: 'milan3',
        name: 'Navigli Bar',
        category: 'bar',
        likes: 28,
        friendsWhoSaved: [
          { name: 'Giuseppe', avatar: 'photo-1552058544-f2b08422138a' }
        ],
        visitors: ['user6'],
        isNew: true,
        coordinates: { lat: 45.4583, lng: 9.1756 },
        image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=300&fit=crop',
        addedBy: 'user3',
        addedDate: '2024-06-01',
        isFollowing: true,
        popularity: 82
      },
      {
        id: 'milan4',
        name: 'Hotel Principe di Savoia',
        category: 'hotel',
        likes: 67,
        friendsWhoSaved: [
          { name: 'Isabella', avatar: 'photo-1487412720507-e7ab37603c6f' },
          { name: 'Lorenzo', avatar: 'photo-1500648767791-00dcc994a43e' }
        ],
        visitors: ['user7', 'user8', 'user9'],
        isNew: false,
        coordinates: { lat: 45.4696, lng: 9.1965 },
        image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop',
        addedBy: 'user4',
        addedDate: '2024-05-10',
        isFollowing: false,
        popularity: 96
      }
    ]
  },
  'paris': {
    coordinates: { lat: 48.8566, lng: 2.3522 },
    places: [
      {
        id: 'paris1',
        name: 'Café de Flore',
        category: 'cafe',
        likes: 56,
        friendsWhoSaved: [
          { name: 'Pierre', avatar: 'photo-1507003211169-0a1dd7228f2d' },
          { name: 'Marie', avatar: 'photo-1494790108755-2616b5a5c75b' }
        ],
        visitors: ['user1', 'user2'],
        isNew: false,
        coordinates: { lat: 48.8542, lng: 2.3320 },
        image: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=400&h=300&fit=crop',
        addedBy: 'user1',
        addedDate: '2024-05-15',
        isFollowing: true,
        popularity: 91
      },
      {
        id: 'paris2',
        name: 'Le Jules Verne',
        category: 'restaurant',
        likes: 89,
        visitors: ['user3', 'user4'],
        isNew: true,
        coordinates: { lat: 48.8584, lng: 2.2945 },
        image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop',
        addedBy: 'user2',
        addedDate: '2024-05-30',
        isFollowing: true,
        popularity: 98
      }
    ]
  }
};

// Default to San Francisco places
const defaultPlaces = cityData['san francisco'].places;

const mockStories: Story[] = [
  {
    id: '1',
    userId: 'user1',
    userName: 'Sarah',
    userAvatar: 'photo-1494790108755-2616b5a5c75b',
    isViewed: false,
    mediaUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=600&fit=crop',
    mediaType: 'image',
    locationId: '1',
    locationName: 'The Cozy Corner Café',
    locationAddress: '123 Main St, Downtown',
    timestamp: '2 hours ago',
    bookingUrl: 'https://www.opentable.com/booking',
    locationCategory: 'restaurant'
  },
  {
    id: '4',
    userId: 'user1',
    userName: 'Sarah',
    userAvatar: 'photo-1494790108755-2616b5a5c75b',
    isViewed: false,
    mediaUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=600&fit=crop',
    mediaType: 'image',
    locationId: '4',
    locationName: 'Neon Nights Bar',
    locationAddress: '789 Night St, Downtown',
    timestamp: '1 hour ago',
    bookingUrl: 'https://www.opentable.com/booking',
    locationCategory: 'bar'
  },
  {
    id: '5',
    userId: 'user1',
    userName: 'Sarah',
    userAvatar: 'photo-1494790108755-2616b5a5c75b',
    isViewed: false,
    mediaUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=600&fit=crop',
    mediaType: 'image',
    locationId: '3',
    locationName: 'Grand Plaza Hotel',
    locationAddress: '456 Park Ave, Midtown',
    timestamp: '30 minutes ago',
    bookingUrl: 'https://www.booking.com/hotel',
    locationCategory: 'hotel'
  },
  {
    id: '6',
    userId: 'user1',
    userName: 'Sarah',
    userAvatar: 'photo-1494790108755-2616b5a5c75b',
    isViewed: false,
    mediaUrl: 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=400&h=600&fit=crop',
    mediaType: 'image',
    locationId: '6',
    locationName: 'Artisan Coffee House',
    locationAddress: '789 Coffee St, Downtown',
    timestamp: '15 minutes ago',
    bookingUrl: 'https://www.opentable.com/booking',
    locationCategory: 'cafe'
  },
  {
    id: '2',
    userId: 'user2',
    userName: 'Mike',
    userAvatar: 'photo-1507003211169-0a1dd7228f2d',
    isViewed: true,
    mediaUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=600&fit=crop',
    mediaType: 'image',
    locationId: '3',
    locationName: 'Grand Plaza Hotel',
    locationAddress: '456 Park Ave, Midtown',
    timestamp: '4 hours ago',
    bookingUrl: 'https://www.booking.com/hotel',
    locationCategory: 'hotel'
  },
  {
    id: '7',
    userId: 'user2',
    userName: 'Mike',
    userAvatar: 'photo-1507003211169-0a1dd7228f2d',
    isViewed: false,
    mediaUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=600&fit=crop',
    mediaType: 'image',
    locationId: '4',
    locationName: 'Neon Nights Bar',
    locationAddress: '789 Night St, Downtown',
    timestamp: '3 hours ago',
    bookingUrl: 'https://www.opentable.com/booking',
    locationCategory: 'bar'
  },
  {
    id: '3',
    userId: 'user3',
    userName: 'Emma',
    userAvatar: 'photo-1438761681033-6461ffad8d80',
    isViewed: false,
    mediaUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=600&fit=crop',
    mediaType: 'image',
    locationId: '5',
    locationName: 'Ocean Breeze Restaurant',
    locationAddress: '789 Coastal Rd, Seafront',
    timestamp: '6 hours ago',
    bookingUrl: 'https://www.opentable.com/r/ocean-breeze',
    locationCategory: 'restaurant'
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
  const [isLocationDetailOpen, setIsLocationDetailOpen] = useState(false);
  const [locationDetailPlace, setLocationDetailPlace] = useState<Place | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentCity, setCurrentCity] = useState('San Francisco');
  const [currentPlaces, setCurrentPlaces] = useState<Place[]>(defaultPlaces);
  const [mapCenter, setMapCenter] = useState({ lat: 37.7749, lng: -122.4194 });

  // Get the most popular location based on total engagement (likes + visitors)
  const getLocationOfTheWeek = () => {
    if (currentPlaces.length === 0) {
      return null;
    }
    
    return currentPlaces.reduce((topPlace, currentPlace) => {
      const currentEngagement = currentPlace.likes + currentPlace.visitors.length + (currentPlace.friendsWhoSaved?.length || 0);
      const topEngagement = topPlace.likes + topPlace.visitors.length + (topPlace.friendsWhoSaved?.length || 0);
      return currentEngagement > topEngagement ? currentPlace : topPlace;
    });
  };

  const getFilteredPlaces = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    switch (activeFilter) {
      case 'following':
        return currentPlaces.filter(place => place.isFollowing);
      case 'popular':
        return currentPlaces.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      case 'new':
        return currentPlaces.filter(place => {
          const addedDate = new Date(place.addedDate || '');
          return place.isFollowing && addedDate >= oneWeekAgo;
        });
      default:
        return currentPlaces;
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

  const handleCloseSelectedPlace = () => {
    console.log('Closing selected place card');
    setSelectedPlace(null);
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

  const handleShareSubmit = (friendIds: string[], place: Place) => {
    console.log('Sharing place:', place.name, 'with friends:', friendIds);
    // TODO: Implement actual sharing logic
  };

  const handleCommentSubmit = (text: string, place: Place) => {
    console.log('Adding comment:', text, 'to place:', place.name);
    // TODO: Implement actual comment submission logic
  };

  const handleCardClick = (place: Place) => {
    console.log('Place card clicked:', place.name);
    setLocationDetailPlace(place);
    setIsLocationDetailOpen(true);
  };

  const handleCitySearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const searchedCity = searchQuery.trim().toLowerCase();
      console.log('Searching for city:', searchedCity);
      
      const cityInfo = cityData[searchedCity];
      if (cityInfo) {
        setCurrentCity(searchQuery.trim());
        setCurrentPlaces(cityInfo.places);
        setMapCenter(cityInfo.coordinates);
        console.log(`Updated to ${searchedCity}:`, cityInfo.places.length, 'places found');
      } else {
        // If city not found, show a default set or empty
        console.log('City not found in database, using default places');
        setCurrentCity(searchQuery.trim());
        setCurrentPlaces([]);
      }
    }
  };

  const handleCitySelect = (cityName: string) => {
    const searchedCity = cityName.toLowerCase();
    console.log('City selected:', searchedCity);
    
    const cityInfo = cityData[searchedCity];
    if (cityInfo) {
      setCurrentCity(cityName);
      setCurrentPlaces(cityInfo.places);
      setMapCenter(cityInfo.coordinates);
      console.log(`Updated to ${cityName}:`, cityInfo.places.length, 'places found');
    } else {
      console.log('City not found in database, using default places');
      setCurrentCity(cityName);
      setCurrentPlaces([]);
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCitySearch(e);
    }
  };

  const filteredPlaces = getFilteredPlaces();
  const locationOfTheWeek = getLocationOfTheWeek();

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-blue-50/30 via-white to-purple-50/20">
      {/* Header */}
      <Header
        searchQuery={searchQuery}
        currentCity={currentCity}
        onSearchChange={setSearchQuery}
        onSearchKeyPress={handleSearchKeyPress}
        onNotificationsClick={() => setIsNotificationsModalOpen(true)}
        onMessagesClick={() => setIsMessagesModalOpen(true)}
        onCitySelect={handleCitySelect}
      />

      {/* Stories Section */}
      <div className="bg-white/60 backdrop-blur-sm px-6 py-2">
        <div className="overflow-x-auto">
          <StoriesSection 
            stories={stories}
            onCreateStory={handleCreateStory}
            onStoryClick={handleStoryClick}
          />
        </div>
      </div>

      {/* Location of the Week - Compact */}
      {locationOfTheWeek && (
        <LocationOfTheWeek 
          topLocation={locationOfTheWeek}
          onLocationClick={handleCardClick}
        />
      )}

      {/* Filter Buttons */}
      <FilterButtons
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        newCount={getFilteredPlaces().length}
      />

      {/* Map Section */}
      <div className="flex-1 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-white/20 via-transparent to-transparent pointer-events-none z-10"></div>
        <MapSection 
          places={filteredPlaces} 
          onPinClick={handlePinClick}
          mapCenter={mapCenter}
        />
      </div>

      {/* Selected Place Card */}
      {selectedPlace && (
        <div className="bg-white/95 backdrop-blur-lg p-6 mx-4 mb-4 rounded-3xl shadow-2xl shadow-black/10 border border-white/20 relative">
          <button
            onClick={handleCloseSelectedPlace}
            className="absolute top-4 right-4 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors z-10"
            aria-label="Close place details"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
          <PlaceCard
            place={selectedPlace}
            isLiked={likedPlaces.has(selectedPlace.id)}
            onCardClick={handleCardClick}
            onLikeToggle={handleLikeToggle}
            onShare={handleShare}
            onComment={handleComment}
            cityName={currentCity}
          />
        </div>
      )}

      {/* No places found message */}
      {currentPlaces.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="text-gray-500 text-lg mb-2">No places found</div>
            <div className="text-gray-400 text-sm">Try searching for Milan, Paris, or San Francisco</div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ModalsManager
        isCreateStoryModalOpen={isCreateStoryModalOpen}
        isNotificationsModalOpen={isNotificationsModalOpen}
        isMessagesModalOpen={isMessagesModalOpen}
        isShareModalOpen={isShareModalOpen}
        isCommentModalOpen={isCommentModalOpen}
        isLocationDetailOpen={isLocationDetailOpen}
        isStoriesViewerOpen={isStoriesViewerOpen}
        sharePlace={sharePlace}
        commentPlace={commentPlace}
        locationDetailPlace={locationDetailPlace}
        stories={stories}
        currentStoryIndex={currentStoryIndex}
        onCreateStoryModalClose={() => setIsCreateStoryModalOpen(false)}
        onNotificationsModalClose={() => setIsNotificationsModalOpen(false)}
        onMessagesModalClose={() => setIsMessagesModalOpen(false)}
        onShareModalClose={() => setIsShareModalOpen(false)}
        onCommentModalClose={() => setIsCommentModalOpen(false)}
        onLocationDetailClose={() => setIsLocationDetailOpen(false)}
        onStoriesViewerClose={() => setIsStoriesViewerOpen(false)}
        onStoryCreated={handleStoryCreated}
        onShare={handleShareSubmit}
        onCommentSubmit={handleCommentSubmit}
        onStoryViewed={handleStoryViewed}
      />
    </div>
  );
};

export default HomePage;
