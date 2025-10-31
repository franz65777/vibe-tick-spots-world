import React, { useEffect, useRef, useState } from 'react';
import { Search, MapPin, Loader2, Locate } from 'lucide-react';
import { nominatimGeocoding } from '@/lib/nominatimGeocoding';
import { useTranslation } from 'react-i18next';
import { useGeolocation } from '@/hooks/useGeolocation';
import { toast } from '@/hooks/use-toast';

interface CityAutocompleteBarProps {
  searchQuery: string;
  currentCity: string;
  onSearchChange: (value: string) => void;
  onSearchKeyPress: (e: React.KeyboardEvent) => void;
  onCitySelect: (city: string, coords?: { lat: number; lng: number }) => void;
  onFocusOpen?: () => void;
}

interface CityResult {
  name: string;
  displayName: string;
  lat: number;
  lng: number;
}

const CityAutocompleteBar: React.FC<CityAutocompleteBarProps> = ({
  searchQuery,
  currentCity,
  onSearchChange,
  onSearchKeyPress,
  onCitySelect,
  onFocusOpen,
}) => {
  const { t, i18n } = useTranslation();
  const { location, loading: geoLoading, getCurrentLocation } = useGeolocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<CityResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout>();
  const latestQueryRef = useRef<string>('');
  const selectionRef = useRef<boolean>(false);

  // Handle geolocation success - only when location changes
  useEffect(() => {
    console.log('🔄 CityAutocompleteBar - Location changed:', location);
    if (location && location.city && location.city !== 'Unknown City') {
      console.log('📍 Location detected, calling onCitySelect:', location.city);
      onCitySelect(location.city, { 
        lat: location.latitude, 
        lng: location.longitude 
      });
      toast({ description: `${t('locationDetected', { ns: 'common' })}: ${location.city}` });
    }
  }, [location?.latitude, location?.longitude, location?.city, onCitySelect]);

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
    }, 400);

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
      // Use FREE OpenStreetMap Nominatim for city search with language support
      const nominatimResults = await nominatimGeocoding.searchPlace(query, i18n.language);
      
      // If another selection happened or input lost focus, ignore this response
      if (selectionRef.current || !inputRef.current || document.activeElement !== inputRef.current || latestQueryRef.current !== query) {
        setIsLoading(false);
        return;
      }
      
      const cityResults: CityResult[] = nominatimResults.map((result) => ({
        name: result.city || result.displayName.split(',')[0],
        displayName: result.displayName,
        lat: result.lat,
        lng: result.lng,
      }));

      setResults(cityResults);
      setShowResults(true);
    } catch (error) {
      console.error('City search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCity = (result: CityResult) => {
    console.log('🏙️ City selected from dropdown:', result.name, result);
    selectionRef.current = true;
    latestQueryRef.current = '';
    // Cancel any pending search
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    // Immediately close dropdown and clear results
    setShowResults(false);
    setResults([]);
    
    // Call parent callbacks
    onCitySelect(result.name, { lat: result.lat, lng: result.lng });
    onSearchChange('');
    
    // Blur input
    inputRef.current?.blur();

    // Reset selection flag shortly after to allow new searches
    setTimeout(() => {
      selectionRef.current = false;
    }, 300);
  };

  const handleCurrentLocation = async () => {
    try {
      console.log('🌍 Geolocation button clicked');
      toast({ description: t('gettingLocation', { ns: 'common' }) });
      getCurrentLocation();
      
      // Wait for location to be updated
      // The useEffect will handle the city selection
    } catch (error) {
      console.error('Error getting current location:', error);
      toast({ description: 'Failed to get location', variant: 'destructive' });
    }
  };

  return (
    <div className="group relative" id="city-search-bar">
      <div className="relative">
        {isLoading || geoLoading ? (
          <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        ) : (
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        )}
        <input
          ref={inputRef}
          type="text"
          placeholder={t('searchCities', { ns: 'home' })}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyPress={onSearchKeyPress}
          onFocus={() => {
            onFocusOpen?.();
          }}
          onBlur={() => {
            // Delay to allow click on result
            setTimeout(() => {
              setShowResults(false);
              setResults([]);
            }, 200);
          }}
          className="w-full h-11 pl-11 pr-12 rounded-full bg-white border-2 border-blue-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all placeholder:text-gray-500 text-sm font-medium text-gray-900"
        />
        <button
          onClick={handleCurrentLocation}
          disabled={geoLoading}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50"
          aria-label={t('currentLocation', { ns: 'common' })}
        >
          <Locate className="w-4 h-4 text-blue-600" />
        </button>
      </div>

      {/* Results dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-background border border-border rounded-lg shadow-lg max-h-[300px] overflow-y-auto">
          {results.map((result, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectCity(result)}
              className="w-full px-4 py-3 flex items-start gap-3 hover:bg-muted transition-colors text-left border-b border-border last:border-0"
            >
              <MapPin className="w-4 h-4 mt-1 flex-shrink-0 text-primary" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground">
                  {result.name}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {result.displayName}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CityAutocompleteBar;
