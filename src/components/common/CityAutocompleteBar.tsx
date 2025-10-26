import React, { useEffect, useRef, useState } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { nominatimGeocoding } from '@/lib/nominatimGeocoding';

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<CityResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (searchQuery.length < 2) {
      setResults([]);
      setShowResults(false);
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
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    setIsLoading(true);
    
    try {
      // Use FREE OpenStreetMap Nominatim for city search
      const nominatimResults = await nominatimGeocoding.searchPlace(query);
      
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
    onCitySelect(result.name, { lat: result.lat, lng: result.lng });
    onSearchChange(result.name);
    setShowResults(false);
    inputRef.current?.blur();
  };

  return (
    <div className="group relative" id="city-search-bar">
      <div className="relative">
        {isLoading ? (
          <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        ) : (
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        )}
        <input
          ref={inputRef}
          type="text"
          placeholder="Search any city worldwide"
          value={searchQuery || currentCity}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyPress={onSearchKeyPress}
          onFocus={() => {
            onFocusOpen?.();
            if (searchQuery.length >= 2 && results.length > 0) {
              setShowResults(true);
            }
          }}
          onBlur={() => {
            // Delay to allow click on result
            setTimeout(() => setShowResults(false), 200);
          }}
          className="w-full h-11 pl-11 pr-4 rounded-full bg-white border-2 border-blue-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all placeholder:text-gray-500 text-sm font-medium text-gray-900"
        />
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
