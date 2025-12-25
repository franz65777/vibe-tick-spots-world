import React, { useState, useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import CityEngagementCard from './CityEngagementCard';
import { useTranslation } from 'react-i18next';
import { translateCityName, reverseTranslateCityName } from '@/utils/cityTranslations';
import { getCategoryImage } from '@/utils/categoryIcons';
import { useGeolocation } from '@/hooks/useGeolocation';
import type { AllowedCategory } from '@/utils/allowedCategories';
import { nominatimGeocoding } from '@/lib/nominatimGeocoding';
import { searchPhoton } from '@/lib/photonGeocoding';
import { searchOverpass } from '@/lib/overpassGeocoding';
import noResultsIcon from '@/assets/no-results-pin.png';

// Category icons for loading animation
const CATEGORY_LIST: AllowedCategory[] = ['restaurant', 'cafe', 'bar', 'bakery', 'hotel', 'museum', 'entertainment'];

// Animated category loading component
const CategoryLoadingCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % CATEGORY_LIST.length);
    }, 300);
    return () => clearInterval(interval);
  }, []);
  
  // Restaurant and hotel icons need larger size due to their design
  const getIconSize = (category: AllowedCategory) => {
    if (category === 'restaurant' || category === 'hotel') {
      return 'w-8 h-8';
    }
    return 'w-6 h-6';
  };
  
  return (
    <div className="flex items-center justify-center">
      <div className="relative w-8 h-8">
        {CATEGORY_LIST.map((category, idx) => (
          <img
            key={category}
            src={getCategoryImage(category)}
            alt=""
            className={`absolute inset-0 m-auto ${getIconSize(category)} object-contain transition-opacity duration-200 ${
              idx === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

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
    // Reduced debounce for faster response
    const timer = setTimeout(() => {
      searchAll(queryTrimmed);
    }, 80);

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

      // Map to LocationResult format with deduplication by normalized name + coordinates
      const seenLocations = new Map<string, LocationResult>();
      (locations || []).forEach(loc => {
        const normalizedName = loc.name.toLowerCase().trim();
        const coordKey = `${loc.latitude!.toFixed(4)},${loc.longitude!.toFixed(4)}`;
        // Use name+coord combination for dedup, keep first occurrence
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
      if (userLocation && mappedLocations.length > 0) {
        mappedLocations.sort((a, b) => {
          const distA = calculateDistance(userLocation.latitude, userLocation.longitude, a.lat, a.lng);
          const distB = calculateDistance(userLocation.latitude, userLocation.longitude, b.lat, b.lng);
          return distA - distB;
        });
      }

      // Known suburbs/neighborhoods that should NOT appear as cities (map to parent city)
      const suburbToCity: Record<string, string> = {
        'blackrock': 'dublin', 'dun laoghaire': 'dublin', 'dalkey': 'dublin', 'killiney': 'dublin',
        'rathmines': 'dublin', 'ranelagh': 'dublin', 'ballsbridge': 'dublin', 'sandymount': 'dublin',
        'clontarf': 'dublin', 'howth': 'dublin', 'malahide': 'dublin', 'swords': 'dublin',
        'tallaght': 'dublin', 'dundrum': 'dublin', 'stillorgan': 'dublin', 'foxrock': 'dublin',
        'bray': 'dublin', 'greystones': 'dublin', 'lucan': 'dublin', 'blanchardstown': 'dublin',
        'brooklyn': 'new york', 'manhattan': 'new york', 'queens': 'new york', 'bronx': 'new york',
        'staten island': 'new york', 'harlem': 'new york', 'soho': 'new york', 'tribeca': 'new york',
        'camden': 'london', 'westminster': 'london', 'kensington': 'london', 'chelsea': 'london',
        'hackney': 'london', 'brixton': 'london', 'shoreditch': 'london', 'notting hill': 'london',
        'montmartre': 'paris', 'le marais': 'paris', 'belleville': 'paris', 'bastille': 'paris',
        'trastevere': 'rome', 'testaccio': 'rome', 'prati': 'rome', 'monti': 'rome',
        'shibuya': 'tokyo', 'shinjuku': 'tokyo', 'roppongi': 'tokyo', 'ginza': 'tokyo',
        'el born': 'barcelona', 'gracia': 'barcelona', 'barceloneta': 'barcelona',
        'jordaan': 'amsterdam', 'de pijp': 'amsterdam',
      };

      // Extract unique cities - normalize to English and filter out suburbs
      const citiesFromLocations = new Map<string, CityResult>();
      (locations || []).forEach(loc => {
        if (loc.city && loc.latitude && loc.longitude) {
          let cityLower = loc.city.toLowerCase().trim();
          
          // Check if it's a suburb and map to parent city
          if (suburbToCity[cityLower]) {
            cityLower = suburbToCity[cityLower];
          }
          
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

      // If few results from database, search multiple FREE APIs in parallel
      if (allCities.length === 0 || mappedLocations.length < 5) {
        const userLoc = userLocation ? { lat: userLocation.latitude, lng: userLocation.longitude } : undefined;
        
        // Search all free APIs in parallel for maximum coverage
        const [nominatimResults, photonResults, overpassResults] = await Promise.all([
          nominatimGeocoding.searchPlace(queryLower, i18n.language, userLoc).catch(() => []),
          searchPhoton(queryLower, userLoc, 20).catch(() => []),
          userLoc ? searchOverpass(queryLower, userLoc, 15).catch(() => []) : Promise.resolve([]),
        ]);
        
        // Track existing coordinates AND names to avoid duplicates
        const existingCoords = new Set(mappedLocations.map(l => `${l.lat.toFixed(4)},${l.lng.toFixed(4)}`));
        const existingNames = new Set(mappedLocations.map(l => l.name.toLowerCase().trim()));
        
        // Helper to check if name is similar to existing
        const isNameDuplicate = (name: string) => {
          const normalized = name.toLowerCase().trim();
          if (existingNames.has(normalized)) return true;
          // Check for very similar names (>85% match)
          for (const existing of existingNames) {
            if (normalized.includes(existing) || existing.includes(normalized)) return true;
          }
          return false;
        };
        
        // Extract cities from Nominatim results - actual cities AND admin-capitals like Abu Dhabi
        const nominatimCities = new Map<string, CityResult>();
        const allowedPlaceTypes = new Set([
          'city',
          'town',
          'village',
          'administrative',
          'state',
          'province',
          'region',
          'capital',
        ]);

        nominatimResults.forEach((result) => {
          // Nominatim varies a lot by country: Abu Dhabi often comes back as "administrative".
          const isPlace = result.class === 'place' || result.class === 'boundary' || result.class === 'administrative';
          const isCityLike = !!result.type && allowedPlaceTypes.has(result.type);
          if (!isPlace || !isCityLike) return;

          const cityName = result.name || result.displayName.split(',')[0];
          const cityKey = reverseTranslateCityName(cityName).toLowerCase();

          // Pretty label (Title Case) for display + downstream city matching
          const cityCanonical = cityKey
            .split(/\s+/)
            .filter(Boolean)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');

          // Skip known suburbs/neighborhoods
          if (suburbToCity[cityKey]) return;

          if (!nominatimCities.has(cityKey) && !citiesFromLocations.has(cityKey)) {
            nominatimCities.set(cityKey, {
              name: cityCanonical,
              lat: result.lat,
              lng: result.lng,
            });
          }
        });

        nominatimCities.forEach((city) => allCities.push(city));
        
        // Add Nominatim POI locations
        const allowedOsmTypes = ['restaurant', 'cafe', 'bar', 'pub', 'bakery', 'hotel', 'museum', 'nightclub', 'cinema', 'theatre', 'park'];
        nominatimResults
          .filter(r => r.type && allowedOsmTypes.includes(r.type))
          .forEach((result, idx) => {
            const coordKey = `${result.lat.toFixed(4)},${result.lng.toFixed(4)}`;
            const resultName = result.name || result.displayName.split(',')[0];
            if (!existingCoords.has(coordKey) && !isNameDuplicate(resultName)) {
              mappedLocations.push({
                id: `nominatim-${idx}`,
                name: resultName,
                city: result.city,
                address: result.streetName ? `${result.city}, ${result.streetName}${result.streetNumber ? ' ' + result.streetNumber : ''}` : result.city,
                lat: result.lat,
                lng: result.lng,
                category: mapOsmTypeToCategory(result.type),
              });
              existingCoords.add(coordKey);
              existingNames.add(resultName.toLowerCase().trim());
            }
          });
        
        // Add Photon results (fast autocomplete API with good POI coverage)
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
        
        // Add Overpass results (direct OSM queries for nearby POIs)
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
        
        // Re-sort all locations by distance if user location available
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
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={t('searchCitiesAndPlaces', { ns: 'explore', defaultValue: 'Search cities and places...' })}
              className="w-full pl-10 pr-10 py-3 text-base bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder:text-muted-foreground"
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <CategoryLoadingCarousel />
              </div>
            )}
          </div>
          {isFocused && (
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                inputRef.current?.blur();
                onClose();
              }}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
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
                        {/* Show city first, then address */}
                        {location.city ? `${location.city}${location.address && location.address !== location.city ? `, ${location.address}` : ''}` : location.address}
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
