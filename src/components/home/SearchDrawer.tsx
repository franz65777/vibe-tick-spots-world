import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, Navigation2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PhotonResult } from '@/lib/photonGeocoding';
import { useTranslation } from 'react-i18next';
import { useGeolocation } from '@/hooks/useGeolocation';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { translateCityName, reverseTranslateCityName } from '@/utils/cityTranslations';
import CityEngagementCard from '@/components/explore/CityEngagementCard';
import PopularSpots from '@/components/home/PopularSpots';
import { getCategoryImage, getCategoryIcon, getCategoryColor } from '@/utils/categoryIcons';
import { nominatimGeocoding } from '@/lib/nominatimGeocoding';
import { resolveCityDisplay } from '@/utils/cityNormalization';
import { searchNearbyByCategory, type NearbySearchResult, type NearbyPrompt as NearbyPromptType, promptToCategory } from '@/lib/nearbySearch';
import noResultsIcon from '@/assets/no-results-pin.png';
import type { AllowedCategory } from '@/utils/allowedCategories';
import { useOptimizedPlacesSearch, type SearchResult } from '@/hooks/useOptimizedPlacesSearch';
import spottLogoTransparent from '@/assets/spott-logo-transparent-v3.png';

interface PopularSpot {
  id: string;
  name: string;
  category: string;
  city: string;
  address?: string;
  google_place_id?: string;
  savesCount: number;
  coordinates: {
    lat: number;
    lng: number;
  };
}

interface LocationResult {
  id: string;
  name: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
  category: AllowedCategory;
  google_place_id?: string;
}

// Map Google place types to our categories
const mapGoogleTypeToCategory = (types: string[]): AllowedCategory => {
  const typeMapping: Record<string, AllowedCategory> = {
    restaurant: 'restaurant',
    food: 'restaurant',
    meal_takeaway: 'restaurant',
    meal_delivery: 'restaurant',
    bar: 'bar',
    night_club: 'nightclub',
    cafe: 'cafe',
    coffee_shop: 'cafe',
    bakery: 'bakery',
    hotel: 'hotel',
    lodging: 'hotel',
    resort: 'hotel',
    museum: 'museum',
    art_gallery: 'museum',
    tourist_attraction: 'historical',
    park: 'park',
    natural_feature: 'park',
  };

  for (const type of types) {
    if (typeMapping[type]) {
      return typeMapping[type];
    }
  }
  return 'restaurant';
};

interface SearchDrawerProps {
  searchQuery: string;
  currentCity: string;
  onSearchChange: (value: string) => void;
  onCitySelect: (city: string, coords?: { lat: number; lng: number }) => void;
  onLocationSelect?: (location: PhotonResult) => void;
  onFocusOpen?: () => void;
  isCenteredOnUser?: boolean;
  onCenterStatusChange?: (isCentered: boolean) => void;
  onSpotSelect?: (spot: PopularSpot) => void;
  isExpanded?: boolean;
  onDrawerStateChange?: (isOpen: boolean) => void;
  registerReopenTrending?: (reopenFn: () => void) => void;
  registerCloseDrawer?: (closeFn: () => void) => void;
  showBrandingLogo?: boolean;
}

// Nearby prompts - main categories + subcategories with emojis
interface NearbyPromptItem {
  id: NearbyPromptType;
  parentCategory: AllowedCategory;
  emoji: string;
}

const nearbyPrompts: NearbyPromptItem[] = [
  { id: 'restaurant', parentCategory: 'restaurant', emoji: '🍽️' },
  { id: 'pizzeria', parentCategory: 'restaurant', emoji: '🍕' },
  { id: 'sushi', parentCategory: 'restaurant', emoji: '🍣' },
  { id: 'burger', parentCategory: 'restaurant', emoji: '🍔' },
  { id: 'cafe', parentCategory: 'cafe', emoji: '☕' },
  { id: 'gelato', parentCategory: 'cafe', emoji: '🍨' },
  { id: 'bar', parentCategory: 'bar', emoji: '🍸' },
  { id: 'cocktail', parentCategory: 'bar', emoji: '🍹' },
  { id: 'bakery', parentCategory: 'bakery', emoji: '🥐' },
  { id: 'hotel', parentCategory: 'hotel', emoji: '🏨' },
  { id: 'museum', parentCategory: 'museum', emoji: '🏛️' },
  { id: 'entertainment', parentCategory: 'entertainment', emoji: '🎭' },
  { id: 'park', parentCategory: 'park', emoji: '🌳' },
  { id: 'historical', parentCategory: 'historical', emoji: '🏰' },
  { id: 'nightclub', parentCategory: 'nightclub', emoji: '💃' },
];

const popularCities = [
  { name: 'Dublin', lat: 53.3498053, lng: -6.2603097 },
  { name: 'London', lat: 51.5074, lng: -0.1278 },
  { name: 'Paris', lat: 48.8566, lng: 2.3522 },
  { name: 'New York', lat: 40.7128, lng: -74.0060 },
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
  { name: 'Barcelona', lat: 41.3851, lng: 2.1734 },
  { name: 'Amsterdam', lat: 52.3676, lng: 4.9041 },
  { name: 'Rome', lat: 41.9028, lng: 12.4964 }
];

