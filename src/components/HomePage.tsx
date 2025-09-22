
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMapPins } from '@/hooks/useMapPins';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';
import { Place } from '@/types/place';
import Header from './home/Header';
import StoriesSection from './home/StoriesSection';
import FilterButtons from './home/FilterButtons';
import MapSection from './home/MapSection';
import ModalsManager from './home/ModalsManager';
import LocationOfTheWeek from './home/LocationOfTheWeek';
import { loadGoogleMapsAPI, isGoogleMapsLoaded } from '@/lib/googleMaps';

// Local interface for modal components that expect simpler Place structure
interface LocalPlace {
  id: string;
  name: string;
  category: string;
  coordinates: { lat: number; lng: number };
  likes: number;
  isFollowing?: boolean;
  addedBy?: string;
  addedDate?: string;
  popularity?: number;
  city?: string;
  isNew: boolean;
  image?: string;
  friendsWhoSaved?: { name: string; avatar: string }[];
  visitors: string[];
  distance?: string | number;
  totalSaves?: number;
  address?: string;
}

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedCity, setSelectedCity] = useState('');
  const [activeFilter, setActiveFilter] = useState<'following' | 'popular' | 'saved'>('popular');
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
  const [sharePlace, setSharePlace] = useState<LocalPlace | null>(null);
  const [commentPlace, setCommentPlace] = useState<LocalPlace | null>(null);
  const [locationDetailPlace, setLocationDetailPlace] = useState<LocalPlace | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [currentCity, setCurrentCity] = useState('');
  
  // Use the map pins hook with the active filter 
  const { pins, loading, error, refreshPins, hasFollowedUsers } = useMapPins(activeFilter);
  const { savedPlaces } = useSavedPlaces();

  console.log('HomePage - pins:', pins, 'loading:', loading, 'error:', error);

  // Get user's current location on component mount
  useEffect(() => {
    const getCurrentLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const location = { lat: latitude, lng: longitude };
            setUserLocation(location);
            setMapCenter(location);
            console.log('User location obtained:', location);
          },
          (error) => {
            console.warn('Error getting user location:', error);
            const defaultLocation = { lat: 37.7749, lng: -122.4194 };
            setMapCenter(defaultLocation);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
          }
        );
      } else {
        console.warn('Geolocation is not supported by this browser');
        const defaultLocation = { lat: 37.7749, lng: -122.4194 };
        setMapCenter(defaultLocation);
      }
    };

    getCurrentLocation();
  }, []);

  // Derive city name from geolocation via Google Geocoder
  useEffect(() => {
    const setCityFromLocation = async () => {
      if (!userLocation) return;
      try {
        await loadGoogleMapsAPI();
        if (!(isGoogleMapsLoaded() && (window as any).google?.maps?.Geocoder)) return;
        const geocoder = new (window as any).google.maps.Geocoder();
        geocoder.geocode({ location: userLocation }, (results: any, status: any) => {
          if (status === 'OK' && results?.[0]) {
            const comps = results[0].address_components || [];
            const cityComp = comps.find((c: any) => c.types.includes('locality'))
              || comps.find((c: any) => c.types.includes('postal_town'))
              || comps.find((c: any) => c.types.includes('administrative_area_level_1'));
            const cityName = cityComp?.long_name || '';
            if (cityName) setCurrentCity(cityName);
          }
        });
      } catch (e) {
        console.warn('Reverse geocoding failed', e);
      }
    };
    setCityFromLocation();
  }, [userLocation]);

  // Helper function to safely extract addedBy string
  const getAddedByName = (addedBy: any): string => {
    if (typeof addedBy === 'string') {
      return addedBy;
    }
    if (addedBy && typeof addedBy === 'object' && addedBy.name) {
      return addedBy.name;
    }
    return 'unknown';
  };

  // Convert saved places or map pins to Place format for the map
  const places: Place[] = activeFilter === 'saved' 
    ? Object.values(savedPlaces).flat().map(savedPlace => ({
        id: savedPlace.id,
        name: savedPlace.name,
        category: savedPlace.category,
        coordinates: savedPlace.coordinates,
        likes: 0,
        isFollowing: false,
        addedBy: 'You',
        addedDate: savedPlace.savedAt,
        popularity: 50,
        city: savedPlace.city,
        isNew: false,
        image: undefined,
        friendsWhoSaved: [],
        visitors: [],
        distance: 0,
        totalSaves: 1,
        address: ''
      }))
    : pins.map(pin => ({
        id: pin.id,
        name: pin.name,
        category: pin.category,
        coordinates: pin.coordinates,
        likes: pin.likes || 0,
        isFollowing: pin.isFollowing || false,
        addedBy: getAddedByName(pin.addedBy),
        addedDate: pin.addedDate,
        popularity: pin.popularity || 0,
        city: pin.city,
        isNew: pin.isNew || false,
        image: pin.image,
        friendsWhoSaved: Array.isArray(pin.friendsWhoSaved) ? pin.friendsWhoSaved : [],
        visitors: Array.isArray(pin.visitors) ? pin.visitors : [],
        distance: pin.distance || 0,
        totalSaves: pin.totalSaves || 0,
        address: pin.address || ''
      }));

  console.log('HomePage - converted places:', places);

  const getTopLocation = () => {
    if (places.length === 0) return null;
    
    const sortedPlaces = [...places].sort((a, b) => {
      const aScore = (a.popularity || 0) + (a.likes || 0) + (a.totalSaves || 0);
      const bScore = (b.popularity || 0) + (b.likes || 0) + (b.totalSaves || 0);
      return bScore - aScore;
    });
    
    return sortedPlaces[0];
  };

  const handleFilterChange = (filter: 'following' | 'popular' | 'saved') => {
    console.log('HomePage - Filter changed to:', filter);
    setActiveFilter(filter);
  };

  const handleCityChange = (city: string) => {
    console.log('HomePage - City changed to:', city);
    setSelectedCity(city);
    setCurrentCity(city);
    refreshPins(city);
    
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
      setMapCenter(userLocation);
    }
  };

  const handlePinClick = (place: Place) => {
    console.log('HomePage - Pin clicked:', place.name);
    setSelectedPlace(place);
  };

  const handleCloseSelectedPlace = () => {
    setSelectedPlace(null);
  };

  const handleLocationOfTheWeekClick = (place: Place) => {
    const localPlace = convertToLocalPlace(place);
    setLocationDetailPlace(localPlace);
    setIsLocationDetailOpen(true);
  };

  const convertToLocalPlace = (place: Place): LocalPlace => ({
    id: place.id,
    name: place.name,
    category: place.category,
    coordinates: place.coordinates,
    likes: place.likes,
    isFollowing: place.isFollowing,
    addedBy: getAddedByName(place.addedBy),
    addedDate: place.addedDate,
    popularity: place.popularity,
    city: place.city,
    isNew: place.isNew,
    image: place.image,
    friendsWhoSaved: Array.isArray(place.friendsWhoSaved) ? place.friendsWhoSaved : [],
    visitors: place.visitors,
    distance: place.distance,
    totalSaves: place.totalSaves,
    address: place.address
  });

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

  const topLocation = getTopLocation();

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
        onCitySelect={handleCityChange}
      />
      
      <main className="flex-1 flex flex-col max-w-7xl mx-auto w-full">
        <div className="bg-white border-b border-gray-100 px-4 py-3">
          <StoriesSection 
            stories={stories}
            onCreateStory={() => setIsCreateStoryModalOpen(true)}
            onStoryClick={(index) => {
              setCurrentStoryIndex(index);
              setIsStoriesViewerOpen(true);
            }}
          />
        </div>
        
        <LocationOfTheWeek 
          onLocationClick={handleLocationOfTheWeekClick}
        />
        
        <FilterButtons 
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
          onCityChange={handleCityChange}
          hasFollowedUsers={hasFollowedUsers}
        />
        
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-500">Loading amazing places...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-8">
              <p className="text-red-500 mb-4">Error loading places: {error}</p>
              <button 
                onClick={() => refreshPins()} 
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <MapSection 
            places={places}
            onPinClick={handlePinClick}
            mapCenter={mapCenter}
            selectedPlace={selectedPlace}
            onCloseSelectedPlace={handleCloseSelectedPlace}
          />
        )}
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
