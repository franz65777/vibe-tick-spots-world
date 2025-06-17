
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from './home/Header';
import StoriesSection from './home/StoriesSection';
import FilterButtons from './home/FilterButtons';
import PlaceCard from './home/PlaceCard';
import LocationOfTheWeek from './home/LocationOfTheWeek';
import MapSection from './home/MapSection';
import ModalsManager from './home/ModalsManager';
import PlaceInteractionModal from './home/PlaceInteractionModal';
import { useMapPins } from '@/hooks/useMapPins';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Place } from '@/types/place';

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
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);
  const [likedPlaces, setLikedPlaces] = useState<Set<string>>(new Set());
  const [currentCity, setCurrentCity] = useState('San Francisco');
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 37.7749, lng: -122.4194 });
  
  const { pins, loading, error, refreshPins, hasFollowedUsers } = useMapPins(activeFilter);
  const { trackUserAction, trackPlaceInteraction } = useAnalytics();

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
      'Sydney': { lat: -33.8688, lng: 151.2093 }
    };
    
    const coordinates = cityCoordinates[city] || cityCoordinates['San Francisco'];
    setMapCenter(coordinates);
  };

  const handleLikeToggle = (placeId: string) => {
    const isCurrentlyLiked = likedPlaces.has(placeId);
    
    if (isCurrentlyLiked) {
      setLikedPlaces(prev => {
        const newSet = new Set(prev);
        newSet.delete(placeId);
        return newSet;
      });
    } else {
      setLikedPlaces(prev => new Set(prev).add(placeId));
    }
    
    trackPlaceInteraction(placeId, 'like');
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
    // Convert pin to Place format
    const place: Place = {
      id: pin.id,
      name: pin.name,
      category: pin.category,
      likes: pin.likes || 0,
      friendsWhoSaved: [],
      visitors: [],
      isNew: pin.isNew || false,
      coordinates: pin.coordinates,
      image: pin.image,
      addedBy: pin.addedBy,
      addedDate: pin.addedDate,
      isFollowing: pin.isFollowing,
      popularity: pin.popularity,
      distance: pin.distance,
      totalSaves: pin.likes || 0
    };
    handleCardClick(place);
  };

  // Convert pins to places for PlaceCard display
  const convertPinToPlace = (pin: any): Place => ({
    id: pin.id,
    name: pin.name,
    category: pin.category,
    likes: pin.likes || 0,
    friendsWhoSaved: [],
    visitors: [],
    isNew: pin.isNew || false,
    coordinates: pin.coordinates,
    image: pin.image,
    addedBy: pin.addedBy,
    addedDate: pin.addedDate,
    isFollowing: pin.isFollowing,
    popularity: pin.popularity,
    distance: pin.distance,
    totalSaves: pin.likes || 0
  });

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
        onNotificationsClick={() => {}}
        onMessagesClick={() => {}}
        onCitySelect={handleCitySelect}
      />
      
      <StoriesSection 
        stories={demoStories}
        onCreateStory={() => {}}
        onStoryClick={() => {}}
      />
      
      <FilterButtons 
        activeFilter={activeFilter} 
        onFilterChange={handleFilterChange}
        newCount={newCount}
      />

      {/* Location of the Week */}
      {topLocation && (
        <LocationOfTheWeek 
          topLocation={topLocation}
          onLocationClick={handleCardClick}
        />
      )}

      {/* Map Section */}
      <MapSection
        places={pins.map(convertPinToPlace)}
        onPinClick={handlePinClick}
        mapCenter={mapCenter}
        selectedPlace={selectedPlace}
        onCloseSelectedPlace={() => setSelectedPlace(null)}
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

      {/* Places Grid */}
      {!showNoFollowedUsersMessage && (
        <div className="flex-1 px-4 pb-20 space-y-4">
          {loading && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading places...</p>
            </div>
          )}
          
          {error && (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
            </div>
          )}
          
          {!loading && !error && pins.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-600">No places found for the selected filter.</p>
            </div>
          )}
          
          {!loading && !error && pins.map((pin) => (
            <PlaceCard
              key={pin.id}
              place={convertPinToPlace(pin)}
              isLiked={likedPlaces.has(pin.id)}
              onCardClick={handleCardClick}
              onLikeToggle={handleLikeToggle}
              onComment={handleComment}
              onShare={handleShare}
              cityName={currentCity}
            />
          ))}
        </div>
      )}

      {isInteractionModalOpen && selectedPlace && (
        <PlaceInteractionModal
          place={selectedPlace}
          mode="comments"
          isOpen={isInteractionModalOpen}
          onClose={() => setIsInteractionModalOpen(false)}
        />
      )}
    </div>
  );
};

export default HomePage;
