import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Place } from '@/types/place';

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
        addedBy: {
          name: 'Alex Johnson',
          avatar: 'photo-1472099645785-5658abf4ff4e',
          isFollowing: true
        },
        addedDate: '2024-05-25',
        isFollowing: true,
        popularity: 85,
        totalSaves: 12
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
        addedBy: {
          name: 'Sarah Chen',
          avatar: 'photo-1494790108755-2616b5a5c75b',
          isFollowing: true
        },
        addedDate: '2024-06-01',
        isFollowing: true,
        popularity: 92,
        totalSaves: 8
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
        addedBy: {
          name: 'Mike Rodriguez',
          avatar: 'photo-1507003211169-0a1dd7228f2d',
          isFollowing: false
        },
        addedDate: '2024-05-15',
        isFollowing: false,
        popularity: 96,
        totalSaves: 23
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
        addedBy: {
          name: 'Isabella Romano',
          avatar: 'photo-1487412720507-e7ab37603c6f',
          isFollowing: true
        },
        addedDate: '2024-05-28',
        isFollowing: true,
        popularity: 88,
        totalSaves: 15
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
        addedBy: {
          name: 'Giuseppe Milano',
          avatar: 'photo-1552058544-f2b08422138a',
          isFollowing: true
        },
        addedDate: '2024-05-20',
        isFollowing: true,
        popularity: 94,
        totalSaves: 28
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
        addedBy: {
          name: 'Lorenzo Venetian',
          avatar: 'photo-1500648767791-00dcc994a43e',
          isFollowing: true
        },
        addedDate: '2024-06-01',
        isFollowing: true,
        popularity: 82,
        totalSaves: 11
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
        addedBy: {
          name: 'Francesca Milano',
          avatar: 'photo-1438761681033-6461ffad8d80',
          isFollowing: false
        },
        addedDate: '2024-05-10',
        isFollowing: false,
        popularity: 96,
        totalSaves: 45
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
        addedBy: {
          name: 'Pierre Dubois',
          avatar: 'photo-1507003211169-0a1dd7228f2d',
          isFollowing: true
        },
        addedDate: '2024-05-15',
        isFollowing: true,
        popularity: 91,
        totalSaves: 34
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
        addedBy: {
          name: 'Marie Dubois',
          avatar: 'photo-1494790108755-2616b5a5c75b',
          isFollowing: true
        },
        addedDate: '2024-05-30',
        isFollowing: true,
        popularity: 98,
        totalSaves: 67
      }
    ]
  }
};

// Default to San Francisco places
const defaultPlaces = cityData['san francisco'].places;

// Enhanced demo stories with more social interactions
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
  const { pins, loading: pinsLoading, refreshPins, hasFollowedUsers } = useMapPins(activeFilter);

  // Update current city when geolocation changes
  useEffect(() => {
    if (location?.city) {
      setCurrentCity(location.city);
    }
  }, [location?.city]);

  // Refresh pins when city or filter changes
  useEffect(() => {
    refreshPins(currentCity);
  }, [currentCity, refreshPins]);

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

  // Convert MapPin to Place with proper defaults
  const convertMapPinToPlace = (pin: any): Place => ({
    id: pin.id,
    name: pin.name,
    category: pin.category,
    likes: pin.likes,
    friendsWhoSaved: generateMockFriendsWhoSaved(),
    visitors: [],
    isNew: pin.isNew || false,
    coordinates: pin.coordinates,
    image: pin.image || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
    addedDate: '2024-06-01',
    isFollowing: false,
    popularity: pin.popularity,
    totalSaves: pin.likes || 0
  });

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
    console.log('Place card clicked:', place.name, '- opening location detail');
    setLocationDetailPlace(place);
    setIsLocationDetailOpen(true);
  };

  const handleCitySearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setCurrentCity(searchQuery.trim());
    }
  };

  const handleCitySelect = (cityName: string) => {
    console.log('City selected:', cityName);
    setCurrentCity(cityName);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCitySearch(e);
    }
  };

  const currentMapCenter = useMemo(() => {
    if (location?.latitude && location?.longitude && location.city === currentCity) {
      return { lat: location.latitude, lng: location.longitude };
    }
    return cityData[currentCity.toLowerCase()]?.coordinates || { lat: 37.7749, lng: -122.4194 };
  }, [location?.latitude, location?.longitude, location?.city, currentCity]);

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

  // Check if we should show the empty state message
  const shouldShowEmptyFollowingMessage = () => {
    return (activeFilter === 'following' || activeFilter === 'new') && 
           !hasFollowedUsers && 
           !pinsLoading;
  };

  // Helper function to get saves count
  const getSavesCount = (place: Place) => {
    if (place.totalSaves) return place.totalSaves;
    if (typeof place.friendsWhoSaved === 'number') return place.friendsWhoSaved;
    return Array.isArray(place.friendsWhoSaved) ? place.friendsWhoSaved.length : 0;
  };

  // Helper function to ensure visitors is always an array for display
  const getVisitorsArray = (visitors: string[] | number): string[] => {
    if (typeof visitors === 'number') return [];
    return visitors;
  };

  // Helper function to ensure friendsWhoSaved is always an array for display
  const getFriendsWhoSavedArray = (friendsWhoSaved?: { name: string; avatar: string }[] | number): { name: string; avatar: string }[] => {
    if (!friendsWhoSaved || typeof friendsWhoSaved === 'number') return [];
    return friendsWhoSaved;
  };

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
          topLocation={convertMapPinToPlace(locationOfTheWeek)}
          onLocationClick={handleCardClick}
        />
      )}

      {/* Filter Buttons */}
      <FilterButtons
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        newCount={pins.length}
      />

      {/* Empty Following State Message */}
      {shouldShowEmptyFollowingMessage() && (
        <div className="flex-1 flex items-center justify-center p-6 pb-24">
          <div className="text-center max-w-sm mx-auto">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Start Following Others</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Start following others to see where your friends go or save locations to begin curating your map.
            </p>
            <button
              onClick={() => setActiveFilter('popular')}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Explore Popular Places
            </button>
          </div>
        </div>
      )}

      {/* Map Section - Only show if not in empty following state */}
      {!shouldShowEmptyFollowingMessage() && (
        <div className="relative">
          <MapSection 
            places={pins.map(pin => convertMapPinToPlace(pin))}
            onPinClick={handlePinClick}
            mapCenter={currentMapCenter}
            selectedPlace={selectedPlace}
            onCloseSelectedPlace={handleCloseSelectedPlace}
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
      )}

      {/* Enhanced Selected Place Card - Show below map */}
      {selectedPlace && (
        <div className="mx-4 mb-20">
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

      {/* No places found message - Only for popular filter */}
      {pins.length === 0 && !pinsLoading && activeFilter === 'popular' && (
        <div className="flex-1 flex items-center justify-center p-6 pb-24">
          <div className="text-center">
            <div className="text-gray-500 text-lg mb-2">No popular places found</div>
            <div className="text-gray-400 text-sm">
              Try switching to a different city or check back later
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

// Helper function to generate mock friends data
const generateMockFriendsWhoSaved = () => {
  const mockFriends = [
    { name: 'Sarah', avatar: 'photo-1494790108755-2616b5a5c75b' },
    { name: 'Mike', avatar: 'photo-1507003211169-0a1dd7228f2d' },
    { name: 'Emma', avatar: 'photo-1438761681033-6461ffad8d80' },
    { name: 'Alex', avatar: 'photo-1472099645785-5658abf4ff4e' },
  ];
  
  const count = Math.floor(Math.random() * 3) + 1;
  return mockFriends.slice(0, count);
};

export default HomePage;
