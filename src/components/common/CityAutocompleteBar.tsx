import React, { useEffect, useRef, useState } from 'react';
import { Search, MapPin, Loader2, Locate, Building2, UtensilsCrossed, TrendingUp } from 'lucide-react';
import { nominatimGeocoding } from '@/lib/nominatimGeocoding';
import { searchPhoton, PhotonResult } from '@/lib/photonGeocoding';
import { useTranslation } from 'react-i18next';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useTopCities } from '@/hooks/useTopCities';
import CityExplorationPanel from '@/components/search/CityExplorationPanel';

interface CityAutocompleteBarProps {
  searchQuery: string;
  currentCity: string;
  onSearchChange: (value: string) => void;
  onSearchKeyPress: (e: React.KeyboardEvent) => void;
  onCitySelect: (city: string, coords?: { lat: number; lng: number }) => void;
  onLocationSelect?: (location: PhotonResult) => void;
  onFocusOpen?: () => void;
}

interface CityResult {
  type: 'city';
  name: string;
  displayName: string;
  lat: number;
  lng: number;
}

interface LocationResult extends PhotonResult {
  type: 'location';
}

type SearchResult = CityResult | LocationResult;

const CityAutocompleteBar: React.FC<CityAutocompleteBarProps> = ({
  searchQuery,
  currentCity,
  onSearchChange,
  onSearchKeyPress,
  onCitySelect,
  onLocationSelect,
  onFocusOpen,
}) => {
  const { t, i18n } = useTranslation();
  const { location, loading: geoLoading, getCurrentLocation } = useGeolocation();
  const { topCities, loading: topCitiesLoading } = useTopCities();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showTopCities, setShowTopCities] = useState(false);
  const [explorationCity, setExplorationCity] = useState<{ name: string; coords: { lat: number; lng: number } } | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout>();
  const latestQueryRef = useRef<string>('');
  const selectionRef = useRef<boolean>(false);
  const processedLocationRef = useRef<string>('');

  // Handle geolocation success - only when location changes and hasn't been processed yet
  useEffect(() => {
    if (!location || !location.city || location.city === 'Unknown City') {
      return;
    }
    
    // Create a unique key for this location
    const locationKey = `${location.latitude}-${location.longitude}-${location.city}`;
    
    // Skip if we've already processed this location
    if (processedLocationRef.current === locationKey) {
      return;
    }
    
    console.log('📍 New location detected:', location.city);
    processedLocationRef.current = locationKey;
    
    // Update the search query to show the city name
    onSearchChange(location.city);
    
    // Call city select to update map and state
    onCitySelect(location.city, { 
      lat: location.latitude, 
      lng: location.longitude 
    });
  }, [location?.latitude, location?.longitude, location?.city]);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setResults([]);
      setShowResults(false);
      selectionRef.current = false;
      return;
    }

    // Debounce search
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 350);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery, i18n.language]);

  const performSearch = async (query: string) => {
    latestQueryRef.current = query;
    setIsLoading(true);
    
    try {
      // Search for both cities and locations in parallel
      const userCoords = location ? { lat: location.latitude, lng: location.longitude } : undefined;
      
      const [cityResults, locationResults] = await Promise.all([
        nominatimGeocoding.searchPlace(query, i18n.language),
        searchPhoton(query, userCoords, 8)
      ]);
      
      // If another selection happened or input lost focus, ignore this response
      if (selectionRef.current || !inputRef.current || document.activeElement !== inputRef.current || latestQueryRef.current !== query) {
        setIsLoading(false);
        return;
      }
      
      // Transform city results
      const cities: CityResult[] = cityResults.slice(0, 4).map((result) => ({
        type: 'city' as const,
        name: result.city || result.displayName.split(',')[0],
        displayName: result.displayName,
        lat: result.lat,
        lng: result.lng,
      }));

      // Transform location results
      const locations: LocationResult[] = locationResults.slice(0, 6).map((result) => ({
        ...result,
        type: 'location' as const,
      }));

      // Combine results - cities first, then locations
      const combined: SearchResult[] = [...cities, ...locations];

      setResults(combined);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCity = (result: CityResult) => {
    console.log('🏙️ City selected from dropdown:', result.name, result);
    selectionRef.current = true;
    latestQueryRef.current = '';
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    setShowResults(false);
    setShowTopCities(false);
    setResults([]);
    
    // Open city exploration panel
    setExplorationCity({ name: result.name, coords: { lat: result.lat, lng: result.lng } });
    
    onCitySelect(result.name, { lat: result.lat, lng: result.lng });
    onSearchChange('');
    
    inputRef.current?.blur();

    setTimeout(() => {
      selectionRef.current = false;
    }, 300);
  };

  const handleTopCitySelect = (cityName: string) => {
    // Search for city coordinates
    nominatimGeocoding.searchPlace(cityName, i18n.language).then((results) => {
      if (results.length > 0) {
        const city = results[0];
        setExplorationCity({ name: cityName, coords: { lat: city.lat, lng: city.lng } });
        onCitySelect(cityName, { lat: city.lat, lng: city.lng });
      }
    });
    setShowTopCities(false);
    onSearchChange('');
  };

  const handleExplorationLocationSelect = (location: PhotonResult) => {
    setExplorationCity(null);
    if (onLocationSelect) {
      onLocationSelect(location);
    }
  };

  const handleSelectLocation = (result: LocationResult) => {
    console.log('📍 Location selected from dropdown:', result.name, result);
    selectionRef.current = true;
    latestQueryRef.current = '';
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    setShowResults(false);
    setResults([]);
    
    // Call location select callback if provided
    if (onLocationSelect) {
      onLocationSelect(result);
    }
    
    onSearchChange('');
    inputRef.current?.blur();

    setTimeout(() => {
      selectionRef.current = false;
    }, 300);
  };

  const handleCurrentLocation = async () => {
    try {
      console.log('🌍 Geolocation button clicked');
      
      if (location && location.city && location.city !== 'Unknown City') {
        console.log('📍 Using existing location:', location.city);
        onCitySelect(location.city, { 
          lat: location.latitude, 
          lng: location.longitude 
        });
        onSearchChange(location.city);
      }
      
      getCurrentLocation();
      
      if (!location || !location.city || location.city === 'Unknown City') {
        setTimeout(() => {
          if (!location || !location.city) {
            console.log('💡 Suggesting manual search');
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error getting current location:', error);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'restaurant':
      case 'cafe':
      case 'bakery':
      case 'bar':
        return <UtensilsCrossed className="w-4 h-4 mt-0.5 flex-shrink-0 text-orange-500" />;
      case 'hotel':
        return <Building2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />;
      default:
        return <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-purple-500" />;
    }
  };

  return (
    <div className="group relative overflow-visible" id="city-search-bar">
      <div className="relative">
        {isLoading || geoLoading ? (
          <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        ) : (
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        )}
        <input
          ref={inputRef}
          type="text"
          placeholder={searchQuery ? '' : currentCity || t('searchCitiesAndPlaces', { ns: 'home', defaultValue: 'Search cities or places...' })}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyPress={onSearchKeyPress}
          onFocus={() => {
            console.log('🔍 Search bar focused, searchQuery:', searchQuery, 'topCities:', topCities);
            onFocusOpen?.();
            if (!searchQuery) {
              console.log('🔍 Setting showTopCities to true');
              setShowTopCities(true);
            }
          }}
          onBlur={() => {
            setTimeout(() => {
              setShowResults(false);
              setShowTopCities(false);
              setResults([]);
            }, 200);
          }}
          className="w-full h-11 pl-11 pr-14 rounded-full bg-muted/50 dark:bg-muted border-2 border-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-muted-foreground text-sm font-medium text-foreground"
        />
        <button
          onClick={handleCurrentLocation}
          disabled={geoLoading}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-accent rounded-full transition-colors disabled:opacity-50"
          aria-label={t('currentLocation', { ns: 'common' })}
        >
          <Locate className="w-4 h-4 text-primary" />
        </button>
      </div>

      {/* Top cities dropdown (when focused, no query) */}
      {showTopCities && !searchQuery && topCities.length > 0 && (
        <div className="absolute z-[9999] w-full mt-2 bg-background border border-border rounded-xl shadow-2xl overflow-hidden">
          <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/50 flex items-center gap-2">
            <TrendingUp className="w-3 h-3" />
            {t('topCities', { ns: 'common', defaultValue: 'Top Cities' })}
          </div>
          {topCities.map((city, idx) => (
            <button
              key={`top-${idx}`}
              onClick={() => handleTopCitySelect(city.city)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted transition-colors text-left border-b border-border/50 last:border-0"
            >
              <MapPin className="w-4 h-4 flex-shrink-0 text-primary" />
              <span className="font-medium text-foreground flex-1">{city.city}</span>
              <span className="text-xs text-muted-foreground">{city.count} {t('pins', { ns: 'common', defaultValue: 'pins' })}</span>
            </button>
          ))}
        </div>
      )}

      {/* Results dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute z-[9999] w-full mt-2 bg-background border border-border rounded-xl shadow-2xl max-h-[350px] overflow-y-auto">
          {/* Cities section */}
          {results.filter(r => r.type === 'city').length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/50">
                {t('cities', { ns: 'common', defaultValue: 'Cities' })}
              </div>
              {results.filter(r => r.type === 'city').map((result, idx) => (
                <button
                  key={`city-${idx}`}
                  onClick={() => handleSelectCity(result as CityResult)}
                  className="w-full px-4 py-3 flex items-start gap-3 hover:bg-muted transition-colors text-left border-b border-border/50 last:border-0"
                >
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground">
                      {(result as CityResult).name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {(result as CityResult).displayName}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {/* Locations section */}
          {results.filter(r => r.type === 'location').length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/50">
                {t('places', { ns: 'common', defaultValue: 'Places' })}
              </div>
              {results.filter(r => r.type === 'location').map((result, idx) => {
                const loc = result as LocationResult;
                return (
                  <button
                    key={`loc-${idx}`}
                    onClick={() => handleSelectLocation(loc)}
                    className="w-full px-4 py-3 flex items-start gap-3 hover:bg-muted transition-colors text-left border-b border-border/50 last:border-0"
                  >
                    {getCategoryIcon(loc.category)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground">
                        {loc.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {loc.displayAddress || loc.city}
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                      {loc.category === 'entertainment' ? 'fun' : loc.category}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* City Exploration Panel */}
      {explorationCity && (
        <CityExplorationPanel
          city={explorationCity.name}
          cityCoords={explorationCity.coords}
          isOpen={!!explorationCity}
          onClose={() => setExplorationCity(null)}
          onLocationSelect={handleExplorationLocationSelect}
        />
      )}
    </div>
  );
};

export default CityAutocompleteBar;
