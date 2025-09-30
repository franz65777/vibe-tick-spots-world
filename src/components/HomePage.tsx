
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { MapFilterProvider } from '@/contexts/MapFilterContext';
import { Place } from '@/types/place';
import { Crown, Heart, MapPin } from 'lucide-react';
import Header from './home/Header';
import StoriesSection from './home/StoriesSection';
import MapSection from './home/MapSection';
import ModalsManager from './home/ModalsManager';
import CommunityHighlights from './home/CommunityHighlights';
import { loadGoogleMapsAPI, isGoogleMapsLoaded } from '@/lib/googleMaps';
import { supabase } from '@/integrations/supabase/client';

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
    setSelectedCity(city);
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

  const handlePinClick = (place: Place) => {
    console.log('HomePage - Pin clicked:', place.name);
    setSelectedPlace(place);
  };

  const handleCloseSelectedPlace = () => {
    setSelectedPlace(null);
  };

  const handleLocationOfTheWeekClick = (place: Place) => {
    const localPlace: LocalPlace = {
      id: place.id,
      name: place.name,
      category: place.category,
      coordinates: place.coordinates,
      likes: place.likes,
      isFollowing: place.isFollowing,
      addedBy: typeof place.addedBy === 'string' ? place.addedBy : 'unknown',
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
    };
    setLocationDetailPlace(localPlace);
    setIsLocationDetailOpen(true);
  };

  const [stories, setStories] = useState<any[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(true);

  // Fetch stories from followed users
  useEffect(() => {
    const fetchFollowedStories = async () => {
      if (!user) return;

      try {
        setStoriesLoading(true);

        // Get list of users current user is following
        const { data: followData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);

        const followingIds = followData?.map(f => f.following_id) || [];

        if (followingIds.length === 0) {
          setStories([]);
          return;
        }

        // Fetch stories from followed users (not expired)
        const { data: storiesData, error } = await supabase
          .from('stories')
          .select(`
            id,
            user_id,
            media_url,
            media_type,
            caption,
            location_name,
            location_address,
            created_at
          `)
          .in('user_id', followingIds)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Fetch profile data separately for each user
        const userIds = [...new Set(storiesData?.map(s => s.user_id) || [])];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

        // Transform stories to expected format
        const formattedStories = storiesData?.map(story => {
          const profile = profilesMap.get(story.user_id);
          return {
            id: story.id,
            userId: story.user_id,
            userName: profile?.username || 'User',
            userAvatar: profile?.avatar_url || '',
            isViewed: false,
            mediaUrl: story.media_url,
            mediaType: story.media_type,
            locationId: null,
            locationName: story.location_name,
            locationAddress: story.location_address,
            timestamp: story.created_at,
          };
        }) || [];

        setStories(formattedStories);
      } catch (error) {
        console.error('Error fetching followed stories:', error);
        setStories([]);
      } finally {
        setStoriesLoading(false);
      }
    };

    fetchFollowedStories();
  }, [user]);

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
    <MapFilterProvider>
      <div className="h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex flex-col overflow-hidden">
        {/* Fixed Header - ~60px */}
        <div className="flex-shrink-0 h-[60px]">
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
      </div>
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Stories Section - Fixed ~130px */}
        <div className="flex-shrink-0 h-[130px] px-4 pt-3 pb-2">
          <div className="h-full bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 px-4 py-3 overflow-hidden">
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
        
        {/* Community Highlights Section - Fixed ~120px */}
        <div className="flex-shrink-0 h-[120px] px-4 py-2">
          <div className="h-full bg-white/90 backdrop-blur-sm rounded-2xl shadow-md border border-white/50 py-3 overflow-hidden">
            <CommunityHighlights
              currentCity={currentCity}
              userLocation={userLocation}
              onLocationClick={(locationId: string, coordinates?: { lat: number; lng: number }) => {
                if (coordinates) {
                  setMapCenter(coordinates);
                }
              }}
              onUserClick={(userId: string) => {
                navigate('/explore');
              }}
              onMapLocationClick={(coords: { lat: number; lng: number }) => setMapCenter(coords)}
            />
          </div>
        </div>
        
        {/* Map Section - Flex-1 fills remaining space */}
        <div className="flex-1 min-h-0 px-4 pb-4">
          <div className="h-full">
            <MapSection 
              mapCenter={mapCenter}
              currentCity={currentCity}
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
    </MapFilterProvider>
  );
};

export default HomePage;
