
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMapPins } from '@/hooks/useMapPins';
import { Place } from '@/types/place';
import Header from './home/Header';
import StoriesSection from './home/StoriesSection';
import FilterButtons from './home/FilterButtons';
import MapSection from './home/MapSection';
import ModalsManager from './home/ModalsManager';

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedCity, setSelectedCity] = useState('');
  const [activeFilter, setActiveFilter] = useState<'following' | 'popular' | 'new'>('following');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 37.7749, lng: -122.4194 });
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // Modal states
  const [isCreateStoryModalOpen, setIsCreateStoryModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isMessagesModalOpen, setIsMessagesModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [isLocationDetailOpen, setIsLocationDetailOpen] = useState(false);
  const [isStoriesViewerOpen, setIsStoriesViewerOpen] = useState(false);
  const [sharePlace, setSharePlace] = useState<Place | null>(null);
  const [commentPlace, setCommentPlace] = useState<Place | null>(null);
  const [locationDetailPlace, setLocationDetailPlace] = useState<Place | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [currentCity, setCurrentCity] = useState('');
  
  // Use the map pins hook with the active filter
  const { pins, loading, error, refreshPins, hasFollowedUsers } = useMapPins(activeFilter);

  // Get user's current location on component mount
  useEffect(() => {
    const getCurrentLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const location = { lat: latitude, lng: longitude };
            setUserLocation(location);
            setMapCenter(location); // Center map on user's location
            console.log('User location obtained:', location);
          },
          (error) => {
            console.warn('Error getting user location:', error);
            // Keep default San Francisco coordinates if geolocation fails
            const defaultLocation = { lat: 37.7749, lng: -122.4194 };
            setMapCenter(defaultLocation);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          }
        );
      } else {
        console.warn('Geolocation is not supported by this browser');
        // Keep default San Francisco coordinates
        const defaultLocation = { lat: 37.7749, lng: -122.4194 };
        setMapCenter(defaultLocation);
      }
    };

    getCurrentLocation();
  }, []);

  // Convert map pins to Place format for the map
  const places: Place[] = pins.map(pin => ({
    id: pin.id,
    name: pin.name,
    category: pin.category,
    coordinates: pin.coordinates,
    likes: pin.likes,
    isFollowing: pin.isFollowing,
    addedBy: pin.addedBy,
    addedDate: pin.addedDate,
    popularity: pin.popularity,
    city: pin.city,
    isNew: pin.isNew,
    image: pin.image,
    friendsWhoSaved: Array.isArray(pin.friendsWhoSaved) ? pin.friendsWhoSaved : [],
    visitors: pin.visitors,
    distance: pin.distance,
    totalSaves: pin.totalSaves,
    address: pin.address || ''
  }));

  const handleFilterChange = (filter: 'following' | 'popular' | 'new') => {
    setActiveFilter(filter);
  };

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    setCurrentCity(city);
    refreshPins(city);
    
    // Update map center based on selected city
    const cityCoordinates: Record<string, { lat: number; lng: number }> = {
      'san francisco': { lat: 37.7749, lng: -122.4194 },
      'milan': { lat: 45.4642, lng: 9.1900 },
      'paris': { lat: 48.8566, lng: 2.3522 },
      'new york': { lat: 40.7128, lng: -74.0060 },
      'london': { lat: 51.5074, lng: -0.1278 },
      'tokyo': { lat: 35.6762, lng: 139.6503 }
    };
    
    const cityKey = city.toLowerCase();
    if (cityCoordinates[cityKey]) {
      setMapCenter(cityCoordinates[cityKey]);
    } else if (userLocation) {
      // If unknown city, use user's location
      setMapCenter(userLocation);
    }
  };

  const handlePinClick = (place: Place) => {
    setSelectedPlace(place);
  };

  const handleCloseSelectedPlace = () => {
    setSelectedPlace(null);
  };

  // Mock stories data
  const stories = [
    {
      id: '1',
      userId: 'user1',
      userName: 'John Doe',
      userAvatar: '',
      isViewed: false,
      mediaUrl: '/placeholder.svg',
      mediaType: 'image' as const,
      locationId: 'loc1',
      locationName: 'Sample Location',
      locationAddress: 'Sample Address',
      timestamp: new Date().toISOString(),
    }
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome!</h2>
          <p className="text-gray-600 mb-4">Please sign in to explore amazing places</p>
          <button 
            onClick={() => navigate('/auth')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header 
        searchQuery={searchQuery}
        currentCity={currentCity}
        onSearchChange={setSearchQuery}
        onSearchKeyPress={() => {}}
        onNotificationsClick={() => setIsNotificationsModalOpen(true)}
        onMessagesClick={() => setIsMessagesModalOpen(true)}
        onCreateStoryClick={() => setIsCreateStoryModalOpen(true)}
      />
      
      <main className="flex-1 flex flex-col max-w-7xl mx-auto w-full">
        <StoriesSection stories={stories} />
        
        <FilterButtons 
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
          onCityChange={handleCityChange}
          hasFollowedUsers={hasFollowedUsers}
        />
        
        <MapSection 
          places={places}
          onPinClick={handlePinClick}
          mapCenter={mapCenter}
          selectedPlace={selectedPlace}
          onCloseSelectedPlace={handleCloseSelectedPlace}
        />
      </main>

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
        onStoryCreated={() => {}}
        onShare={() => {}}
        onCommentSubmit={() => {}}
        onStoryViewed={() => {}}
      />
    </div>
  );
};

export default HomePage;
