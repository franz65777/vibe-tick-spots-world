
import React, { useState, useEffect, useRef, memo, lazy, Suspense } from 'react';
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
import GuidedTour, { GuidedTourStep } from './onboarding/GuidedTour';
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
  const [isAnyModalOpen, setIsAnyModalOpen] = useState(false);
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
  const [isCenteredOnUser, setIsCenteredOnUser] = useState(false);
  const ignoreMoveEventRef = useRef(false);
  const reopenSearchDrawerRef = useRef<(() => void) | null>(null);

  // Listen for full-screen modals (Post/Trip/List/etc.) via body data attribute
  useEffect(() => {
    const checkModalOpen = () => {
      setIsAnyModalOpen(document.body.hasAttribute('data-modal-open'));
    };

    checkModalOpen();

    const observer = new MutationObserver(checkModalOpen);
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-modal-open'] });

    return () => observer.disconnect();
  }, []);

  // Listen for map movement to reset centered state
  useEffect(() => {
    const handleMapMoved = () => {
      // Ignore the moveend event that happens right after centering
      if (ignoreMoveEventRef.current) {
        ignoreMoveEventRef.current = false;
        return;
      }
      setIsCenteredOnUser(false);
    };
    window.addEventListener('map:user-moved', handleMapMoved);
    return () => window.removeEventListener('map:user-moved', handleMapMoved);
  }, []);

  // Wrapper to handle centering - sets flag to ignore immediate moveend
  const handleCenterStatusChange = (isCentered: boolean) => {
    if (isCentered) {
      ignoreMoveEventRef.current = true;
    }
    setIsCenteredOnUser(isCentered);
  };

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  
  // Guided tour state
  const [showGuidedTour, setShowGuidedTour] = useState(false);
  const [guidedTourStep, setGuidedTourStep] = useState<GuidedTourStep>('profile-photo');

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

  // State for return navigation from save-location page
  const [returnTo, setReturnTo] = useState<string | null>(null);
  // Complete state for return navigation (includes scroll position, folderId, etc.)
  const [returnToState, setReturnToState] = useState<any>(null);
  
  // State for navigation back to messages
  const [fromMessages, setFromMessages] = useState(false);
  const [returnToUserId, setReturnToUserId] = useState<string | null>(null);
  
  // State for search drawer visibility (to hide header elements)
  const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState(false);
  
  // State for currently selected place on map (to show in header)
  const [mapSelectedPlace, setMapSelectedPlace] = useState<Place | null>(null);
  const closeSelectedPlaceRef = useRef<(() => void) | null>(null);

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
          sourcePostId: pin.sourcePostId, // Pass sourcePostId if exists
          google_place_id: pin.google_place_id || undefined, // Pass google_place_id for opening hours
        };
        // Add returnTo for back navigation from feed sections
        if (state.returnTo) {
          (placeToShow as any).returnTo = state.returnTo;
          setReturnTo(state.returnTo);
        }
        setInitialPinToShow(placeToShow);
        usedState = true;
      }
      // Handle location card from SaveLocationPage or Messages
      if (state?.showLocationCard && state?.locationData) {
        const locData = state.locationData;
        const placeToShow: Place = {
          id: locData.id,
          name: locData.name,
          category: locData.category,
          coordinates: locData.coordinates,
          address: locData.address || '',
          city: locData.city,
          streetName: locData.streetName,
          streetNumber: locData.streetNumber,
          isFollowing: false,
          isNew: true,
          isTemporary: locData.isTemporary || false, // Flag for unsaved locations
          likes: 0,
          visitors: []
        };
        setMapCenter(locData.coordinates);
        setInitialPinToShow(placeToShow);
        if (state.returnTo) {
          setReturnTo(state.returnTo);
        }
        // Track if opened from messages for back navigation
        if (state.fromMessages) {
          setFromMessages(true);
          if (state.returnToUserId) {
            setReturnToUserId(state.returnToUserId);
          }
        }
        usedState = true;
      }
      // Handle location from folder/list click
      if (state?.selectedLocation) {
        const locData = state.selectedLocation;
        const placeToShow: Place = {
          id: locData.id,
          name: locData.name,
          category: locData.category,
          coordinates: locData.coordinates || { lat: locData.latitude, lng: locData.longitude },
          address: locData.address || '',
          city: locData.city,
          isFollowing: false,
          isNew: false,
          likes: 0,
          visitors: [],
          google_place_id: locData.google_place_id
        };
        // Mark as coming from a list so we can show a back button to the list
        (placeToShow as any).returnTo = state.returnTo;
        // Also mark that other pins should be hidden
        (placeToShow as any).fromList = true;

        if (placeToShow.coordinates) {
          setMapCenter(placeToShow.coordinates);
        }
        setInitialPinToShow(placeToShow);
        if (state.returnTo) {
          setReturnTo(state.returnTo);
        }
        // Save complete returnToState for proper back navigation
        if (state.returnToState) {
          setReturnToState(state.returnToState);
        }
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

  // Get user's current location on component mount
  // Only update mapCenter on initial mount when no saved center exists
  const hasInitializedLocation = useRef(false);
  
  useEffect(() => {
    // If we already have a persisted map center, do not recenter to the user's location on mount.
    // This prevents "snap back to my position" when HomePage remounts after closing cards.
    try {
      const saved = localStorage.getItem('lastMapCenter');
      if (saved) {
        hasInitializedLocation.current = true;
      }
    } catch {
      // ignore
    }

    const getCurrentLocation = (updateMapCenter: boolean) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const location = { lat: latitude, lng: longitude };
            setUserLocation(location);
            // Only update mapCenter on initial load when we don't already have a saved center
            if (updateMapCenter && !hasInitializedLocation.current) {
              hasInitializedLocation.current = true;
              setMapCenter(location);
            }
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

    getCurrentLocation(true);

    // Also get location when page becomes visible (tab switching) - but don't recenter map
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        getCurrentLocation(false);
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
    setSearchQuery(city);

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
    }
    // If city is unknown, keep the current map center (do not snap back to user location)
  };

  // Handle location selection from unified search (city search bar)
  const handleLocationSelect = (location: { id: string; name: string; city: string; address: string; lat: number; lng: number; category: string }) => {
    console.log('📍 Location selected from search:', location.name);
    
    // Check if this is a new/external location (ID starts with nominatim-, photon-, overpass-, or is not a valid UUID)
    const isExternalLocation = location.id.startsWith('nominatim-') || 
                                location.id.startsWith('photon-') || 
                                location.id.startsWith('overpass-') ||
                                !location.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    
    // Create a temporary place object from the location result
    const placeToShow: Place = {
      id: location.id,
      name: location.name,
      category: location.category as any,
      coordinates: { lat: location.lat, lng: location.lng },
      address: location.address || '',
      city: location.city,
      isFollowing: false,
      isNew: isExternalLocation,
      isTemporary: isExternalLocation, // Mark as temporary if it's from external API
      likes: 0,
      visitors: []
    };
    
    // Update map center to the location
    setMapCenter({ lat: location.lat, lng: location.lng });
    setRecenterToken((v) => v + 1);
    
    // Show the location card
    setInitialPinToShow(placeToShow);
    
    // Update city if available
    if (location.city) {
      setCurrentCity(location.city);
    }
  };

  const handlePinClick = (place: Place) => {
    console.log('HomePage - Pin clicked:', place.name);
    setSelectedPlace(place);
  };

  const handleCloseSelectedPlace = () => {
    // Only clear selectedPlace, don't recenter the map
    // The map will stay at its current position
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
        onStartGuidedTour={() => {
          setShowOnboarding(false);
          setShowGuidedTour(true);
          setGuidedTourStep('profile-photo');
        }}
      />
      
      {/* Guided Tour */}
      <GuidedTour
        isActive={showGuidedTour}
        currentStep={guidedTourStep}
        onStepChange={setGuidedTourStep}
        onComplete={() => {
          setShowGuidedTour(false);
          setGuidedTourStep('complete');
        }}
      />
      
      <div 
        className="h-screen w-full bg-transparent flex flex-col overflow-hidden pt-[env(safe-area-inset-top)]"
        data-map-expanded={isMapExpanded}
        data-onboarding-open={showOnboarding}
      >
        {/* Map Section - FIXED behind everything, full screen */}
        {!isCreateStoryModalOpen && !isStoriesViewerOpen && !showOnboarding && (
          <div className="fixed inset-0 z-0">
            <Suspense fallback={<div className="w-full h-full bg-muted" />}>
              <HomeMapContainer
                mapCenter={mapCenter}
                currentCity={currentCity}
                isExpanded={isMapExpanded}
                isSearchOverlayOpen={isSearchOverlayOpen}
                onToggleExpand={() => setIsMapExpanded(!isMapExpanded)}
                initialSelectedPlace={initialPinToShow}
                onClearInitialPlace={() => {
                  setInitialPinToShow(null);
                  // Reset messages navigation state
                  setFromMessages(false);
                  setReturnToUserId(null);
                  if (returnTo) {
                    // If we have returnToState with a folderId, navigate to the folder page
                    if (returnToState?.folderId) {
                      navigate(`/folder/${returnToState.folderId}`, {
                        state: {
                          from: returnToState.from,
                          scrollY: returnToState.scrollY
                        },
                        replace: true
                      });
                    } else {
                      // Otherwise navigate to the returnTo path with scroll restoration
                      navigate(returnTo, {
                        state: { restoreScroll: returnToState?.scrollY },
                        replace: true
                      });
                    }
                    setReturnTo(null);
                    setReturnToState(null);
                  }
                }}
                recenterToken={recenterToken}
                onCitySelect={handleCityChange}
                fromMessages={fromMessages}
                returnToUserId={returnToUserId}
                onBackToMessages={() => {
                  setInitialPinToShow(null);
                  setFromMessages(false);
                  const userId = returnToUserId;
                  setReturnToUserId(null);
                  navigate('/messages', { state: { initialUserId: userId } });
                }}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                isCenteredOnUser={isCenteredOnUser}
                onCenterStatusChange={handleCenterStatusChange}
                onOpenSearchOverlay={() => setIsSearchOverlayOpen(true)}
                onSearchDrawerStateChange={setIsSearchDrawerOpen}
                onSelectedPlaceChange={setMapSelectedPlace}
                registerCloseSelectedPlace={(fn) => { closeSelectedPlaceRef.current = fn; }}
                onMapCenterChange={(center) => {
                  // Persist the *actual* map view position so closing cards never snaps back.
                  setMapCenter(center);
                }}
                registerReopenSearchDrawer={(fn) => { reopenSearchDrawerRef.current = fn; }}
              />
            </Suspense>
          </div>
        )}

        {/* Fixed Header - ~60px - on top of map */}
        {!isCreateStoryModalOpen && !showOnboarding && (
          <div className="relative z-20 pointer-events-none [&>*]:pointer-events-auto">
            {/* Top fade gradient overlay - hide when a full-screen modal is open */}
            {!isAnyModalOpen && (
              <div 
                className="pointer-events-none fixed inset-x-0 top-0 h-24 z-10"
                style={{ 
                  background: 'linear-gradient(to bottom, hsl(var(--background)) 0%, hsl(var(--background) / 0.8) 30%, hsl(var(--background) / 0.4) 60%, hsl(var(--background) / 0.1) 80%, transparent 100%)' 
                }}
              />
            )}
            <Header
              searchQuery={searchQuery}
              currentCity={currentCity}
              onSearchChange={setSearchQuery}
              onSearchKeyPress={() => {}}
              onCreateStoryClick={() => setIsCreateStoryModalOpen(true)}
              onCitySelect={handleCityChange}
              onOpenSearchOverlay={() => {
                closeSelectedPlaceRef.current?.();
                setMapSelectedPlace(null);
                // Use the SearchDrawer's trending mode instead of UnifiedSearchOverlay
                if (reopenSearchDrawerRef.current) {
                  reopenSearchDrawerRef.current();
                } else {
                  setIsSearchOverlayOpen(true);
                }
              }}
              isCenteredOnUser={isCenteredOnUser}
              onCenterStatusChange={handleCenterStatusChange}
              isSearchDrawerOpen={isSearchDrawerOpen}
              selectedPlace={mapSelectedPlace}
              onCloseSelectedPlace={() => {
                closeSelectedPlaceRef.current?.();
                setMapSelectedPlace(null);
              }}
            />
          </div>
        )}
      
      <main className="flex-1 flex flex-col overflow-hidden relative z-10 pointer-events-none [&>*]:pointer-events-auto">
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
        
        {/* Discover Section - REMOVED - Now inside SearchDrawer */}
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
        onLocationSelect={handleLocationSelect}
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
