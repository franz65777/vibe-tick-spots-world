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
import { getCategoryImage, getCategoryIcon, getCategoryColor } from '@/utils/categoryIcons';
import { nominatimGeocoding } from '@/lib/nominatimGeocoding';
import { searchPhoton } from '@/lib/photonGeocoding';
import { searchOverpass } from '@/lib/overpassGeocoding';
import { searchNearbyByCategory, type NearbySearchResult, type NearbyPrompt as NearbyPromptType, promptToCategory } from '@/lib/nearbySearch';
import noResultsIcon from '@/assets/no-results-pin.png';
import type { AllowedCategory } from '@/utils/allowedCategories';

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
}

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
}) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { location, loading: geoLoading, getCurrentLocation } = useGeolocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [internalQuery, setInternalQuery] = useState('');
  
  // Drag state (Pointer Events for reliable mobile swipe)
  const [dragProgress, setDragProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartProgress = useRef(0);
  const velocityRef = useRef(0);
  const lastYRef = useRef(0);
  const lastTimeRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const touchActiveRef = useRef(false);

  // Search results
  const [cityResults, setCityResults] = useState<{ name: string; lat: number; lng: number }[]>([]);
  const [locationResults, setLocationResults] = useState<LocationResult[]>([]);
  const [nearbyResults, setNearbyResults] = useState<NearbySearchResult[]>([]);
  const [activeNearbyCategory, setActiveNearbyCategory] = useState<NearbyPromptType | null>(null);
  const [trendingCities, setTrendingCities] = useState<{ name: string; count: number; lat?: number; lng?: number }[]>([]);
  const searchCacheRef = useRef<Map<string, { cities: { name: string; lat: number; lng: number }[]; locations: LocationResult[] }>>(new Map());

  const processedLocationRef = useRef<string>('');

  useEffect(() => {
    onDrawerStateChange?.(isDrawerOpen);
  }, [isDrawerOpen, onDrawerStateChange]);

  useEffect(() => {
    if (!location || !location.city || location.city === 'Unknown City') return;

    const locationKey = `${location.latitude}-${location.longitude}-${location.city}`;
    if (processedLocationRef.current === locationKey) return;

    processedLocationRef.current = locationKey;
    onCitySelect(location.city, { lat: location.latitude, lng: location.longitude });
  }, [location?.latitude, location?.longitude, location?.city]);

  // Fetch trending cities when drawer opens using RPC directly
  useEffect(() => {
    if (!isDrawerOpen) return;

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
  }, [isDrawerOpen]);

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
            city: loc.city || '',
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
          let cityLower = loc.city.toLowerCase().trim();
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

      // If few results, search external APIs
      if (allCities.length === 0 || mappedLocations.length < 5) {
        const userLoc = location ? { lat: location.latitude, lng: location.longitude } : undefined;

        const [nominatimResults, photonResults, overpassResults] = await Promise.all([
          nominatimGeocoding.searchPlace(queryLower, i18n.language, userLoc).catch(() => []),
          searchPhoton(queryLower, userLoc, 20).catch(() => []),
          userLoc ? searchOverpass(queryLower, userLoc, 15).catch(() => []) : Promise.resolve([]),
        ]);

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

        // Add Photon results
        photonResults.forEach((result) => {
          const coordKey = `${result.lat.toFixed(4)},${result.lng.toFixed(4)}`;
          if (!existingCoords.has(coordKey) && !isNameDuplicate(result.name)) {
            mappedLocations.push({
              id: result.id,
              name: result.name,
              city: result.city,
              address: result.displayAddress,
              lat: result.lat,
              lng: result.lng,
              category: result.category,
            });
            existingCoords.add(coordKey);
            existingNames.add(result.name.toLowerCase().trim());
          }
        });

        // Add Overpass results
        overpassResults.forEach((result) => {
          const coordKey = `${result.lat.toFixed(4)},${result.lng.toFixed(4)}`;
          if (!existingCoords.has(coordKey) && !isNameDuplicate(result.name)) {
            mappedLocations.push({
              id: result.id,
              name: result.name,
              city: result.city,
              address: result.address,
              lat: result.lat,
              lng: result.lng,
              category: result.category,
            });
            existingCoords.add(coordKey);
            existingNames.add(result.name.toLowerCase().trim());
          }
        });

        // Re-sort by distance
        if (userLoc && mappedLocations.length > 1) {
          mappedLocations.sort((a, b) => {
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

      // Allow swipe/drag only when open or when touching the drawer surface
      if (e.pointerType === 'mouse' && !isDrawerOpen) return;

      // If user is scrolling inside content, only allow drag-to-close when scroll is at top
      const isFromScrollable = (e.target as HTMLElement | null)?.closest?.('[data-drawer-scroll]');
      if (isFromScrollable && (scrollRef.current?.scrollTop || 0) > 0) return;

      activePointerIdRef.current = e.pointerId;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

      setIsDragging(true);
      dragStartY.current = e.clientY;
      dragStartProgress.current = dragProgress;
      velocityRef.current = 0;
      lastYRef.current = e.clientY;
      lastTimeRef.current = Date.now();
    },
    [dragProgress, isDrawerOpen]
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

      // Rubber banding
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

      const velocityThreshold = 0.2;
      // Higher threshold => less drag needed to close
      const openThreshold = 0.6;

      let shouldOpen: boolean;
      if (Math.abs(velocityRef.current) > velocityThreshold) {
        shouldOpen = velocityRef.current > 0;
      } else {
        shouldOpen = dragProgress > openThreshold;
      }

      setDragProgress(shouldOpen ? 1 : 0);
      setIsDrawerOpen(shouldOpen);

      if (shouldOpen && inputRef.current) {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
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
      setIsDragging(true);
      dragStartY.current = e.touches[0]?.clientY ?? 0;
      dragStartProgress.current = dragProgress;
      velocityRef.current = 0;
      lastYRef.current = dragStartY.current;
      lastTimeRef.current = Date.now();
    },
    [dragProgress]
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

      if (newProgress < 0) newProgress = newProgress * 0.3;
      else if (newProgress > 1) newProgress = 1 + (newProgress - 1) * 0.3;

      setDragProgress(Math.max(-0.1, Math.min(1.1, newProgress)));
    },
    [isDragging]
  );

  const handleTouchEnd = useCallback(() => {
    if (!touchActiveRef.current) return;

    setIsDragging(false);
    touchActiveRef.current = false;

    const velocityThreshold = 0.2;
    const openThreshold = 0.6;

    let shouldOpen: boolean;
    if (Math.abs(velocityRef.current) > velocityThreshold) {
      shouldOpen = velocityRef.current > 0;
    } else {
      shouldOpen = dragProgress > openThreshold;
    }

    setDragProgress(shouldOpen ? 1 : 0);
    setIsDrawerOpen(shouldOpen);

    if (shouldOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [dragProgress]);

  useEffect(() => {
    if (!isDragging) {
      setDragProgress(isDrawerOpen ? 1 : 0);
    }
  }, [isDrawerOpen, isDragging]);

  const handleClose = () => {
    setIsDragging(false);
    activePointerIdRef.current = null;
    touchActiveRef.current = false;
    velocityRef.current = 0;
    setIsDrawerOpen(false);
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

  const handleLocationResultSelect = (loc: LocationResult) => {
    onCitySelect(loc.city, { lat: loc.lat, lng: loc.lng });
    onSpotSelect?.({
      id: loc.id,
      name: loc.name,
      category: loc.category,
      city: loc.city,
      address: loc.address,
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
    if (!isDrawerOpen) {
      setIsDrawerOpen(true);
      setDragProgress(1);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // Calculate expanded height - reaches up to category filters level
  const maxExpandedHeight = window.innerHeight * 0.80;
  const expandedHeight = Math.max(0, dragProgress) * maxExpandedHeight;
  const expandedOpacity = Math.max(0, Math.min(1, dragProgress * 1.5));

  const isSearching = internalQuery.trim().length > 0;
  const hasResults = cityResults.length > 0 || locationResults.length > 0;

  return (
    <div
      ref={drawerRef}
      className={cn(
        "z-[1000] flex flex-col-reverse",
        isExpanded ? 'fixed' : 'absolute',
        // When closed, narrower width; when open, full width
        isDrawerOpen ? 'left-3 right-3' : 'left-3 right-16'
      )}
      style={{
        bottom: isExpanded
          ? 'calc(env(safe-area-inset-bottom, 0px) + 1rem)'
          : 'calc(5.75rem + env(safe-area-inset-bottom, 0px))',
        transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      }}
    >
      {/* Search bar at bottom - hide when drawer is open */}
      {!isDrawerOpen && (
        <div className="w-full relative bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl shadow-2xl border border-white/40 dark:border-white/20 rounded-full">
          {/* Drag handle inside search bar at top - for opening trending */}
          <div 
            className="absolute top-1 left-1/2 -translate-x-1/2 z-10 px-4 py-1 cursor-grab active:cursor-grabbing"
            style={{ touchAction: 'none' }}
          >
            <div className="w-8 h-1 bg-muted-foreground/30 rounded-full" />
          </div>
          <div className="relative flex items-center">
            {/* Left/center clickable area - opens search page */}
            <div 
              className="flex-1 h-11 pl-4 pt-1 flex items-center cursor-pointer"
              onClick={handleSearchBarClick}
            >
              <span className="text-sm font-medium text-foreground">
                {currentCity ? `📌  ${currentCity}` : t('searchCities', { ns: 'home' })}
              </span>
            </div>
            {/* Right button - repositioning */}
            <button
              onClick={(e) => {
                handleCurrentLocation(e);
              }}
              disabled={geoLoading}
              className="p-2 mr-2 hover:bg-accent/50 rounded-full transition-colors disabled:opacity-50"
              aria-label={t('currentLocation', { ns: 'common' })}
            >
              <Navigation2
                className={cn(
                  "w-5 h-5 transition-colors rotate-45",
                  isCenteredOnUser ? 'text-primary fill-primary' : 'text-primary'
                )}
              />
            </button>
          </div>
        </div>
      )}

      {/* Expanded content panel - includes search input at top */}
      <div
        className="w-full overflow-hidden bg-white/40 dark:bg-slate-800/60 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/30 dark:border-white/10 flex flex-col"
        style={{
          height: expandedHeight,
          opacity: expandedOpacity,
          transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          display: dragProgress > 0 ? 'flex' : 'none',
          marginBottom: isDrawerOpen ? 0 : 8,
          // Allow scrolling inside the panel; drag is handled only by the top handle
          touchAction: 'pan-y',
        }}
      >
        {/* Fixed header: Drag handle + Search input */}
        <div className="flex-shrink-0">
          {/* Drag handle at top - larger touch area (drag-to-close) */}
          <div
            className="flex justify-center pt-4 pb-3 cursor-grab active:cursor-grabbing"
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
            <div className="w-14 h-1.5 bg-muted-foreground/60 rounded-full" />
          </div>

          {/* Search input - fixed at top */}
          {isDrawerOpen && (
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
                  className="w-full pl-9 pr-8 py-2.5 text-sm bg-white/60 dark:bg-slate-700/60 border border-white/50 dark:border-white/20 rounded-3xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder:text-muted-foreground"
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
          )}
        </div>

        {/* Scrollable content */}
        <div ref={scrollRef} data-drawer-scroll className="flex-1 overflow-y-auto px-4 pb-4">
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
                        <div className="font-medium text-foreground truncate">
                          {loc.name}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {loc.city ? `${loc.city}${loc.address && loc.address !== loc.city ? `, ${loc.address}` : ''}` : loc.address}
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
              <img src={noResultsIcon} alt="No results" className="w-14 h-20 mb-3 opacity-70 object-contain" />
              <p className="text-lg font-medium">{t('noResultsFound', { ns: 'explore', defaultValue: 'Nessun risultato' })}</p>
              <p className="text-sm opacity-75 mt-1">{t('tryDifferentSearch', { ns: 'explore', defaultValue: 'Prova con un\'altra ricerca' })}</p>
            </div>
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
