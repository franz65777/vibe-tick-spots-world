import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2, Locate } from 'lucide-react';
import { nominatimGeocoding } from '@/lib/nominatimGeocoding';
import { searchPhoton, PhotonResult } from '@/lib/photonGeocoding';
import { useTranslation } from 'react-i18next';
import { useGeolocation } from '@/hooks/useGeolocation';
import { getCategoryIcon } from '@/utils/categoryIcons';

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
  onLocationSelect,
  onFocusOpen,
}) => {
  const { t, i18n } = useTranslation();
  const { location, loading: geoLoading, getCurrentLocation } = useGeolocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cityResults, setCityResults] = useState<CityResult[]>([]);
  const [locationResults, setLocationResults] = useState<PhotonResult[]>([]);
  const [showResults, setShowResults] = useState(false);
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
    
    // Call city select to update map and state - DON'T update search query to avoid triggering dropdown
    onCitySelect(location.city, { 
      lat: location.latitude, 
      lng: location.longitude 
    });
    
    // No toast here – silently update the UI with detected city
  }, [location?.latitude, location?.longitude, location?.city]);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setCityResults([]);
      setLocationResults([]);
      setShowResults(false);
      selectionRef.current = false;
      return;
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 250);

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
      const userLocation = location ? { lat: location.latitude, lng: location.longitude } : undefined;
      
      // Search locations first (Photon is faster) - show results immediately
      searchPhoton(query, userLocation, 15).then(photonResults => {
        if (selectionRef.current || latestQueryRef.current !== query) return;
        
        // No distance filter - allow global search
        setLocationResults(photonResults.slice(0, 10));
        setShowResults(true);
        setIsLoading(false);
      }).catch(() => {});
      
      // Search cities in background (Nominatim is slower)
      nominatimGeocoding.searchPlace(query, i18n.language).then(nominatimResults => {
        if (selectionRef.current || latestQueryRef.current !== query) return;
        
        const cities: CityResult[] = nominatimResults.map((result) => ({
          name: result.city || result.displayName.split(',')[0],
          displayName: result.displayName,
          lat: result.lat,
          lng: result.lng,
        }));
        
        setCityResults(cities.slice(0, 5));
        setShowResults(true);
      }).catch(() => {});
      
    } catch (error) {
      console.error('Search error:', error);
      setCityResults([]);
      setLocationResults([]);
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
    setCityResults([]);
    setLocationResults([]);
    
    onCitySelect(result.name, { lat: result.lat, lng: result.lng });
    onSearchChange('');
    inputRef.current?.blur();

    setTimeout(() => {
      selectionRef.current = false;
    }, 300);
  };

  const handleSelectLocation = (result: PhotonResult) => {
    console.log('📍 Location selected from dropdown:', result.name, result);
    selectionRef.current = true;
    latestQueryRef.current = '';
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    setShowResults(false);
    setCityResults([]);
    setLocationResults([]);
    
    if (onLocationSelect) {
      onLocationSelect(result);
    }
    onSearchChange('');
    inputRef.current?.blur();

    setTimeout(() => {
      selectionRef.current = false;
    }, 300);
  };

  const hasResults = cityResults.length > 0 || locationResults.length > 0;

  const handleCurrentLocation = async () => {
    try {
      console.log('🌍 Geolocation button clicked');
      
      // If we already have a location, immediately update the map
      if (location && location.city && location.city !== 'Unknown City') {
        console.log('📍 Using existing location:', location.city);
        onCitySelect(location.city, { 
          lat: location.latitude, 
          lng: location.longitude 
        });
        onSearchChange(location.city);
      }
      
      // Always fetch fresh location to update if user moved
      getCurrentLocation();
      
      // Show helpful message if there's an error
      if (!location || !location.city || location.city === 'Unknown City') {
        setTimeout(() => {
          if (!location || !location.city) {
            console.log('💡 Suggesting manual search');
          }
        }, 1000);
      }
      // UI updates happen when location state changes via useEffect
    } catch (error) {
      console.error('Error getting current location:', error);
    }
  };

  return (
    <div className="group relative" id="city-search-bar">
      <div className="relative">
        {isLoading || geoLoading ? (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground animate-spin" />
        ) : (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base">📌</span>
        )}
        <input
          ref={inputRef}
          type="text"
          placeholder={searchQuery ? '' : currentCity || t('searchCities', { ns: 'home' })}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyPress={onSearchKeyPress}
          onFocus={() => {
            onFocusOpen?.();
          }}
        onBlur={() => {
            setTimeout(() => {
              setShowResults(false);
              setCityResults([]);
              setLocationResults([]);
            }, 200);
          }}
          className="w-full h-10 pl-9 pr-10 rounded-full bg-white/70 dark:bg-black/40 backdrop-blur-md border border-border/30 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-muted-foreground text-sm font-medium text-foreground"
        />
        <button
          onClick={handleCurrentLocation}
          disabled={geoLoading}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-accent/50 rounded-full transition-colors disabled:opacity-50"
          aria-label={t('currentLocation', { ns: 'common' })}
        >
          <Locate className="w-4 h-4 text-foreground" />
        </button>
      </div>

      {/* Results dropdown disabled per latest UX request */}
      {/* Dropdown results (cities and locations) intentionally hidden to keep UI clean */}

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

export default CityAutocompleteBar;
