import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import MapSection from '@/components/home/MapSection';
import StoriesSection from '@/components/home/StoriesSection';
import PlaceCard from '@/components/home/PlaceCard';
import LocationOfTheWeek from '@/components/home/LocationOfTheWeek';
import Header from '@/components/home/Header';
import FilterButtons from '@/components/home/FilterButtons';
import ModalsManager from '@/components/home/ModalsManager';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useMapPins } from '@/hooks/useMapPins';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [currentCity, setCurrentCity] = useState('San Francisco');

  // Use the new hooks
  const { location } = useGeolocation();
  const { pins, loading: pinsLoading, refreshPins } = useMapPins(activeFilter);

  // Update current city when geolocation changes
  useEffect(() => {
    if (location?.city) {
      setCurrentCity(location.city);
    }
  }, [location?.city]);

  // Refresh pins when city or filter changes
  useEffect(() => {
    refreshPins();
  }, [currentCity, activeFilter, refreshPins]);

  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [likedPlaces, setLikedPlaces] = useState<Set<string>>(new Set());
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [sharePlace, setSharePlace] = useState<Place | null>(null);
  const [commentPlace, setCommentPlace] = useState<Place | null>(null);
  const [isLocationDetailOpen, setIsLocationDetailOpen] = useState(false);
  const [locationDetailPlace, setLocationDetailPlace] = useState<Place | null>(null);

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
      } else {
        // If city not found, show a default set or empty
        console.log('City not found in database, using default places');
        setCurrentCity(searchQuery.trim());
      }
    }
  };

  const handleCitySelect = (cityName: string) => {
    console.log('City selected:', cityName);
    setCurrentCity(cityName);
    
    // Update map center based on city
    const cityCoordinates: Record<string, { lat: number; lng: number }> = {
      'san francisco': { lat: 37.7749, lng: -122.4194 },
      'milan': { lat: 45.4642, lng: 9.1900 },
      'paris': { lat: 48.8566, lng: 2.3522 },
      'new york': { lat: 40.7128, lng: -74.0060 },
      'london': { lat: 51.5074, lng: -0.1278 },
      'tokyo': { lat: 35.6762, lng: 139.6503 },
      'rome': { lat: 41.9028, lng: 12.4964 },
      'barcelona': { lat: 41.3851, lng: 2.1734 },
      'amsterdam': { lat: 52.3676, lng: 4.9041 },
      'sydney': { lat: -33.8688, lng: 151.2093 }
    };

    const coords = cityCoordinates[cityName.toLowerCase()] || { lat: 37.7749, lng: -122.4194 };
    setMapCenter(coords);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCitySearch(e);
    }
  };

  // Calculate map center based on geolocation or selected city
  const currentMapCenter = location?.latitude && location?.longitude 
    ? { lat: location.latitude, lng: location.longitude }
    : cityData[currentCity.toLowerCase()]?.coordinates || { lat: 37.7749, lng: -122.4194 };

  // Get the most popular location from pins
  const getLocationOfTheWeek = () => {
    if (pins.length === 0) return null;
    
    return pins.reduce((topPin, currentPin) => {
      const currentEngagement = currentPin.likes + (currentPin.popularity || 0);
      const topEngagement = topPin.likes + (topPin.popularity || 0);
      return currentEngagement > topEngagement ? currentPin : topPin;
    });
  };

  const locationOfTheWeek = getLocationOfTheWeek();

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-blue-50/30 via-white to-purple-50/20 pt-16">
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
      <div className="bg-white/60 backdrop-blur-sm px-4 py-3 sm:px-6 sm:py-2">
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
          topLocation={{
            id: locationOfTheWeek.id,
            name: locationOfTheWeek.name,
            category: locationOfTheWeek.category,
            likes: locationOfTheWeek.likes,
            visitors: [],
            isNew: false,
            coordinates: locationOfTheWeek.coordinates,
            popularity: locationOfTheWeek.popularity
          }}
          onLocationClick={handleCardClick}
        />
      )}

      {/* Filter Buttons */}
      <FilterButtons
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        newCount={pins.length}
      />

      {/* Map Section */}
      <div className="flex-1 relative mb-20">
        <div className="absolute inset-0 bg-gradient-to-t from-white/20 via-transparent to-transparent pointer-events-none z-10"></div>
        <MapSection 
          places={pins.map(pin => ({
            id: pin.id,
            name: pin.name,
            category: pin.category,
            coordinates: pin.coordinates,
            visitors: []
          }))}
          onPinClick={(place) => handlePinClick({
            ...place,
            likes: pins.find(p => p.id === place.id)?.likes || 0,
            isNew: false,
            popularity: pins.find(p => p.id === place.id)?.popularity
          })}
          mapCenter={currentMapCenter}
        />
        
        {pinsLoading && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/90 px-3 py-2 rounded-full shadow-lg z-20">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              Loading {activeFilter} pins...
            </div>
          </div>
        )}
      </div>

      {/* Selected Place Card */}
      {selectedPlace && (
        <div className="bg-white/95 backdrop-blur-lg p-6 sm:p-5 mx-4 mb-20 rounded-3xl shadow-2xl shadow-black/10 border border-white/20 relative">
          <button
            onClick={handleCloseSelectedPlace}
            className="absolute top-4 right-4 w-12 h-12 sm:w-10 sm:h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors z-10"
            aria-label="Close place details"
          >
            <X className="w-6 h-6 sm:w-5 sm:h-5 text-gray-600" />
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
      {pins.length === 0 && !pinsLoading && (
        <div className="flex-1 flex items-center justify-center p-6 pb-24">
          <div className="text-center">
            <div className="text-gray-500 text-lg mb-2">No {activeFilter} places found</div>
            <div className="text-gray-400 text-sm">
              {activeFilter === 'following' 
                ? 'Follow some users to see their places' 
                : `Try switching to ${activeFilter === 'popular' ? 'following' : 'popular'} places`}
            </div>
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
