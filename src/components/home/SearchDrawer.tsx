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
import { getCategoryImage } from '@/utils/categoryIcons';
import { nominatimGeocoding } from '@/lib/nominatimGeocoding';
import { searchPhoton } from '@/lib/photonGeocoding';
import { searchOverpass } from '@/lib/overpassGeocoding';
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

// Nearby categories for "Trova nei dintorni" section
interface NearbyCategory {
  id: string;
  label: string;
  emoji: string;
  color: string;
}

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
  
  // Drag state
  const [dragProgress, setDragProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartProgress = useRef(0);
  const velocityRef = useRef(0);
  const lastYRef = useRef(0);
  const lastTimeRef = useRef(0);
  
  // Search results
  const [cityResults, setCityResults] = useState<{ name: string; lat: number; lng: number }[]>([]);
  const [locationResults, setLocationResults] = useState<LocationResult[]>([]);
  const [trendingCities, setTrendingCities] = useState<{ name: string; count: number; lat?: number; lng?: number }[]>([]);
  const searchCacheRef = useRef<Map<string, { cities: { name: string; lat: number; lng: number }[]; locations: LocationResult[] }>>(new Map());
  
  const processedLocationRef = useRef<string>('');

  // Nearby categories
  const nearbyCategories: NearbyCategory[] = [
    { id: 'lunch', label: t('nearbyCategories.lunch', { ns: 'explore', defaultValue: 'Pranzo' }), emoji: '🍴', color: 'bg-orange-500' },
    { id: 'pizzeria', label: t('nearbyCategories.pizzeria', { ns: 'explore', defaultValue: 'Pizzerie' }), emoji: '🍕', color: 'bg-orange-400' },
    { id: 'gas', label: t('nearbyCategories.gas', { ns: 'explore', defaultValue: 'Benzinai' }), emoji: '⛽', color: 'bg-blue-500' },
    { id: 'grocery', label: t('nearbyCategories.grocery', { ns: 'explore', defaultValue: 'Negozio di alimentari' }), emoji: '🛒', color: 'bg-yellow-500' },
    { id: 'parking', label: t('nearbyCategories.parking', { ns: 'explore', defaultValue: 'Parcheggi' }), emoji: '🅿️', color: 'bg-blue-600' },
    { id: 'bar', label: t('nearbyCategories.bar', { ns: 'explore', defaultValue: 'Bar' }), emoji: '🍸', color: 'bg-orange-500' },
    { id: 'pharmacy', label: t('nearbyCategories.pharmacy', { ns: 'explore', defaultValue: 'Farmacie' }), emoji: '💊', color: 'bg-pink-500' },
    { id: 'fastfood', label: t('nearbyCategories.fastfood', { ns: 'explore', defaultValue: 'Fast food' }), emoji: '🍔', color: 'bg-orange-500' },
    { id: 'bikesharing', label: t('nearbyCategories.bikesharing', { ns: 'explore', defaultValue: 'Servizi di bike sharing' }), emoji: '🚲', color: 'bg-green-500' },
  ];

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

  // Fetch trending cities when drawer opens
  useEffect(() => {
    if (!isDrawerOpen) return;
    fetch('/functions/v1/trending-cities')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        const items = (data?.cities || []).map((c: any) => ({
          name: String(c.city || '').split(',')[0].trim(),
          count: Number(c.total) || 0,
        }));
        const unique = new Map<string, { name: string; count: number }>();
        items.forEach((i: { name: string; count: number }) => {
          const key = i.name.toLowerCase();
          if (!unique.has(key)) unique.set(key, i);
        });
        setTrendingCities(Array.from(unique.values()));
      })
      .catch(() => {
        // ignore errors
      });
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
      (locations || []).forEach(loc => {
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
      (locations || []).forEach(loc => {
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
      const matchingPopularCities = popularCities.filter(city => {
        const cityLower = city.name.toLowerCase();
        return cityLower.includes(queryLower) || cityLower.includes(queryEnglish);
      });

      // Combine unique cities
      const allCities = [...citiesFromLocations.values()];
      matchingPopularCities.forEach(pc => {
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
        
        const existingCoords = new Set(mappedLocations.map(l => `${l.lat.toFixed(4)},${l.lng.toFixed(4)}`));
        const existingNames = new Set(mappedLocations.map(l => l.name.toLowerCase().trim()));
        
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

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    
    setIsDragging(true);
    dragStartY.current = e.touches[0].clientY;
    dragStartProgress.current = dragProgress;
    velocityRef.current = 0;
    lastYRef.current = e.touches[0].clientY;
    lastTimeRef.current = Date.now();
  }, [dragProgress]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const currentY = e.touches[0].clientY;
    const currentTime = Date.now();
    const deltaTime = currentTime - lastTimeRef.current;
    
    if (deltaTime > 0) {
      velocityRef.current = (lastYRef.current - currentY) / deltaTime;
    }
    lastYRef.current = currentY;
    lastTimeRef.current = currentTime;
    
    const deltaY = dragStartY.current - currentY;
    const maxDrag = window.innerHeight * 0.55; // Max height is 55% of screen
    
    const dragDelta = deltaY / maxDrag;
    let newProgress = dragStartProgress.current + dragDelta;
    
    if (newProgress < 0) {
      newProgress = newProgress * 0.3;
    } else if (newProgress > 1) {
      newProgress = 1 + (newProgress - 1) * 0.3;
    }
    
    setDragProgress(Math.max(-0.1, Math.min(1.1, newProgress)));
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const velocityThreshold = 0.3;
    const openThreshold = 0.3;
    
    let shouldOpen: boolean;
    
    if (Math.abs(velocityRef.current) > velocityThreshold) {
      shouldOpen = velocityRef.current > 0;
    } else {
      shouldOpen = dragProgress > openThreshold;
    }
    
    setDragProgress(shouldOpen ? 1 : 0);
    setIsDrawerOpen(shouldOpen);
    
    // Focus input when opening
    if (shouldOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isDragging, dragProgress]);

  useEffect(() => {
    if (!isDragging) {
      setDragProgress(isDrawerOpen ? 1 : 0);
    }
  }, [isDrawerOpen, isDragging]);

  const handleClose = () => {
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

  const handleNearbyCategoryClick = (category: NearbyCategory) => {
    setInternalQuery(category.label);
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
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Search bar at bottom - hide when drawer is open */}
      {!isDrawerOpen && (
        <div 
          className="w-full relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-xl border border-border/30 rounded-full"
          style={{ touchAction: 'none' }}
          onClick={handleSearchBarClick}
        >
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              placeholder={t('searchCities', { ns: 'home' })}
              value={currentCity ? `📌  ${currentCity}` : ''}
              readOnly
              className="w-full h-9 pl-4 pr-12 bg-transparent focus:outline-none transition-all placeholder:text-muted-foreground text-sm font-medium text-foreground cursor-pointer"
            />
            <button
              onClick={handleCurrentLocation}
              disabled={geoLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-accent/50 rounded-full transition-colors disabled:opacity-50"
              aria-label={t('currentLocation', { ns: 'common' })}
            >
              <Navigation2 className={cn("w-4 h-4 transition-colors rotate-45", isCenteredOnUser ? "text-primary fill-primary" : "text-primary")} />
            </button>
          </div>
        </div>
      )}

      {/* Expanded content panel - includes search input at top */}
      <div 
        className="w-full overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-xl border border-border/30 flex flex-col"
        style={{
          height: expandedHeight,
          opacity: expandedOpacity,
          transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          display: dragProgress > 0 ? 'flex' : 'none',
          marginBottom: isDrawerOpen ? 0 : 8,
        }}
      >
        {/* Fixed header: Drag handle + Search input */}
        <div className="flex-shrink-0">
          {/* Drag handle at top */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 bg-muted-foreground/40 rounded-full" />
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
                  placeholder={t('searchCitiesAndPlaces', { ns: 'explore', defaultValue: 'Cerca città e luoghi...' })}
                  className="w-full pl-9 pr-8 py-2.5 text-sm bg-muted/50 border border-border rounded-3xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder:text-muted-foreground"
                  autoFocus
                />
                {isLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                className="p-2 rounded-full hover:bg-muted/50 transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          )}
        </div>
        
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {/* Top 5 cities with most saved locations */}
          {!isSearching && (
            <div className="flex flex-wrap gap-2 mb-4">
              {(trendingCities.length > 0 
                ? trendingCities.slice(0, 5) 
                : popularCities.slice(0, 5).map(c => ({ name: c.name, count: 0, lat: c.lat, lng: c.lng }))
              ).map((item) => {
                const translatedName = translateCityName(item.name, i18n.language);
                const cityData = popularCities.find(c => c.name.toLowerCase() === item.name.toLowerCase());
                return (
                  <CityEngagementCard
                    key={item.name}
                    cityName={translatedName}
                    coords={cityData ? { lat: cityData.lat, lng: cityData.lng } : ('lat' in item && 'lng' in item ? { lat: (item as any).lat, lng: (item as any).lng } : undefined)}
                    onClick={() => {
                      const coords = cityData || ('lat' in item ? item as any : null);
                      if (coords) {
                        handleCitySelect({
                          name: item.name,
                          lat: coords.lat,
                          lng: coords.lng
                        });
                      }
                    }}
                    baseCount={'count' in item ? (item as any).count : 0}
                  />
                );
              })}
            </div>
          )}

          {/* Trova nei dintorni section - only when not searching */}
          {!isSearching && (
            <div className="mt-2">
              <h3 className="text-lg font-semibold text-foreground mb-3">
                {t('findNearby', { ns: 'explore', defaultValue: 'Trova nei dintorni' })}
              </h3>
              <div className="bg-muted/30 rounded-2xl overflow-hidden divide-y divide-border/50">
                {nearbyCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleNearbyCategoryClick(category)}
                    className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className={`w-9 h-9 rounded-full ${category.color} flex items-center justify-center`}>
                      <span className="text-lg">{category.emoji}</span>
                    </div>
                    <span className="font-medium text-foreground">{category.label}</span>
                  </button>
                ))}
              </div>
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
