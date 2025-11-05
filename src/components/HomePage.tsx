
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { MapFilterProvider } from '@/contexts/MapFilterContext';
import { Place } from '@/types/place';
import { Crown, Heart, MapPin, Activity, MessageCircle, Trophy } from 'lucide-react';
import Header from './home/Header';
import StoriesSection from './home/StoriesSection';
import MapSection from './home/MapSection';
import ModalsManager from './home/ModalsManager';
import CommunityHighlights from './home/CommunityHighlights';
// Google Maps no longer needed - using Leaflet + OSM
import { supabase } from '@/integrations/supabase/client';
import { ThemeToggle } from './ThemeToggle';
import { Button } from './ui/button';
import UnifiedSearchOverlay from './explore/UnifiedSearchOverlay';
import SpottLogo from './common/SpottLogo';

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
  const location = useLocation();
  const { user } = useAuth();
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(() => {
    try {
      const saved = localStorage.getItem('lastMapCenter');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { lat: 37.7749, lng: -122.4194 };
  });
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  // Modal states
  const [isCreateStoryModalOpen, setIsCreateStoryModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [isLocationDetailOpen, setIsLocationDetailOpen] = useState(false);
  const [isStoriesViewerOpen, setIsStoriesViewerOpen] = useState(false);
  const [sharePlace, setSharePlace] = useState<LocalPlace | null>(null);
  const [commentPlace, setCommentPlace] = useState<LocalPlace | null>(null);
  const [locationDetailPlace, setLocationDetailPlace] = useState<LocalPlace | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [initialPinToShow, setInitialPinToShow] = useState<Place | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [currentCity, setCurrentCity] = useState('');
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);

  // Logo state - show only on first login (this session)
  const [showLogo, setShowLogo] = useState(() => {
    const hasShownLogo = sessionStorage.getItem('hasShownSpottLogo');
    if (!hasShownLogo) {
      sessionStorage.setItem('hasShownSpottLogo', 'true');
      return true;
    }
    return false;
  });

  // Handle navigation state for opening pin detail from posts
  useEffect(() => {
    const state = location.state as any;
    let usedState = false;
    if (state?.centerMap) {
      setMapCenter({ lat: state.centerMap.lat, lng: state.centerMap.lng });
      usedState = true;
    }
    if (state?.openPinDetail) {
      const pin = state.openPinDetail;
      const placeToShow: Place = {
        id: pin.id,
        name: pin.name,
        category: pin.category,
        coordinates: { lat: pin.lat, lng: pin.lng },
        address: '',
        isFollowing: false,
        isNew: false,
        likes: 0,
        visitors: []
      };
      setInitialPinToShow(placeToShow);
      usedState = true;
    }
    // Only clear navigation state if we actually consumed it
    if (usedState) {
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, location.pathname, navigate]);

  // Get user's current location on component mount and when tab becomes visible
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
            // Keep existing center; do not override with fallback
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
          }
        );
      } else {
        console.warn('Geolocation is not supported by this browser');
      }
    };

    getCurrentLocation();

    // Also get location when page becomes visible (tab switching)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        getCurrentLocation();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Persist last map center
  useEffect(() => {
    try { localStorage.setItem('lastMapCenter', JSON.stringify(mapCenter)); } catch {}
  }, [mapCenter]);

  // Derive city name from geolocation via Google Geocoder or manual mapping
  useEffect(() => {
    const setCityFromLocation = async () => {
      if (!userLocation) return;
      
      // Try manual city detection first for instant results
      const manualCity = getManualCity(userLocation.lat, userLocation.lng);
      if (manualCity !== 'Unknown City') {
        setCurrentCity(manualCity);
        setSearchQuery(manualCity);
        console.log('✅ City detected instantly:', manualCity);
      }

      // Manual city detection is sufficient now (no Google Geocoder needed)
    };

    setCityFromLocation();
  }, [userLocation]);

  // Manual city detection for instant results
  const getManualCity = (lat: number, lng: number): string => {
    const cities = [
      { name: 'San Francisco', lat: 37.7749, lng: -122.4194, radius: 0.5 },
      { name: 'New York', lat: 40.7128, lng: -74.0060, radius: 0.5 },
      { name: 'London', lat: 51.5074, lng: -0.1278, radius: 0.5 },
      { name: 'Paris', lat: 48.8566, lng: 2.3522, radius: 0.5 },
      { name: 'Dublin', lat: 53.3498, lng: -6.2603, radius: 0.5 },
      { name: 'Milan', lat: 45.4642, lng: 9.1900, radius: 0.5 },
      { name: 'Rome', lat: 41.9028, lng: 12.4964, radius: 0.5 },
      { name: 'Barcelona', lat: 41.3851, lng: 2.1734, radius: 0.5 },
      { name: 'Amsterdam', lat: 52.3676, lng: 4.9041, radius: 0.5 },
      { name: 'Berlin', lat: 52.5200, lng: 13.4050, radius: 0.5 }
    ];

    for (const city of cities) {
      const distance = Math.sqrt(Math.pow(lat - city.lat, 2) + Math.pow(lng - city.lng, 2));
      if (distance <= city.radius) return city.name;
    }
    return 'Unknown City';
  };

  const handleCityChange = (city: string, coords?: { lat: number; lng: number }) => {
    console.log('🗺️ HomePage - handleCityChange called:', city, coords);
    setSelectedCity(city);
    setCurrentCity(city);

    // Always update map center if coordinates are provided
    if (coords) {
      const newCenter = { lat: coords.lat, lng: coords.lng };
      console.log('🗺️ Updating map center and user location to:', newCenter);
      setMapCenter(newCenter);
      setUserLocation(newCenter);
      
      // Store in localStorage for persistence
      localStorage.setItem('lastMapCenter', JSON.stringify(newCenter));
      localStorage.setItem('lastSelectedCity', city);
      return;
    }

    // Fallback to predefined coordinates
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
      console.log('🗺️ Map center updated from predefined list:', newCenter);
    } else if (userLocation) {
      // Last resort: use user's current location
      setMapCenter(userLocation);
      console.log('🗺️ Map center fallback to user location:', userLocation);
    }
  };

  const handlePinClick = (place: Place) => {
    console.log('HomePage - Pin clicked:', place.name);
    setSelectedPlace(place);
  };

  const handleCloseSelectedPlace = () => {
    setSelectedPlace(null);
  };

  const [stories, setStories] = useState<any[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(true);

  // Fetch stories from followed users AND current user's own stories
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
      
      // Include current user's own stories by adding their ID
      const userIdsToFetch = [...followingIds, user.id];

      // Fetch stories from followed users AND current user (not expired)
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
          created_at,
          location_id,
          locations (
            category,
            latitude,
            longitude
          )
        `)
        .in('user_id', userIdsToFetch)
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

      // Check viewed status for each story
      const { data: viewsData } = await supabase
        .from('story_views')
        .select('story_id')
        .eq('user_id', user.id);

      const viewedStoryIds = new Set(viewsData?.map(v => v.story_id) || []);

      // Transform stories to expected format
      const formattedStories = storiesData?.map(story => {
        const profile = profilesMap.get(story.user_id);
        const locationCategory = story.locations?.category || null;
        const locationLat = story.locations?.latitude || null;
        const locationLng = story.locations?.longitude || null;
        
        return {
          id: story.id,
          userId: story.user_id,
          userName: profile?.username || 'User',
          userAvatar: profile?.avatar_url || '',
          isViewed: viewedStoryIds.has(story.id),
          mediaUrl: story.media_url,
          mediaType: story.media_type,
          locationId: story.location_id,
          locationName: story.location_name,
          locationAddress: story.location_address,
          timestamp: story.created_at,
          locationCategory: locationCategory,
          locationLat: locationLat,
          locationLng: locationLng
        };
      }) || [];

      // Sort stories: current user's stories first, then by most recent
      const sortedStories = formattedStories.sort((a, b) => {
        if (a.userId === user.id && b.userId !== user.id) return -1;
        if (a.userId !== user.id && b.userId === user.id) return 1;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      setStories(sortedStories);
    } catch (error) {
      console.error('Error fetching followed stories:', error);
      setStories([]);
    } finally {
      setStoriesLoading(false);
    }
  };

  useEffect(() => {
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
      <div className="h-screen w-full bg-white dark:bg-gray-900 flex flex-col overflow-hidden" data-map-expanded={isMapExpanded}>
        {/* Fixed Header - ~60px */}
        {!isCreateStoryModalOpen && (
          <Header
            searchQuery={searchQuery}
            currentCity={currentCity}
            onSearchChange={setSearchQuery}
            onSearchKeyPress={() => {}}
            onCreateStoryClick={() => setIsCreateStoryModalOpen(true)}
            onCitySelect={handleCityChange}
            onOpenSearchOverlay={() => setIsSearchOverlayOpen(true)}
          />
        )}
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Stories Section - 80px */}
        {!isCreateStoryModalOpen && !isStoriesViewerOpen && (
          <div className="h-[80px] flex-shrink-0">
            <StoriesSection
              stories={stories}
              onCreateStory={() => setIsCreateStoryModalOpen(true)}
              onStoryClick={(index) => {
                setCurrentStoryIndex(index);
                setIsStoriesViewerOpen(true);
              }}
            />
          </div>
        )}
        
        {/* Discover Section - 110px */}
        {!isCreateStoryModalOpen && !isStoriesViewerOpen && (
          <div className="h-[110px] flex-shrink-0">
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
              onSwipeDiscoveryOpen={() => navigate('/discover')}
              onSpotSelect={(spot) => {
                // Convert PopularSpot to Place format and show it
                setInitialPinToShow({
                  id: spot.id,
                  name: spot.name,
                  category: spot.category,
                  address: spot.address || '',
                  coordinates: spot.coordinates,
                  isFollowing: false,
                  isNew: false,
                  likes: 0,
                  visitors: [],
                });
              }}
            />
          </div>
        )}
        
        {/* Map Section - fills remaining space and extends under bottom nav */}
        {!isCreateStoryModalOpen && !isStoriesViewerOpen && (
          <div className={isMapExpanded ? "fixed inset-0 z-50" : isSearchOverlayOpen ? "hidden" : "flex-1 relative overflow-hidden"}>
            <MapSection
              mapCenter={mapCenter}
              currentCity={currentCity}
              isExpanded={isMapExpanded}
              onToggleExpand={() => setIsMapExpanded(!isMapExpanded)}
              initialSelectedPlace={initialPinToShow}
              onClearInitialPlace={() => setInitialPinToShow(null)}
            />
          </div>
        )}
      </main>

      {/* Full-screen Search Overlay (fades background) */}
      <UnifiedSearchOverlay
        isOpen={isSearchOverlayOpen}
        onClose={() => setIsSearchOverlayOpen(false)}
        onCitySelect={(city, coords) => {
          handleCityChange(city, coords);
          setSearchQuery(city);
          setIsSearchOverlayOpen(false);
        }}
      />

      <ModalsManager 
        isCreateStoryModalOpen={isCreateStoryModalOpen}
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
        onShareModalClose={() => setIsShareModalOpen(false)}
        onCommentModalClose={() => setIsCommentModalOpen(false)}
        onLocationDetailClose={() => setIsLocationDetailOpen(false)}
        onStoriesViewerClose={() => setIsStoriesViewerOpen(false)}
        onStoryCreated={() => {}}
        onShare={() => {}}
        onCommentSubmit={() => {}}
        onStoryViewed={(storyId) => {
          fetchFollowedStories();
        }}
        onReplyToStory={async (storyId: string, userId: string, message: string) => {
          // Story replies will be handled via messages functionality
          console.log('Story reply:', { storyId, userId, message });
        }}
        onLocationClick={(locationId: string) => {
          // Find the story with this location to get coordinates
          const story = stories.find(s => s.locationId === locationId);
          if (story && story.locationLat && story.locationLng) {
            setMapCenter({ 
              lat: Number(story.locationLat), 
              lng: Number(story.locationLng) 
            });
            // Set the place to show detail
            setInitialPinToShow({
              id: story.locationId,
              name: story.locationName,
              category: story.locationCategory || 'restaurant',
              coordinates: { 
                lat: Number(story.locationLat), 
                lng: Number(story.locationLng) 
              },
              address: story.locationAddress || '',
              isFollowing: false,
              isNew: false,
              likes: 0,
              visitors: []
            });
          }
          setIsStoriesViewerOpen(false);
        }}
      />

      {/* Spott Logo on app launch */}
      <SpottLogo showOnMount={showLogo} duration={4000} />
      </div>
    </MapFilterProvider>
  );
};

export default HomePage;
