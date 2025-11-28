
import React, { useState, useEffect, memo, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTabPrefetch } from '@/hooks/useTabPrefetch';
import { MapFilterProvider } from '@/contexts/MapFilterContext';
import { Place } from '@/types/place';
import Header from './home/Header';
import ModalsManager from './home/ModalsManager';
import { supabase } from '@/integrations/supabase/client';
import UnifiedSearchOverlay from './explore/UnifiedSearchOverlay';
import SpottLogo from './common/SpottLogo';
import OnboardingModal from './onboarding/OnboardingModal';
import { Geolocation } from "@capacitor/geolocation";

// Lazy load heavy components
const HomeStoriesSection = lazy(() => import('./home/HomeStoriesSection'));
const HomeDiscoverSection = lazy(() => import('./home/HomeDiscoverSection'));
const HomeMapContainer = lazy(() => import('./home/HomeMapContainer'));

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

const HomePage = memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // Prefetch altre tab per transizioni istantanee
  useTabPrefetch('home');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(() => {
    try {
      const saved = localStorage.getItem('lastMapCenter');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { lat: 37.7749, lng: -122.4194 };
  });
  const [recenterToken, setRecenterToken] = useState(0);
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

  // Long press state
  const longPressTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  // Logo state - show only on first login (this session)
  const [showLogo, setShowLogo] = useState(() => {
    const hasShownLogo = sessionStorage.getItem('hasShownSpottLogo');
    if (!hasShownLogo) {
      sessionStorage.setItem('hasShownSpottLogo', 'true');
      return true;
    }
    return false;
  });

  // Request location permissions on iPhone
  useEffect(() => {
    (async () => {
      try {
        await Geolocation.requestPermissions();
        const pos = await Geolocation.getCurrentPosition();
        console.log("Location:", pos);
      } catch (err) {
        console.error("Location error:", err);
      }
    })();
  }, []);

  // Check onboarding status on mount
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user?.id) {
        setCheckingOnboarding(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error checking onboarding status:', error);
          setCheckingOnboarding(false);
          return;
        }

        // Show onboarding if not completed
        if (!profile?.onboarding_completed) {
          setShowOnboarding(true);
        }
      } catch (error) {
        console.error('Onboarding check error:', error);
      } finally {
        setCheckingOnboarding(false);
      }
    };

    checkOnboardingStatus();
  }, [user?.id]);

  // Handle navigation state for opening pin detail from posts
  useEffect(() => {
    const handleNavState = async () => {
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
          visitors: [],
          sourcePostId: pin.sourcePostId // Pass sourcePostId if exists
        };
        setInitialPinToShow(placeToShow);
        usedState = true;
      }
      // Open a specific location by id from notifications
      if (state?.openLocationId) {
        try {
          const { data: loc } = await supabase
            .from('locations')
            .select('id, name, category, latitude, longitude, address')
            .eq('id', state.openLocationId)
            .maybeSingle();
          if (loc) {
            const placeToShow: Place = {
              id: loc.id,
              name: loc.name,
              category: loc.category,
              coordinates: { lat: Number(loc.latitude), lng: Number(loc.longitude) },
              address: loc.address || '',
              isFollowing: false,
              isNew: false,
              likes: 0,
              visitors: []
            };
            setMapCenter(placeToShow.coordinates);
            setInitialPinToShow(placeToShow);
            usedState = true;
          }
        } catch (e) {
          console.warn('Failed to open location from notification', e);
        }
      }
      // Only clear navigation state if we actually consumed it
      if (usedState) {
        navigate(location.pathname, { replace: true });
      }
    };
    handleNavState();
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
          },
          (error) => {
            console.warn('Error getting user location:', error);
            // Keep existing center; do not override with fallback
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0 // Always get fresh location
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
      setRecenterToken((v) => v + 1);
      
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

  // Show loading while checking onboarding
  if (checkingOnboarding) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-[env(safe-area-inset-top)]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-[env(safe-area-inset-top)]">
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
      {/* Onboarding Modal */}
      <OnboardingModal 
        open={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
      />
      
      <div 
        className="h-screen w-full bg-background flex flex-col overflow-hidden pt-[env(safe-area-inset-top)]"
        data-map-expanded={isMapExpanded}
        data-onboarding-open={showOnboarding}
        onTouchStart={(e) => {
          // Only trigger long press for single touch (not pinch/zoom)
          if (e.touches.length === 1) {
            longPressTimerRef.current = setTimeout(() => {
              setIsLongPressing(true);
              navigate('/share-location');
            }, 800); // 800ms for long press
          }
        }}
        onTouchEnd={() => {
          // Cancel long press timer
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
          setIsLongPressing(false);
        }}
        onTouchMove={(e) => {
          // Cancel if user moves finger or uses multiple fingers (pinch)
          if (longPressTimerRef.current && (e.touches.length > 1)) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
        }}
      >
        {/* Fixed Header - ~60px */}
        {!isCreateStoryModalOpen && !showOnboarding && (
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
      
      <main className="flex-1 flex flex-col overflow-x-hidden relative">
        {/* Stories Section - HIDDEN FOR NOW - Keep logic intact for later implementation */}
        {/* {!isCreateStoryModalOpen && !isStoriesViewerOpen && (
          <Suspense fallback={<div className="h-[90px] flex-shrink-0" />}>
            <HomeStoriesSection
              stories={stories}
              onCreateStory={() => setIsCreateStoryModalOpen(true)}
              onStoryClick={(index) => {
                setCurrentStoryIndex(index);
                setIsStoriesViewerOpen(true);
              }}
            />
          </Suspense>
        )} */}
        
        {/* Discover Section - 110px */}
        {!isCreateStoryModalOpen && !isStoriesViewerOpen && !showOnboarding && (
          <Suspense fallback={<div className="h-[110px] flex-shrink-0" />}>
            <HomeDiscoverSection
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
          </Suspense>
        )}
        
        {/* Map Section - absolute positioned to extend all the way to bottom behind bottom nav */}
        {!isCreateStoryModalOpen && !isStoriesViewerOpen && !showOnboarding && (
          <div className="absolute top-[110px] left-0 right-0 -bottom-[80px]">
            <Suspense fallback={<div className="w-full h-full" />}>
              <HomeMapContainer
                mapCenter={mapCenter}
                currentCity={currentCity}
                isExpanded={isMapExpanded}
                isSearchOverlayOpen={isSearchOverlayOpen}
                onToggleExpand={() => setIsMapExpanded(!isMapExpanded)}
                initialSelectedPlace={initialPinToShow}
                onClearInitialPlace={() => setInitialPinToShow(null)}
                recenterToken={recenterToken}
              />
            </Suspense>
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
});

HomePage.displayName = 'HomePage';

export default HomePage;
