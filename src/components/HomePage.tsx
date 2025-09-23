
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from './home/Header';
import StoriesSection from './home/StoriesSection';
import MapSection from './home/MapSection';
import ModalsManager from './home/ModalsManager';
import CommunityHighlights from './home/CommunityHighlights';
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
  
  console.log('HomePage - initializing home screen');

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

  const handleCityChange = (city: string, coords?: { lat: number; lng: number }) => {
    console.log('HomePage - City changed to:', city, coords);
    setCurrentCity(city);

    if (coords) {
      const newCenter = { lat: coords.lat, lng: coords.lng };
      setMapCenter(newCenter);
      console.log('Map center updated from external geo:', newCenter);
    } else {
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
        'berlin': { lat: 52.5200, lng: 13.4050 },
        'madrid': { lat: 40.4168, lng: -3.7038 },
        'lisbon': { lat: 38.7223, lng: -9.1393 },
        'munich': { lat: 48.1351, lng: 11.5820 },
        'vienna': { lat: 48.2082, lng: 16.3738 },
        'zurich': { lat: 47.3769, lng: 8.5417 },
        'dublin': { lat: 53.3498, lng: -6.2603 },
        'stockholm': { lat: 59.3293, lng: 18.0686 },
        'copenhagen': { lat: 55.6761, lng: 12.5683 },
        'prague': { lat: 50.755, lng: 14.4378 },
        'budapest': { lat: 47.4979, lng: 19.0402 },
        'warsaw': { lat: 52.2297, lng: 21.0122 },
        'athens': { lat: 37.9838, lng: 23.7275 }
      };
      const cityKey = city.toLowerCase();
      if (cityCoordinates[cityKey]) {
        const newCenter = cityCoordinates[cityKey];
        setMapCenter(newCenter);
        console.log('Map center updated from predefined list:', newCenter);
      } else if (userLocation) {
        setMapCenter(userLocation);
      }
    }

  };

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
    <div className="h-screen w-full overflow-hidden bg-gradient-to-br from-background via-background to-accent/10 flex flex-col">
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

      <main className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0">
          <MapSection
            mapCenter={mapCenter}
            currentCity={currentCity}
          />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 px-4 pb-6 space-y-4">
          <div className="pointer-events-auto rounded-3xl bg-white/90 backdrop-blur-xl shadow-xl border border-white/40">
            <div className="px-4 pt-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-800">Stories</h2>
                <button
                  onClick={() => setIsCreateStoryModalOpen(true)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Create
                </button>
              </div>
            </div>
            <div className="overflow-x-auto scrollbar-hide px-2 pb-3 pt-2">
              <StoriesSection
                stories={stories}
                onCreateStory={() => setIsCreateStoryModalOpen(true)}
                onStoryClick={(index) => {
                  setCurrentStoryIndex(index);
                  setIsStoriesViewerOpen(true);
                }}
              />
            </div>
          </div>

          <div className="pointer-events-auto rounded-3xl bg-white/90 backdrop-blur-xl shadow-xl border border-white/40">
            <CommunityHighlights
              currentCity={currentCity}
              userLocation={userLocation}
              onLocationClick={(locationId: string, coordinates?: { lat: number; lng: number }) => {
                if (coordinates) {
                  setMapCenter(coordinates);
                }
                navigate('/explore');
              }}
              onUserClick={(userId: string) => {
                navigate('/explore');
              }}
              onMapLocationClick={(coords: { lat: number; lng: number }) => setMapCenter(coords)}
            />
          </div>
        </div>
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
        onShareModalClose={() => {
          setIsShareModalOpen(false);
          setSharePlace(null);
        }}
        onCommentModalClose={() => {
          setIsCommentModalOpen(false);
          setCommentPlace(null);
        }}
        onLocationDetailClose={() => {
          setIsLocationDetailOpen(false);
          setLocationDetailPlace(null);
        }}
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
