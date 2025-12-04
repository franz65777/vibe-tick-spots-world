import React, { useState, useEffect, useRef } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import CityEngagementCard from './CityEngagementCard';
import { useTranslation } from 'react-i18next';
import { translateCityName, reverseTranslateCityName } from '@/utils/cityTranslations';
import { getCategoryImage } from '@/utils/categoryIcons';
import { useGeolocation } from '@/hooks/useGeolocation';
import type { AllowedCategory } from '@/utils/allowedCategories';
import { nominatimGeocoding } from '@/lib/nominatimGeocoding';
import noResultsIcon from '@/assets/no-results-pin.png';

interface UnifiedSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onCitySelect?: (city: string, coordinates: { lat: number; lng: number }) => void;
  onLocationSelect?: (location: LocationResult) => void;
}

interface CityResult {
  name: string;
  lat: number;
  lng: number;
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

const UnifiedSearchOverlay = ({ isOpen, onClose, onCitySelect, onLocationSelect }: UnifiedSearchOverlayProps) => {
  const { t, i18n } = useTranslation();
  const { location: userLocation } = useGeolocation();
  const [query, setQuery] = useState('');
  const [cityResults, setCityResults] = useState<CityResult[]>([]);
  const [locationResults, setLocationResults] = useState<LocationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [trendingCities, setTrendingCities] = useState<{ name: string; count: number }[]>([]);
  const searchCacheRef = useRef<Map<string, { cities: CityResult[]; locations: LocationResult[] }>>(new Map());

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

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Close overlay with Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Fetch trending cities (global engagement counts)
  useEffect(() => {
    if (!isOpen) return;
    fetch('/functions/v1/trending-cities')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        const items = (data?.cities || []).map((c: any) => ({
          name: String(c.city || '').split(',')[0].trim(),
          count: Number(c.total) || 0,
        }));
        const unique = new Map<string, { name: string; count: number }>();
        items.forEach((i) => {
          const key = i.name.toLowerCase();
          if (!unique.has(key)) unique.set(key, i);
        });
        setTrendingCities(Array.from(unique.values()));
      })
      .catch(() => {
        // ignore errors, we'll fallback to static list
      });
  }, [isOpen]);

  useEffect(() => {
    const queryTrimmed = query.trim().toLowerCase();
    const cacheKey = `${queryTrimmed}-${i18n.language}`;
    
    if (!queryTrimmed) {
      setCityResults([]);
      setLocationResults([]);
      setLoading(false);
      return;
    }
    
    // Check cache first - show immediately without debounce
    if (searchCacheRef.current.has(cacheKey)) {
      const cached = searchCacheRef.current.get(cacheKey)!;
      setCityResults(cached.cities);
      setLocationResults(cached.locations);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const timer = setTimeout(() => {
      searchAll(queryTrimmed);
    }, 150);

    return () => clearTimeout(timer);
  }, [query, i18n.language]);

  const searchAll = async (queryLower: string) => {
    if (!queryLower) return;

    const cacheKey = `${queryLower}-${i18n.language}`;
    
    // Check cache first
    if (searchCacheRef.current.has(cacheKey)) {
      const cached = searchCacheRef.current.get(cacheKey)!;
      setCityResults(cached.cities);
      setLocationResults(cached.locations);
      setLoading(false);
      return;
    }

    // Normalize query to English for cross-language matching
    const queryEnglish = reverseTranslateCityName(queryLower).toLowerCase();

    setLoading(true);
    try {
      // Search saved locations from database - search both name AND city
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

      // Map to LocationResult format
      const mappedLocations: LocationResult[] = (locations || []).map(loc => ({
        id: loc.id,
        name: loc.name,
        city: loc.city || '',
        address: loc.address || '',
        lat: loc.latitude!,
        lng: loc.longitude!,
        category: (loc.category || 'restaurant') as AllowedCategory,
      }));

      // Sort by proximity if user location available
      if (userLocation && mappedLocations.length > 0) {
        mappedLocations.sort((a, b) => {
          const distA = calculateDistance(userLocation.latitude, userLocation.longitude, a.lat, a.lng);
          const distB = calculateDistance(userLocation.latitude, userLocation.longitude, b.lat, b.lng);
          return distA - distB;
        });
      }

      // Extract unique cities - normalize to English to merge duplicates like Milano/Milan
      const citiesFromLocations = new Map<string, CityResult>();
      (locations || []).forEach(loc => {
        if (loc.city && loc.latitude && loc.longitude) {
          const cityLower = loc.city.toLowerCase();
          const cityEnglish = reverseTranslateCityName(cityLower).toLowerCase();
          
          // Match if query matches city name OR English normalized name
          if (cityLower.includes(queryLower) || cityEnglish.includes(queryLower) || cityEnglish.includes(queryEnglish)) {
            // Use English name as key to merge translations
            if (!citiesFromLocations.has(cityEnglish)) {
              citiesFromLocations.set(cityEnglish, {
                name: cityEnglish, // Store English name, will translate on display
                lat: loc.latitude,
                lng: loc.longitude,
              });
            }
          }
        }
      });

      // Also check popular cities - match against both original and English query
      const matchingPopularCities = popularCities.filter(city => {
        const cityLower = city.name.toLowerCase();
        return cityLower.includes(queryLower) || cityLower.includes(queryEnglish);
      });

      // Combine unique cities (using English names as keys)
      const allCities = [...citiesFromLocations.values()];
      matchingPopularCities.forEach(pc => {
        const pcEnglish = reverseTranslateCityName(pc.name).toLowerCase();
        if (!citiesFromLocations.has(pcEnglish)) {
          allCities.push({ ...pc, name: pcEnglish });
        }
      });

      // If no results from database/popular, search Nominatim for cities and locations
      if (allCities.length === 0 || mappedLocations.length < 3) {
        const userLoc = userLocation ? { lat: userLocation.latitude, lng: userLocation.longitude } : undefined;
        const nominatimResults = await nominatimGeocoding.searchPlace(queryLower, i18n.language, userLoc);
        
        // Extract cities from Nominatim results
        const nominatimCities = new Map<string, CityResult>();
        nominatimResults.forEach(result => {
          if (result.city) {
            const cityEnglish = reverseTranslateCityName(result.city).toLowerCase();
            if (!nominatimCities.has(cityEnglish) && !citiesFromLocations.has(cityEnglish)) {
              nominatimCities.set(cityEnglish, {
                name: cityEnglish,
                lat: result.lat,
                lng: result.lng,
              });
            }
          }
          // Check if the result itself is a city (class: place, type: city/town/village)
          if (result.class === 'place' && ['city', 'town', 'village'].includes(result.type || '')) {
            const cityName = result.name || result.displayName.split(',')[0];
            const cityEnglish = reverseTranslateCityName(cityName).toLowerCase();
            if (!nominatimCities.has(cityEnglish) && !citiesFromLocations.has(cityEnglish)) {
              nominatimCities.set(cityEnglish, {
                name: cityEnglish,
                lat: result.lat,
                lng: result.lng,
              });
            }
          }
        });
        
        // Add Nominatim cities to results
        nominatimCities.forEach(city => allCities.push(city));
        
        // Extract locations (POIs) from Nominatim - filter to relevant types
        const allowedOsmTypes = ['restaurant', 'cafe', 'bar', 'pub', 'bakery', 'hotel', 'museum', 'nightclub', 'cinema', 'theatre', 'park'];
        const nominatimLocations: LocationResult[] = nominatimResults
          .filter(r => r.type && allowedOsmTypes.includes(r.type))
          .map((result, idx) => ({
            id: `nominatim-${idx}`,
            name: result.name || result.displayName.split(',')[0],
            city: result.city,
            address: result.streetName ? `${result.city}, ${result.streetName}${result.streetNumber ? ' ' + result.streetNumber : ''}` : result.city,
            lat: result.lat,
            lng: result.lng,
            category: mapOsmTypeToCategory(result.type),
          }));
        
        // Merge with database locations, avoiding duplicates
        const existingCoords = new Set(mappedLocations.map(l => `${l.lat.toFixed(4)},${l.lng.toFixed(4)}`));
        nominatimLocations.forEach(loc => {
          const coordKey = `${loc.lat.toFixed(4)},${loc.lng.toFixed(4)}`;
          if (!existingCoords.has(coordKey)) {
            mappedLocations.push(loc);
            existingCoords.add(coordKey);
          }
        });
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
      setLoading(false);
    }
  };

  // Map OSM types to app categories
  const mapOsmTypeToCategory = (osmType?: string): AllowedCategory => {
    if (!osmType) return 'restaurant';
    const mapping: Record<string, AllowedCategory> = {
      restaurant: 'restaurant',
      cafe: 'cafe',
      bar: 'bar',
      pub: 'bar',
      bakery: 'bakery',
      hotel: 'hotel',
      museum: 'museum',
      nightclub: 'entertainment',
      cinema: 'entertainment',
      theatre: 'entertainment',
      park: 'entertainment',
    };
    return mapping[osmType] || 'restaurant';
  };

  const handleCitySelect = (city: { name: string; lat: number; lng: number; address?: string }) => {
    if (onCitySelect) {
      onCitySelect(city.name, { lat: city.lat, lng: city.lng });
    }
    setQuery('');
    setCityResults([]);
    setLocationResults([]);
    onClose();
  };

  const handleLocationSelect = (location: LocationResult) => {
    if (onLocationSelect) {
      onLocationSelect(location);
    }
    setQuery('');
    setCityResults([]);
    setLocationResults([]);
    onClose();
  };

  if (!isOpen) return null;

  const hasResults = cityResults.length > 0 || locationResults.length > 0;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-lg z-[3000] flex flex-col" onClick={onClose}>
      {/* Header with integrated search */}
      <div className="bg-background px-4 pt-[calc(env(safe-area-inset-top)+2.1875rem)] pb-3 shadow-lg border-b border-border" onClick={(e) => e.stopPropagation()}>
        <div className="relative w-full">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={t('searchCitiesAndPlaces', { ns: 'explore', defaultValue: 'Search cities and places...' })}
            className="w-full pl-10 pr-24 py-3 text-base bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder:text-muted-foreground"
          />
          {loading && (
            <Loader2 className="absolute right-16 top-1/2 -translate-y-1/2 w-5 h-5 text-primary animate-spin" />
          )}
          {isFocused && (
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                inputRef.current?.blur();
                onClose();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-primary hover:text-primary/80 transition-colors px-2"
            >
              {t('cancel', { ns: 'common' })}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-background shadow-xl -mt-[0.3125rem]" onClick={(e) => e.stopPropagation()}>
        {/* Popular/Trending cities when no query */}
        {!query.trim() && (
          <div className="flex flex-wrap gap-2 mb-4">
            {(trendingCities.length ? trendingCities : popularCities.map(c => ({ name: c.name, count: 0, lat: c.lat, lng: c.lng }))).map((item) => {
              const translatedName = translateCityName(item.name, i18n.language);
              return (
                <CityEngagementCard
                  key={item.name}
                  cityName={translatedName}
                  coords={'lat' in item && 'lng' in item ? { lat: (item as any).lat, lng: (item as any).lng } : undefined}
                  onClick={() => {
                    if ('lat' in item && 'lng' in item) {
                      handleCitySelect({
                        name: item.name,
                        lat: (item as any).lat,
                        lng: (item as any).lng
                      });
                    }
                  }}
                  baseCount={'count' in item ? (item as any).count : 0}
                />
              );
            })}
          </div>
        )}

        {/* Cities Section */}
        {cityResults.length > 0 && (
          <div className="mb-6">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              {t('cities', { ns: 'common', defaultValue: 'Cities' })}
            </div>
            <div className="flex flex-wrap gap-2">
              {cityResults.map((city, index) => {
                // Translate city name to user's language for display
                const displayName = translateCityName(city.name, i18n.language);
                return (
                  <CityEngagementCard
                    key={index}
                    cityName={displayName}
                    coords={{ lat: city.lat, lng: city.lng }}
                    onClick={() => handleCitySelect({ ...city, name: displayName })}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Locations Section */}
        {locationResults.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              {t('locations', { ns: 'common', defaultValue: 'Locations' })}
            </div>
            <div className="space-y-2">
            {locationResults.map((location, index) => {
                const categoryImage = getCategoryImage(location.category);
                return (
                  <button
                    key={index}
                    onClick={() => handleLocationSelect(location)}
                    className="w-full px-4 py-3 flex items-center gap-3 bg-muted/30 hover:bg-muted/50 transition-colors rounded-xl text-left"
                  >
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <img src={categoryImage} alt={location.category} className="w-8 h-8 object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">
                        {location.name}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {location.address || location.city}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* No results */}
        {query.trim() && !loading && !hasResults && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <img src={noResultsIcon} alt="No results" className="w-14 h-20 mb-3 opacity-70 object-contain" />
            <p className="text-lg font-medium">{t('noResultsFound', { ns: 'explore' })}</p>
            <p className="text-sm opacity-75 mt-1">{t('tryDifferentSearch', { ns: 'explore' })}</p>
          </div>
        )}
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

export default UnifiedSearchOverlay;