const SearchDrawer: React.FC<SearchDrawerProps> = ({
  searchQuery,
  currentCity,
  onSearchChange,
  onCitySelect,
  onLocationSelect,
  onFocusOpen,
  isCenteredOnUser = false,
  onCenterStatusChange,
  onSpotSelect,
  isExpanded = false,
  onDrawerStateChange,
  registerReopenTrending,
  registerCloseDrawer,
  showBrandingLogo = false,
}) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { location, loading: geoLoading, getCurrentLocation } = useGeolocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const lastPopularCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  
  type DrawerMode = 'closed' | 'trending' | 'search';
  const TRENDING_PROGRESS = 0.28;
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('closed');
  const [isHiddenByModal, setIsHiddenByModal] = useState(false);
  const isSearchOpen = drawerMode === 'search';
  const isDrawerVisible = drawerMode !== 'closed';

  const [isLoading, setIsLoading] = useState(false);
  const [internalQuery, setInternalQuery] = useState('');
  
  // Branding logo visibility - show for a few seconds on mount
  const [showLogoInBar, setShowLogoInBar] = useState(showBrandingLogo);
  
  useEffect(() => {
    if (showBrandingLogo) {
      setShowLogoInBar(true);
      const timer = setTimeout(() => {
        setShowLogoInBar(false);
      }, 3000); // Show logo for 3 seconds
      return () => clearTimeout(timer);
    }
  }, [showBrandingLogo]);
  
  // Drag state (Pointer Events for reliable mobile swipe)
  const [dragProgress, setDragProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isInitialRender, setIsInitialRender] = useState(true);
  const dragStartY = useRef(0);
  const dragStartProgress = useRef(0);
  const velocityRef = useRef(0);
  const lastYRef = useRef(0);
  const lastTimeRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const touchActiveRef = useRef(false);
  const dragStartedOpenRef = useRef(false);
  const dragStartedModeRef = useRef<DrawerMode>('closed');
  const [cityResults, setCityResults] = useState<{ name: string; lat: number; lng: number }[]>([]);
  const [locationResults, setLocationResults] = useState<LocationResult[]>([]);
  const [nearbyResults, setNearbyResults] = useState<NearbySearchResult[]>([]);
  const [activeNearbyCategory, setActiveNearbyCategory] = useState<NearbyPromptType | null>(null);
  const [trendingCities, setTrendingCities] = useState<{ name: string; count: number; lat?: number; lng?: number }[]>([]);
  const searchCacheRef = useRef<Map<string, { cities: { name: string; lat: number; lng: number }[]; locations: LocationResult[] }>>(new Map());

  const processedLocationRef = useRef<string>('');

  // Prevent animation flash on initial render
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setIsInitialRender(false);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Hide drawer when a modal (like AddPageOverlay) is open
  useEffect(() => {
    const checkModalOpen = () => {
      setIsHiddenByModal(document.body.hasAttribute('data-modal-open'));
    };
    
    checkModalOpen();
    
    const observer = new MutationObserver(checkModalOpen);
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-modal-open'] });
    
    return () => observer.disconnect();
  }, []);

  // Register the reopen function for parent to call
  useEffect(() => {
    if (registerReopenTrending) {
      registerReopenTrending(() => {
        setDrawerMode('trending');
        setDragProgress(TRENDING_PROGRESS);
      });
    }
  }, [registerReopenTrending]);

  // Register the close function for parent to call
  useEffect(() => {
    if (registerCloseDrawer) {
      registerCloseDrawer(() => {
        setDrawerMode('closed');
        setDragProgress(0);
      });
    }
  }, [registerCloseDrawer]);

  useEffect(() => {
    // Notify parent when ANY drawer state is visible (Trending or Search).
    // Used by the map UI to hide the "liste" button/controls while the drawer is open.
    onDrawerStateChange?.(isDrawerVisible);
    
    // Cleanup: notify parent that drawer is closed when component unmounts
    return () => {
      onDrawerStateChange?.(false);
    };
  }, [isDrawerVisible, onDrawerStateChange]);

  useEffect(() => {
    // Auto-select user's current city ONCE per session.
    // SearchDrawer unmounts while a pin card is open; when it remounts (after closing the card)
    // we must NOT recenter the map back to the user's location.
    const sessionKey = 'spott:autoCitySelectedFromLocation';
    if (sessionStorage.getItem(sessionKey) === 'true') return;

    if (!location || !location.city || location.city === 'Unknown City') return;

    const locationKey = `${location.latitude}-${location.longitude}-${location.city}`;
    if (processedLocationRef.current === locationKey) return;

    processedLocationRef.current = locationKey;
    sessionStorage.setItem(sessionKey, 'true');

    onCitySelect(location.city, { lat: location.latitude, lng: location.longitude });
  }, [location?.latitude, location?.longitude, location?.city, onCitySelect]);

  // Fetch trending cities when the drawer becomes visible
  useEffect(() => {
    if (!isDrawerVisible) return;

    const fetchTrendingCities = async () => {
      try {
        const { data, error } = await supabase.rpc('get_global_city_counts');
        if (error) throw error;

        const items = (data || []).slice(0, 5).map((c: any) => ({
          name: String(c.city || '').split(',')[0].trim(),
          count: Number(c.pin_count) || 0,
        }));
        setTrendingCities(items);
      } catch (err) {
        console.error('Error fetching trending cities:', err);
      }
    };

    fetchTrendingCities();
  }, [isDrawerVisible]);

  // Search effect
  useEffect(() => {
    const queryTrimmed = internalQuery.trim().toLowerCase();
    const cacheKey = `${queryTrimmed}-${i18n.language}`;

    if (!queryTrimmed) {
      setCityResults([]);
      setLocationResults([]);
      setIsLoading(false);
      return;
    }

    // Check cache first
    if (searchCacheRef.current.has(cacheKey)) {
      const cached = searchCacheRef.current.get(cacheKey)!;
      setCityResults(cached.cities);
      setLocationResults(cached.locations);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(() => {
      searchAll(queryTrimmed);
    }, 80);

    return () => clearTimeout(timer);
  }, [internalQuery, i18n.language]);

  const searchAll = async (queryLower: string) => {
    if (!queryLower) return;

    const cacheKey = `${queryLower}-${i18n.language}`;

    if (searchCacheRef.current.has(cacheKey)) {
      const cached = searchCacheRef.current.get(cacheKey)!;
      setCityResults(cached.cities);
      setLocationResults(cached.locations);
      setIsLoading(false);
      return;
    }

    const queryEnglish = reverseTranslateCityName(queryLower).toLowerCase();

    setIsLoading(true);
    try {
      // Search saved locations from database
      const { data: locations, error } = await supabase
        .from('locations')
        .select('id, name, city, address, latitude, longitude, category')
        .or(`name.ilike.%${queryLower}%,city.ilike.%${queryLower}%`)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(30);

      if (error) {
        console.error('Location search error:', error);
      }

      // Map to LocationResult format with deduplication
      const seenLocations = new Map<string, LocationResult>();
      (locations || []).forEach((loc) => {
        const normalizedName = loc.name.toLowerCase().trim();
        const coordKey = `${loc.latitude!.toFixed(4)},${loc.longitude!.toFixed(4)}`;
        const dedupeKey = `${normalizedName}-${coordKey}`;

        if (!seenLocations.has(dedupeKey)) {
          seenLocations.set(dedupeKey, {
            id: loc.id,
            name: loc.name,
            city: resolveCityDisplay(loc.city, loc.address),
            address: loc.address || '',
            lat: loc.latitude!,
            lng: loc.longitude!,
            category: (loc.category || 'restaurant') as AllowedCategory,
          });
        }
      });

      const mappedLocations: LocationResult[] = Array.from(seenLocations.values());

      // Sort by proximity if user location available
      if (location && mappedLocations.length > 0) {
        mappedLocations.sort((a, b) => {
          const distA = calculateDistance(location.latitude, location.longitude, a.lat, a.lng);
          const distB = calculateDistance(location.latitude, location.longitude, b.lat, b.lng);
          return distA - distB;
        });
      }

      // Extract unique cities
      const citiesFromLocations = new Map<string, { name: string; lat: number; lng: number }>();
      (locations || []).forEach((loc) => {
        if (loc.city && loc.latitude && loc.longitude) {
          const resolved = resolveCityDisplay(loc.city, loc.address);
          const cityLower = resolved.toLowerCase().trim();
          const cityEnglish = reverseTranslateCityName(cityLower).toLowerCase();

          if (cityLower.includes(queryLower) || cityEnglish.includes(queryLower) || cityEnglish.includes(queryEnglish)) {
            if (!citiesFromLocations.has(cityEnglish)) {
              citiesFromLocations.set(cityEnglish, {
                name: cityEnglish,
                lat: loc.latitude,
                lng: loc.longitude,
              });
            }
          }
        }
      });

      // Check popular cities
      const matchingPopularCities = popularCities.filter((city) => {
        const cityLower = city.name.toLowerCase();
        return cityLower.includes(queryLower) || cityLower.includes(queryEnglish);
      });

      // Combine unique cities
      const allCities = [...citiesFromLocations.values()];
      matchingPopularCities.forEach((pc) => {
        const pcEnglish = reverseTranslateCityName(pc.name).toLowerCase();
        if (!citiesFromLocations.has(pcEnglish)) {
          allCities.push({ ...pc, name: pcEnglish });
        }
      });

      // If few results, search using optimized Google API via edge function
      if (allCities.length === 0 || mappedLocations.length < 5) {
        const userLoc = location ? { lat: location.latitude, lng: location.longitude } : undefined;

        try {
          // Use Google Text Search (ID Only = FREE) via edge function
          const response = await supabase.functions.invoke('google-places-search', {
            body: {
              action: 'search',
              query: queryLower,
              userLat: userLoc?.lat,
              userLng: userLoc?.lng,
            },
          });

          const googleResults = response.data?.results || [];
          
          const existingCoords = new Set(mappedLocations.map((l) => `${l.lat.toFixed(4)},${l.lng.toFixed(4)}`));
          const existingNames = new Set(mappedLocations.map((l) => l.name.toLowerCase().trim()));

          const isNameDuplicate = (name: string) => {
            const normalized = name.toLowerCase().trim();
            if (existingNames.has(normalized)) return true;
            for (const existing of existingNames) {
              if (normalized.includes(existing) || existing.includes(normalized)) return true;
            }
            return false;
          };

          // Add Google results (they don't have coordinates yet - need to get details on selection)
          googleResults.forEach((result: any, index: number) => {
            if (!isNameDuplicate(result.name)) {
              mappedLocations.push({
                id: `google-${index}-${result.place_id}`,
                name: result.name,
                city: result.formatted_address?.split(',').slice(-2, -1)[0]?.trim() || '',
                address: result.formatted_address || '',
                lat: 0, // Will be fetched on selection
                lng: 0,
                category: mapGoogleTypeToCategory(result.types || []) as AllowedCategory,
                google_place_id: result.place_id,
              });
              existingNames.add(result.name.toLowerCase().trim());
            }
          });
        } catch (err) {
          console.warn('Google search failed, falling back to Nominatim:', err);
          
          // Fallback to Nominatim
          const nominatimResults = await nominatimGeocoding.searchPlace(queryLower, i18n.language, userLoc).catch(() => []);
          
          const existingCoords = new Set(mappedLocations.map((l) => `${l.lat.toFixed(4)},${l.lng.toFixed(4)}`));
          const existingNames = new Set(mappedLocations.map((l) => l.name.toLowerCase().trim()));
          
          nominatimResults.forEach((result, index) => {
            const coordKey = `${result.lat.toFixed(4)},${result.lng.toFixed(4)}`;
            const normalized = result.displayName.split(',')[0].toLowerCase().trim();
            if (!existingCoords.has(coordKey) && !existingNames.has(normalized)) {
              mappedLocations.push({
                id: `nominatim-${index}`,
                name: result.displayName.split(',')[0],
                city: result.city || '',
                address: result.displayName,
                lat: result.lat,
                lng: result.lng,
                category: (result.type || 'place') as AllowedCategory,
              });
              existingCoords.add(coordKey);
              existingNames.add(normalized);
            }
          });
        }

        // Re-sort by distance (only for results with coordinates)
        if (userLoc && mappedLocations.length > 1) {
          mappedLocations.sort((a, b) => {
            // Google results without coords go to the end until selected
            if (a.lat === 0 && a.lng === 0) return 1;
            if (b.lat === 0 && b.lng === 0) return -1;
            const distA = calculateDistance(userLoc.lat, userLoc.lng, a.lat, a.lng);
            const distB = calculateDistance(userLoc.lat, userLoc.lng, b.lat, b.lng);
            return distA - distB;
          });
        }
      }

      // Cache results
      searchCacheRef.current.set(cacheKey, { cities: allCities, locations: mappedLocations });
      setCityResults(allCities);
      setLocationResults(mappedLocations.slice(0, 8));
    } catch (error) {
      console.error('Search error:', error);
      setCityResults([]);
      setLocationResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCurrentLocation = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (location && location.city && location.city !== 'Unknown City') {
      onCitySelect(location.city, { lat: location.latitude, lng: location.longitude });
      onSearchChange(location.city);
      onCenterStatusChange?.(true);
    }
    getCurrentLocation();
  };

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only track one pointer at a time
      if (activePointerIdRef.current !== null) return;

      // If user is scrolling inside content, only allow drag-to-close when scroll is at top
      const isFromScrollable = (e.target as HTMLElement | null)?.closest?.('[data-drawer-scroll]');
      if (isFromScrollable && (scrollRef.current?.scrollTop || 0) > 0) return;

      activePointerIdRef.current = e.pointerId;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

      // Track which mode we started from to decide what we snap to on release.
      dragStartedModeRef.current = drawerMode;
      dragStartedOpenRef.current = drawerMode !== 'closed';

      setIsDragging(true);
      dragStartY.current = e.clientY;
      dragStartProgress.current = dragProgress;
      velocityRef.current = 0;
      lastYRef.current = e.clientY;
      lastTimeRef.current = Date.now();
    },
    [dragProgress, drawerMode]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      if (activePointerIdRef.current !== e.pointerId) return;

      const currentY = e.clientY;
      const currentTime = Date.now();
      const deltaTime = currentTime - lastTimeRef.current;

      if (deltaTime > 0) {
        velocityRef.current = (lastYRef.current - currentY) / deltaTime;
      }
      lastYRef.current = currentY;
      lastTimeRef.current = currentTime;

      const deltaY = dragStartY.current - currentY;
      // Smaller distance => easier swipe-down to close on mobile
      const maxDrag = window.innerHeight * 0.4;

      const dragDelta = deltaY / maxDrag;
      let newProgress = dragStartProgress.current + dragDelta;

      // Allow full range - rubber band at edges
      if (newProgress < 0) {
        newProgress = newProgress * 0.3;
      } else if (newProgress > 1) {
        newProgress = 1 + (newProgress - 1) * 0.3;
      }

      setDragProgress(Math.max(-0.1, Math.min(1.1, newProgress)));
    },
    [isDragging]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      if (activePointerIdRef.current !== e.pointerId) return;

      setIsDragging(false);
      activePointerIdRef.current = null;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}

      const startedMode = dragStartedModeRef.current;
      const velocity = velocityRef.current;
      const strongSwipeThreshold = 0.25; // Lower for easier closing
      const swipeThreshold = 0.1; // More sensitive for iOS feel
      const isStrongSwipeDown = velocity < -strongSwipeThreshold;
      const isSwipeUp = velocity > swipeThreshold;
      const isSwipeDown = velocity < -swipeThreshold;

      // Define snap points
      const CLOSED = 0;
      const TRENDING = TRENDING_PROGRESS;
      const SEARCH = 1;

      let targetMode: DrawerMode;
      let targetProgress: number;

      if (startedMode === 'closed') {
        // From closed: can only open to Trending
        if (dragProgress > 0.08) {
          targetMode = 'trending';
          targetProgress = TRENDING;
        } else {
          targetMode = 'closed';
          targetProgress = CLOSED;
        }
      } else if (startedMode === 'trending') {
        // From Trending: can go to Search (up) or Closed (down)
        if (isSwipeUp || dragProgress > (TRENDING + SEARCH) / 2) {
          // Expand to Search
          targetMode = 'search';
          targetProgress = SEARCH;
          setTimeout(() => inputRef.current?.focus(), 100);
        } else if (isSwipeDown || dragProgress < TRENDING / 2) {
          // Close
          targetMode = 'closed';
          targetProgress = CLOSED;
        } else {
          // Stay at Trending
          targetMode = 'trending';
          targetProgress = TRENDING;
        }
      } else {
        // From Search: can go to Trending (gentle down) or Closed (strong down)
        if (isStrongSwipeDown) {
          // Strong swipe = close completely
          targetMode = 'closed';
          targetProgress = CLOSED;
      } else if (isSwipeDown || dragProgress < 0.75) {
          // Gentle swipe down = go to Trending (easier threshold)
          targetMode = 'trending';
          targetProgress = TRENDING;
        } else {
          // Stay at Search
          targetMode = 'search';
          targetProgress = SEARCH;
        }
      }

      setDrawerMode(targetMode);
      setDragProgress(targetProgress);
      dragStartedOpenRef.current = false;
    },
    [isDragging, dragProgress]
  );

  // Touch fallback (some mobile WebViews can be flaky with Pointer Events)
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (touchActiveRef.current) return;
      const isFromScrollable = (e.target as HTMLElement | null)?.closest?.('[data-drawer-scroll]');
      if (isFromScrollable && (scrollRef.current?.scrollTop || 0) > 0) return;

      touchActiveRef.current = true;
      dragStartedModeRef.current = drawerMode;
      dragStartedOpenRef.current = drawerMode !== 'closed';
      setIsDragging(true);
      dragStartY.current = e.touches[0]?.clientY ?? 0;
      dragStartProgress.current = dragProgress;
      velocityRef.current = 0;
      lastYRef.current = dragStartY.current;
      lastTimeRef.current = Date.now();
    },
    [dragProgress, drawerMode]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging || !touchActiveRef.current) return;
      e.preventDefault();

      const currentY = e.touches[0]?.clientY ?? 0;
      const currentTime = Date.now();
      const deltaTime = currentTime - lastTimeRef.current;

      if (deltaTime > 0) {
        velocityRef.current = (lastYRef.current - currentY) / deltaTime;
      }
      lastYRef.current = currentY;
      lastTimeRef.current = currentTime;

      const deltaY = dragStartY.current - currentY;
      const maxDrag = window.innerHeight * 0.4;
      const dragDelta = deltaY / maxDrag;
      let newProgress = dragStartProgress.current + dragDelta;

      // Allow full range - rubber band at edges
      if (newProgress < 0) {
        newProgress = newProgress * 0.3;
      } else if (newProgress > 1) {
        newProgress = 1 + (newProgress - 1) * 0.3;
      }

      setDragProgress(Math.max(-0.1, Math.min(1.1, newProgress)));
    },
    [isDragging]
  );

  const handleTouchEnd = useCallback(() => {
    if (!touchActiveRef.current) return;

    setIsDragging(false);
    touchActiveRef.current = false;

    const startedMode = dragStartedModeRef.current;
    const velocity = velocityRef.current;
    const strongSwipeThreshold = 0.25; // Lower for easier closing
    const swipeThreshold = 0.1; // More sensitive for iOS feel
    const isStrongSwipeDown = velocity < -strongSwipeThreshold;
    const isSwipeUp = velocity > swipeThreshold;
    const isSwipeDown = velocity < -swipeThreshold;

    // Define snap points
    const CLOSED = 0;
    const TRENDING = TRENDING_PROGRESS;
    const SEARCH = 1;

    let targetMode: DrawerMode;
    let targetProgress: number;

    if (startedMode === 'closed') {
      // From closed: can only open to Trending
      if (dragProgress > 0.08) {
        targetMode = 'trending';
        targetProgress = TRENDING;
      } else {
        targetMode = 'closed';
        targetProgress = CLOSED;
      }
    } else if (startedMode === 'trending') {
      // From Trending: can go to Search (up) or Closed (down)
      if (isSwipeUp || dragProgress > (TRENDING + SEARCH) / 2) {
        // Expand to Search
        targetMode = 'search';
        targetProgress = SEARCH;
        setTimeout(() => inputRef.current?.focus(), 100);
      } else if (isSwipeDown || dragProgress < TRENDING / 2) {
        // Close
        targetMode = 'closed';
        targetProgress = CLOSED;
      } else {
        // Stay at Trending
        targetMode = 'trending';
        targetProgress = TRENDING;
      }
    } else {
      // From Search: can go to Trending (gentle down) or Closed (strong down)
      if (isStrongSwipeDown) {
        // Strong swipe = close completely
        targetMode = 'closed';
        targetProgress = CLOSED;
      } else if (isSwipeDown || dragProgress < 0.75) {
        // Gentle swipe down = go to Trending (easier threshold)
        targetMode = 'trending';
        targetProgress = TRENDING;
      } else {
        // Stay at Search
        targetMode = 'search';
        targetProgress = SEARCH;
      }
    }

    setDrawerMode(targetMode);
    setDragProgress(targetProgress);
    dragStartedOpenRef.current = false;
  }, [dragProgress]);

  // Trending mode opens to a medium height so the layout is fully readable (like Search),
  // while still leaving map context visible.

  useEffect(() => {
    // Keep dragProgress in sync only for settled states.
    if (isDragging) return;

    if (drawerMode === 'search') {
      setDragProgress(1);
      return;
    }

    if (drawerMode === 'trending') {
      if (dragProgress !== TRENDING_PROGRESS) setDragProgress(TRENDING_PROGRESS);
      return;
    }

    // drawerMode === 'closed'
    if (dragProgress !== 0) setDragProgress(0);
  }, [drawerMode, isDragging, dragProgress]);

  const handleClose = () => {
    setIsDragging(false);
    activePointerIdRef.current = null;
    touchActiveRef.current = false;
    velocityRef.current = 0;
    setDrawerMode('closed');
    setDragProgress(0);
    setInternalQuery('');
    setCityResults([]);
    setLocationResults([]);
  };

  const handleCitySelect = (city: { name: string; lat: number; lng: number }) => {
    const displayName = translateCityName(city.name, i18n.language);
    onCitySelect(displayName, { lat: city.lat, lng: city.lng });
    onSearchChange(displayName);
    handleClose();
  };

  const handleLocationResultSelect = async (loc: LocationResult) => {
    // If this is a Google result without coordinates, fetch details first
    if (loc.google_place_id && loc.lat === 0 && loc.lng === 0) {
      setIsLoading(true);
      try {
        const response = await supabase.functions.invoke('google-places-search', {
          body: {
            action: 'details',
            placeId: loc.google_place_id,
          },
        });

        if (response.data?.details) {
          const details = response.data.details;
          const resolvedLoc: LocationResult = {
            ...loc,
            lat: details.geometry.location.lat,
            lng: details.geometry.location.lng,
            city: details.city || loc.city,
            address: details.formatted_address || loc.address,
            category: (details.category || loc.category) as AllowedCategory,
          };
          
          onCitySelect(resolvedLoc.city, { lat: resolvedLoc.lat, lng: resolvedLoc.lng });
          onSpotSelect?.({
            id: resolvedLoc.id,
            name: resolvedLoc.name,
            category: resolvedLoc.category,
            city: resolvedLoc.city,
            address: resolvedLoc.address,
            google_place_id: loc.google_place_id,
            savesCount: 0,
            coordinates: { lat: resolvedLoc.lat, lng: resolvedLoc.lng },
          });
          handleClose();
          return;
        }
      } catch (err) {
        console.error('Failed to get place details:', err);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Normal location from database with coordinates
    onCitySelect(loc.city, { lat: loc.lat, lng: loc.lng });
    onSpotSelect?.({
      id: loc.id,
      name: loc.name,
      category: loc.category,
      city: loc.city,
      address: loc.address,
      google_place_id: loc.google_place_id,
      savesCount: 0,
      coordinates: { lat: loc.lat, lng: loc.lng },
    });
    handleClose();
  };

  const handleNearbyPromptClick = async (prompt: NearbyPromptItem) => {
    console.log('[NearbySearch] Clicked:', prompt.id);
    
    // Get current location or request it
    let userLat = location?.latitude;
    let userLng = location?.longitude;
    
    if (!userLat || !userLng) {
      console.log('[NearbySearch] No location, requesting...');
      getCurrentLocation();
      return; // Will retry when location updates
    }
    
    setActiveNearbyCategory(prompt.id);
    setIsLoading(true);
    setNearbyResults([]);
    
    console.log('[NearbySearch] Searching:', prompt.id, 'at', userLat, userLng);
    
    try {
      const results = await searchNearbyByCategory(
        prompt.id,
        { lat: userLat, lng: userLng },
        2000 // 2km radius for faster results
      );
      console.log('[NearbySearch] Results:', results.length);
      setNearbyResults(results);
    } catch (err) {
      console.error('[NearbySearch] Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNearbyResultSelect = (result: NearbySearchResult) => {
    onCitySelect(result.city || currentCity, { lat: result.lat, lng: result.lng });
    onSpotSelect?.({
      id: result.id,
      name: result.name,
      category: result.category,
      city: result.city || currentCity,
      address: result.address,
      savesCount: 0,
      coordinates: { lat: result.lat, lng: result.lng },
    });
    handleClose();
  };

  const clearNearbySearch = () => {
    setActiveNearbyCategory(null);
    setNearbyResults([]);
  };

  const handleSearchBarClick = () => {
    if (drawerMode === 'closed') {
      // Click from closed → open Trending (Photo 1)
      setDrawerMode('trending');
      setDragProgress(TRENDING_PROGRESS);
    } else if (drawerMode === 'trending') {
      // Click in Trending → open Search (Photo 2)
      setDrawerMode('search');
      setDragProgress(1);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // Calculate expanded height - smoothly interpolate between trending and search heights
  const trendingHeight = 176; // Compact: fits pills + 1 row of cards without dead space
  const searchHeight = window.innerHeight * 0.80; // Larger for search results
  
  // Interpolate height based on progress for smooth transitions
  let expandedHeight: number;
  const clampedProgress = Math.max(0, dragProgress);
  if (clampedProgress <= TRENDING_PROGRESS) {
    // From 0 to TRENDING_PROGRESS: scale to trending height
    expandedHeight = (clampedProgress / TRENDING_PROGRESS) * trendingHeight;
  } else {
    // From TRENDING_PROGRESS to 1: interpolate from trending to search height
    const extraProgress = (clampedProgress - TRENDING_PROGRESS) / (1 - TRENDING_PROGRESS);
    expandedHeight = trendingHeight + extraProgress * (searchHeight - trendingHeight);
  }
  // Keep opacity at 1 when drawer is visible to avoid transparency
  const expandedOpacity = dragProgress > 0 ? 1 : 0;

  const isSearching = internalQuery.trim().length > 0;
  const hasResults = cityResults.length > 0 || locationResults.length > 0;

  // Hide drawer when modal (like Add overlay) is open
  if (isHiddenByModal) {
    return null;
  }

  return (
    <div
      ref={drawerRef}
      className={cn(
        "z-[1000] flex flex-col-reverse",
        isExpanded ? 'fixed' : 'absolute',
        // When closed (no peek), narrower width; when peek/open, full width
        isDrawerVisible || dragProgress > 0 ? 'left-3 right-3' : 'left-3 right-16'
      )}
      style={{
        bottom: isExpanded
          ? 'calc(env(safe-area-inset-bottom, 0px) + 1rem)'
          : 'calc(5.75rem + env(safe-area-inset-bottom, 0px))',
        transition: (isDragging || isInitialRender) ? 'none' : 'all 0.55s cubic-bezier(0.32, 0.72, 0, 1)',
      }}
    >
      {/* Search bar at bottom - keep rendered while dragging to avoid losing pointer capture */}
      {(dragProgress === 0 || isDragging) && (
        <div 
          className="w-full relative bg-zinc-900 dark:bg-white border border-zinc-800 dark:border-zinc-200 rounded-full shadow-lg cursor-pointer"
          onClick={handleSearchBarClick}
        >
          {/* Invisible drag handle area at top */}
          <div
            className="absolute inset-x-0 top-0 h-full"
            style={{ touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          />
          <div className="relative flex items-center h-12 pointer-events-none">
            {showLogoInBar ? (
              /* Branding logo - aligned left in bar */
              <div className="h-full pl-4 flex items-center">
                <img 
                  src={spottLogoTransparent} 
                  alt="SPOTT" 
                  className="h-12 w-auto"
                />
              </div>
            ) : (
              <>
                {/* Left area - pin + city name */}
                <div className="h-full pl-4 flex items-center flex-1">
                  <span className="text-lg leading-none">🔎</span>
                  <span className="ml-3 text-base font-medium text-white dark:text-gray-900 leading-none">
                    {currentCity || t('searchCities', { ns: 'home' })}
                  </span>
                </div>

                {/* Repositioning button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCurrentLocation(e);
                  }}
                  disabled={geoLoading}
                  className="p-2 mr-3 hover:bg-white/10 dark:hover:bg-black/10 rounded-full transition-colors disabled:opacity-50 pointer-events-auto"
                  aria-label={t('currentLocation', { ns: 'common' })}
                >
                  <Navigation2
                    className={cn(
                      "w-5 h-5 transition-colors rotate-45",
                      isCenteredOnUser ? 'text-blue-400 fill-blue-400' : 'text-blue-400'
                    )}
                  />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Expanded content panel - includes search input at top */}
      <div
        className={cn(
          "w-full overflow-hidden rounded-3xl shadow-2xl border flex flex-col",
          isSearchOpen ? "backdrop-blur-xl bg-background/95 border-border/20" : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
        )}
        style={{
          height: expandedHeight,
          opacity: expandedOpacity,
          transition: (isDragging || isInitialRender)
            ? 'none'
            : 'height 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.3s ease-out',
          display: dragProgress > 0 ? 'flex' : 'none',
          marginBottom: 0,
          willChange: 'height, opacity',
          // Allow scrolling inside the panel; drag is handled only by the top handle
          touchAction: 'pan-y',
        }}
      >
        {/* Fixed header: Drag handle + Search input */}
        <div className={cn(
          "flex-shrink-0 rounded-t-3xl",
          isSearchOpen ? "bg-background/95 backdrop-blur-md" : "bg-white dark:bg-zinc-900"
        )}>
          {/* Drag handle at top - larger touch target */}
          <div
            className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
            style={{ touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            <div className="w-10 h-1 bg-muted-foreground/40 rounded-full" />
          </div>

          {/* Top area: Search bar (Trending) OR Search input (Search mode) */}
          {isSearchOpen ? (
            <div className="flex items-center gap-3 px-4 pb-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">🔍</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={internalQuery}
                  onChange={(e) => setInternalQuery(e.target.value)}
                  placeholder={
                    activeNearbyCategory && isLoading
                      ? t('searchingNearby', {
                          ns: 'explore',
                          category: t(`nearbyPrompts.${activeNearbyCategory}`, { ns: 'explore' }),
                          defaultValue: `Cercando ${activeNearbyCategory} vicini...`,
                        })
                      : t('searchCitiesAndPlaces', { ns: 'explore', defaultValue: 'Cerca città e luoghi...' })
                  }
                  className="w-full pl-9 pr-8 py-2.5 text-sm bg-white dark:bg-background border border-border/40 dark:border-input rounded-3xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder:text-muted-foreground shadow-sm"
                  autoFocus
                  disabled={activeNearbyCategory !== null && isLoading}
                />
              </div>
              <button
                type="button"
                onPointerDown={(e) => {
                  // Prevent drag handlers from starting on the close button
                  e.stopPropagation();
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                className="p-2 rounded-full hover:bg-muted/50 transition-colors flex-shrink-0"
                aria-label={t('close', { ns: 'common', defaultValue: 'Chiudi' })}
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <div
              className="mx-4 mb-1 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center gap-3 px-4 cursor-text shadow-sm"
              onClick={() => {
                setDrawerMode('search');
                setDragProgress(1);
                setTimeout(() => inputRef.current?.focus(), 100);
              }}
              role="button"
              tabIndex={0}
              aria-label={t('searchCitiesAndPlaces', { ns: 'explore', defaultValue: 'Cerca città e luoghi...' })}
            >
              <span className="text-muted-foreground">🔍</span>
              <span className="flex-1 text-sm text-muted-foreground truncate">
                {t('searchCitiesAndPlaces', { ns: 'explore', defaultValue: 'Cerca città e luoghi...' })}
              </span>
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div
          ref={scrollRef}
          data-drawer-scroll
          className={cn(
            "flex-1 overflow-y-auto overscroll-contain",
            isSearchOpen ? "px-4 pb-4 bg-background/95" : "px-3 pb-2 bg-white dark:bg-zinc-900"
          )}
        >
          {/* TRENDING MODE: show the PopularSpots (Tendenza/Sconto/Evento/Promozione/Nuovo) UI */}
          {!isSearchOpen && (
            <div className="pt-1">
              <PopularSpots
                currentCity={currentCity}
                onLocationClick={(coords) => {
                  lastPopularCoordsRef.current = coords;
                }}
                onSpotSelect={(spot) => {
                  onSpotSelect?.(spot);
                  handleClose();
                }}
                onCitySelect={(city) => {
                  const coords = lastPopularCoordsRef.current ?? undefined;
                  onCitySelect(city, coords);
                  onSearchChange(city);
                  lastPopularCoordsRef.current = null;
                  handleClose();
                }}
              />
            </div>
          )}

          {/* SEARCH MODE: keep the existing search UI */}
          {isSearchOpen && (
            <>
              {/* Top 5 cities with most saved locations - hide when nearby category is active */}
              {!isSearching && !activeNearbyCategory && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {(trendingCities.length > 0
                    ? trendingCities.slice(0, 5)
                    : popularCities
                        .slice(0, 5)
                        .map((c) => ({ name: c.name, count: 0, lat: c.lat, lng: c.lng }))
                  ).map((item) => {
                    const translatedName = translateCityName(item.name, i18n.language);
                    const cityData = popularCities.find((c) => c.name.toLowerCase() === item.name.toLowerCase());
                    return (
                      <CityEngagementCard
                        key={item.name}
                        cityName={translatedName}
                        originalCityName={item.name}
                        coords={
                          cityData
                            ? { lat: cityData.lat, lng: cityData.lng }
                            : 'lat' in item && 'lng' in item
                              ? { lat: (item as any).lat, lng: (item as any).lng }
                              : undefined
                        }
                        onClick={() => {
                          const coords = cityData || ('lat' in item ? (item as any) : null);
                          if (coords) {
                            handleCitySelect({
                              name: item.name,
                              lat: coords.lat,
                              lng: coords.lng,
                            });
                          }
                        }}
                        baseCount={'count' in item ? (item as any).count : 0}
                      />
                    );
                  })}
                </div>
              )}

              {/* Find nearby section - only when not searching */}
              {!isSearching && !activeNearbyCategory && (
                <div className="mt-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    {t('findNearby', { ns: 'explore', defaultValue: 'Find nearby' })}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {nearbyPrompts.map((prompt) => (
                      <button
                        key={prompt.id}
                        onClick={() => handleNearbyPromptClick(prompt)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all border shadow-sm hover:shadow-md active:scale-95",
                          "bg-white/60 dark:bg-slate-700/60 hover:bg-white/80 dark:hover:bg-slate-600/60 border-white/50 dark:border-white/20"
                        )}
                      >
                        <span className="text-base">{prompt.emoji}</span>
                        <span className="font-medium text-sm text-foreground">
                          {t(`nearbyPrompts.${prompt.id}`, { ns: 'explore', defaultValue: prompt.id })}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Nearby results - when a category is selected */}
              {activeNearbyCategory && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      {t(`nearbyPrompts.${activeNearbyCategory}`, { ns: 'explore' })}
                    </h3>
                    <button onClick={clearNearbySearch} className="p-1 hover:bg-muted rounded-full">
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : nearbyResults.length > 0 ? (
                    <div className="space-y-2">
                      {nearbyResults.map((result) => {
                        const categoryImage = getCategoryImage(result.category);
                        return (
                          <button
                            key={result.id}
                            onClick={() => handleNearbyResultSelect(result)}
                            className="w-full px-4 py-3 flex items-center gap-3 bg-muted/30 hover:bg-muted/50 transition-colors rounded-xl text-left"
                          >
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <img src={categoryImage} alt={result.category} className="w-8 h-8 object-contain" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-foreground truncate">{result.name}</div>
                              <div className="text-sm text-muted-foreground truncate">
                                {result.distance ? `${result.distance.toFixed(1)} km • ` : ''}{result.address || result.city}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>{t('noResultsFound', { ns: 'explore', defaultValue: 'No results found' })}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Cities Section - when searching */}
              {isSearching && cityResults.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    {t('cities', { ns: 'common', defaultValue: 'Cities' })}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {cityResults.map((city, index) => {
                      const displayName = translateCityName(city.name, i18n.language);
                      return (
                        <CityEngagementCard
                          key={index}
                          cityName={displayName}
                          coords={{ lat: city.lat, lng: city.lng }}
                          onClick={() => handleCitySelect(city)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Locations Section - when searching */}
              {isSearching && locationResults.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    {t('locations', { ns: 'common', defaultValue: 'Locations' })}
                  </div>
                  <div className="space-y-2">
                    {locationResults.map((loc, index) => {
                      const categoryImage = getCategoryImage(loc.category);
                      return (
                        <button
                          key={index}
                          onClick={() => handleLocationResultSelect(loc)}
                          className="w-full px-4 py-3 flex items-center gap-3 bg-muted/30 hover:bg-muted/50 transition-colors rounded-xl text-left"
                        >
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <img src={categoryImage} alt={loc.category} className="w-8 h-8 object-contain" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground truncate">{loc.name}</div>
                            <div className="text-sm text-muted-foreground truncate">
                              {loc.city
                                ? `${loc.city}${loc.address && loc.address !== loc.city ? `, ${loc.address}` : ''}`
                                : loc.address}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* No results */}
              {isSearching && !isLoading && !hasResults && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <img
                    src={noResultsIcon}
                    alt="No results"
                    className="w-14 h-20 mb-3 opacity-70 object-contain"
                  />
                  <p className="text-lg font-medium">
                    {t('noResultsFound', { ns: 'explore', defaultValue: 'Nessun risultato' })}
                  </p>
                  <p className="text-sm opacity-75 mt-1">
                    {t('tryDifferentSearch', { ns: 'explore', defaultValue: "Prova con un'altra ricerca" })}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function to calculate distance
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default SearchDrawer;
