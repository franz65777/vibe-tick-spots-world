import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { nominatimGeocoding } from '@/lib/nominatimGeocoding';
import { searchPhoton, PhotonResult } from '@/lib/photonGeocoding';
import CityEngagementCard from './CityEngagementCard';
import { useTranslation } from 'react-i18next';
import { translateCityName } from '@/utils/cityTranslations';
import { getCategoryIcon } from '@/utils/categoryIcons';
import { useGeolocation } from '@/hooks/useGeolocation';

interface UnifiedSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onCitySelect?: (city: string, coordinates: { lat: number; lng: number }) => void;
  onLocationSelect?: (location: PhotonResult) => void;
}

interface CityResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

const UnifiedSearchOverlay = ({ isOpen, onClose, onCitySelect, onLocationSelect }: UnifiedSearchOverlayProps) => {
  const { t, i18n } = useTranslation();
  const { location: userLocation } = useGeolocation();
  const [query, setQuery] = useState('');
  const [cityResults, setCityResults] = useState<CityResult[]>([]);
  const [locationResults, setLocationResults] = useState<PhotonResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [trendingCities, setTrendingCities] = useState<{ name: string; count: number }[]>([]);
  const searchCacheRef = useRef<Map<string, { cities: CityResult[]; locations: PhotonResult[] }>>(new Map());

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
    const cacheKey = `${query.toLowerCase().trim()}-${i18n.language}`;
    
    if (!query.trim()) {
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
      searchAll();
    }, 350); // Longer debounce to let Photon requests complete

    return () => clearTimeout(timer);
  }, [query]);

  const searchAll = async () => {
    if (!query.trim()) return;

    const cacheKey = `${query.toLowerCase()}-${i18n.language}`;
    
    // Check cache first
    if (searchCacheRef.current.has(cacheKey)) {
      const cached = searchCacheRef.current.get(cacheKey)!;
      setCityResults(cached.cities);
      setLocationResults(cached.locations);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const userCoords = userLocation ? { lat: userLocation.latitude, lng: userLocation.longitude } : undefined;
      const queryLower = query.toLowerCase().trim();
      
      // Search both cities and locations in parallel
      const [nominatimResults, photonResults] = await Promise.all([
        nominatimGeocoding.searchPlace(query, i18n.language),
        searchPhoton(query, userCoords, 20)
      ]);
      
      console.log('Photon results:', photonResults.length, photonResults);
      console.log('Nominatim results:', nominatimResults.length);
      
      // Only show cities that actually match the query
      const mappedCities = nominatimResults
        .map(result => ({
          name: result.city || result.displayName.split(',')[0],
          address: result.displayName,
          lat: result.lat,
          lng: result.lng,
        }))
        .filter(city => city.name.toLowerCase().includes(queryLower));

      // Filter locations by proximity (within 500km if user location available)
      let filteredLocations = photonResults;
      if (userCoords && photonResults.length > 0) {
        filteredLocations = photonResults.filter(loc => {
          const distance = calculateDistance(userCoords.lat, userCoords.lng, loc.lat, loc.lng);
          return distance <= 500;
        });
        // If no nearby results, show all but sorted by distance
        if (filteredLocations.length === 0) {
          filteredLocations = photonResults;
        }
      }
      
      // Cache results
      searchCacheRef.current.set(cacheKey, { cities: mappedCities, locations: filteredLocations });
      setCityResults(mappedCities);
      setLocationResults(filteredLocations.slice(0, 8));
    } catch (error) {
      console.error('Search error:', error);
      setCityResults([]);
      setLocationResults([]);
    } finally {
      setLoading(false);
    }
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

  const handleLocationSelect = (location: PhotonResult) => {
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
              {Array.from(new Map(cityResults.map(r => [r.name.split(',')[0].trim().toLowerCase(), r])).values()).map((city, index) => (
                <CityEngagementCard
                  key={index}
                  cityName={city.name.split(',')[0].trim()}
                  coords={{ lat: city.lat, lng: city.lng }}
                  onClick={() => handleCitySelect(city)}
                />
              ))}
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
                const CategoryIcon = getCategoryIcon(location.category);
                return (
                  <button
                    key={index}
                    onClick={() => handleLocationSelect(location)}
                    className="w-full px-4 py-3 flex items-center gap-3 bg-muted/30 hover:bg-muted/50 transition-colors rounded-xl text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <CategoryIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">
                        {location.name}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {location.displayAddress || location.city}
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
            <MapPin className="w-16 h-16 mb-3 opacity-50" />
            <p className="text-lg font-medium">{t('noResultsFound', { ns: 'explore', defaultValue: 'No results found' })}</p>
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
