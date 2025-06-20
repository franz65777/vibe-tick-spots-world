
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from './home/Header';
import StoriesSection from './home/StoriesSection';
import FilterButtons from './home/FilterButtons';
import PlaceCard from './home/PlaceCard';
import LocationOfTheWeek from './home/LocationOfTheWeek';
import MapSection from './home/MapSection';
import PlaceInteractionModal from './home/PlaceInteractionModal';
import CreateStoryModal from './CreateStoryModal';
import NotificationsModal from './NotificationsModal';
import MessagesModal from './MessagesModal';
import CategoryFilter, { CategoryType } from './explore/CategoryFilter';
import ExploreMap from './explore/ExploreMap';
import { useMapPins } from '@/hooks/useMapPins';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';
import { useStories } from '@/hooks/useStories';
import { usePlaceLikes } from '@/hooks/usePlaceLikes';
import { Place } from '@/types/place';
import { messageService } from '@/services/messageService';

interface HomeStory {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  isViewed: boolean;
  locationId: string;
  locationName: string;
  locationCategory?: string;
}

const demoStories: HomeStory[] = [
  {
    id: 'story1',
    userId: 'user1',
    userName: 'Alice',
    userAvatar: 'https://i.pravatar.cc/48?img=1',
    isViewed: false,
    locationId: '1',
    locationName: 'Cozy Coffee Shop',
    locationCategory: 'cafe'
  },
  {
    id: 'story2',
    userId: 'user2',
    userName: 'Bob',
    userAvatar: 'https://i.pravatar.cc/48?img=2',
    isViewed: false,
    locationId: '2',
    locationName: 'The Art Museum',
    locationCategory: 'museum'
  },
  {
    id: 'story3',
    userId: 'user3',
    userName: 'Charlie',
    userAvatar: 'https://i.pravatar.cc/48?img=3',
    isViewed: false,
    locationId: '3',
    locationName: 'Greenwood Park',
    locationCategory: 'park'
  },
];

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<'following' | 'popular' | 'new'>('following');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);
  const [isCreateStoryModalOpen, setIsCreateStoryModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [currentCity, setCurrentCity] = useState('San Francisco');
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 37.7749, lng: -122.4194 });
  
  const { pins, loading, error, refreshPins, hasFollowedUsers } = useMapPins(activeFilter);
  const { trackUserAction, trackPlaceInteraction } = useAnalytics();
  const { location, getCurrentLocation } = useGeolocation();
  const { savedPlaces, savePlace, unsavePlace, isPlaceSaved } = useSavedPlaces();
  const { refetch: refetchStories } = useStories();
  const { likedPlaces, toggleLike, isLiked } = usePlaceLikes();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  useEffect(() => {
    refreshPins(currentCity);
  }, [currentCity, refreshPins]);

  const handleFilterChange = (filter: 'following' | 'popular' | 'new') => {
    setActiveFilter(filter);
    trackUserAction('filter_change', { filter });
  };

  const handleCategoryChange = (category: CategoryType) => {
    setSelectedCategory(category);
    trackUserAction('category_filter_change', { category });
  };

  const handleCitySelect = (city: string) => {
    console.log('City selected:', city);
    setCurrentCity(city);
    // Update map center based on city
    const cityCoordinates: Record<string, { lat: number; lng: number }> = {
      'San Francisco': { lat: 37.7749, lng: -122.4194 },
      'Milan': { lat: 45.4642, lng: 9.1900 },
      'Paris': { lat: 48.8566, lng: 2.3522 },
      'New York': { lat: 40.7128, lng: -74.0060 },
      'London': { lat: 51.5074, lng: -0.1278 },
      'Tokyo': { lat: 35.6762, lng: 139.6503 },
      'Rome': { lat: 41.9028, lng: 12.4964 },
      'Barcelona': { lat: 41.3851, lng: 2.1734 },
      'Amsterdam': { lat: 52.3676, lng: 4.9041 },
      'Sydney': { lat: -33.8688, lng: 151.2093 },
      'Dublin': { lat: 53.3498, lng: -6.2603 }
    };
    
    const coordinates = cityCoordinates[city] || cityCoordinates['San Francisco'];
    setMapCenter(coordinates);
  };

  const handleCreateStory = () => {
    setIsCreateStoryModalOpen(true);
  };

  const handleStoryCreated = async () => {
    await refetchStories();
    setIsCreateStoryModalOpen(false);
  };

  const handleLikeToggle = async (placeId: string) => {
    const success = await toggleLike(placeId);
    if (success) {
      trackPlaceInteraction(placeId, 'like');
    }
  };

  const handleSaveToggle = (place: Place) => {
    const isSaved = isPlaceSaved(place.id);
    
    if (isSaved) {
      unsavePlace(place.id, currentCity);
    } else {
      savePlace({
        id: place.id,
        name: place.name,
        category: place.category,
        city: currentCity,
        coordinates: place.coordinates
      });
    }
    
    trackPlaceInteraction(place.id, 'save');
  };

  const handleComment = (place: Place) => {
    console.log('Comment on:', place);
    trackPlaceInteraction(place.id, 'comment');
  };

  const handleShare = (place: Place) => {
    console.log('Share:', place);
    trackPlaceInteraction(place.id, 'share');
  };

  const handleCardClick = (place: Place) => {
    setSelectedPlace(place);
    setIsInteractionModalOpen(true);
  };

  const handlePinClick = (pin: any) => {
    const place: Place = convertPinToPlace(pin);
    setSelectedPlace(place);
  };

  const handleNotificationsClick = () => {
    setIsNotificationsOpen(true);
  };

  const handleMessagesClick = () => {
    setIsMessagesOpen(true);
  };

  // Calculate distance between two coordinates in km
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  };

  // Convert pins to places for PlaceCard display with proper type handling
  const convertPinToPlace = (pin: any): Place => {
    // Calculate real distance from user location
    let distance: string = '0km';
    if (location && pin.coordinates) {
      const dist = calculateDistance(
        location.latitude,
        location.longitude,
        pin.coordinates.lat,
        pin.coordinates.lng
      );
      distance = `${dist.toFixed(1)}km`;
    }

    // Ensure visitors is always an array of strings
    let visitors: string[] = [];
    if (Array.isArray(pin.visitors)) {
      visitors = pin.visitors.map((v: any) => String(v));
    } else if (typeof pin.visitors === 'number') {
      visitors = Array.from({ length: pin.visitors }, (_, i) => `visitor_${i}`);
    }

    // Ensure friendsWhoSaved is properly handled - always convert to array format
    let friendsWhoSaved: { name: string; avatar: string }[] = [];
    if (Array.isArray(pin.friendsWhoSaved)) {
      friendsWhoSaved = pin.friendsWhoSaved;
    } else if (typeof pin.friendsWhoSaved === 'number') {
      // Convert number to array of mock friends
      friendsWhoSaved = Array.from({ length: Math.min(pin.friendsWhoSaved, 3) }, (_, i) => ({
        name: `Friend ${i + 1}`,
        avatar: `https://i.pravatar.cc/40?img=${i + 1}`
      }));
    }

    return {
      id: pin.id,
      name: pin.name,
      category: pin.category,
      likes: pin.likes || 0,
      friendsWhoSaved,
      visitors,
      isNew: pin.isNew || false,
      coordinates: pin.coordinates,
      image: pin.image,
      addedBy: pin.addedBy,
      addedDate: pin.addedDate,
      isFollowing: pin.isFollowing,
      popularity: pin.popularity,
      distance,
      totalSaves: pin.totalSaves || pin.likes || 0
    };
  };

  // Convert pins to places with proper type handling
  const convertedPlaces: Place[] = pins.map(pin => convertPinToPlace(pin));

  // Get top location for Location of the Week
  const getTopLocation = () => {
    if (pins.length === 0) return null;
    
    const sortedPins = [...pins].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    return sortedPins[0];
  };

  const topLocation = getTopLocation();
  const newCount = pins.filter(pin => pin.isNew).length;

  // Show message if no followed users for following filter
  const showNoFollowedUsersMessage = activeFilter === 'following' && !hasFollowedUsers;

  return (
    <div className="flex flex-col h-full bg-white">
      <Header 
        searchQuery={searchQuery}
        currentCity={currentCity}
        onSearchChange={setSearchQuery}
        onSearchKeyPress={() => {}}
        onNotificationsClick={handleNotificationsClick}
        onMessagesClick={handleMessagesClick}
        onCitySelect={handleCitySelect}
      />
      
      <StoriesSection 
        stories={demoStories}
        onCreateStory={handleCreateStory}
        onStoryClick={() => {}}
      />
      
      {/* Location of the Week */}
      {topLocation && (
        <LocationOfTheWeek 
          topLocation={topLocation}
          onLocationClick={() => {
            const place = convertPinToPlace(topLocation);
            handleCardClick(place);
          }}
        />
      )}

      <FilterButtons 
        activeFilter={activeFilter} 
        onFilterChange={handleFilterChange}
        newCount={newCount}
      />

      {/* Category filters */}
      <CategoryFilter
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
      />

      {/* No followed users message */}
      {showNoFollowedUsersMessage && (
        <div className="px-4 py-6 text-center">
          <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
            <div className="text-blue-600 text-lg font-semibold mb-2">
              Start following explorers!
            </div>
            <div className="text-blue-500 text-sm mb-4">
              Follow other users to see their favorite places and discoveries in your feed.
            </div>
            <button
              onClick={() => navigate('/explore')}
              className="bg-blue-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              Discover Users
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Map Section */}
      {!showNoFollowedUsersMessage && (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 relative">
            <ExploreMap
              pins={pins}
              activeFilter={activeFilter}
              selectedCategory={selectedCategory}
              onPinClick={handlePinClick}
              mapCenter={mapCenter}
            />
          </div>

          {/* Selected Place Card */}
          {selectedPlace && (
            <div className="px-4 pb-20">
              <PlaceCard
                place={selectedPlace}
                isLiked={isLiked(selectedPlace.id)}
                isSaved={isPlaceSaved(selectedPlace.id)}
                onCardClick={handleCardClick}
                onLikeToggle={handleLikeToggle}
                onSaveToggle={handleSaveToggle}
                onComment={handleComment}
                onShare={handleShare}
                cityName={currentCity}
                userLocation={location}
              />
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <CreateStoryModal
        isOpen={isCreateStoryModalOpen}
        onClose={() => setIsCreateStoryModalOpen(false)}
        onStoryCreated={handleStoryCreated}
      />

      {isInteractionModalOpen && selectedPlace && (
        <PlaceInteractionModal
          place={selectedPlace}
          mode="comments"
          isOpen={isInteractionModalOpen}
          onClose={() => setIsInteractionModalOpen(false)}
        />
      )}

      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      <MessagesModal
        isOpen={isMessagesOpen}
        onClose={() => setIsMessagesOpen(false)}
      />
    </div>
  );
};

export default HomePage;
