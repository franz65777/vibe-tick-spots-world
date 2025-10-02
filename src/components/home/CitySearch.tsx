import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Building, Landmark, Building2, Clock, Mountain, Shield, Church, Waves, TreePine, Locate } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useGeolocation } from '@/hooks/useGeolocation';

interface CitySearchProps {
  searchQuery: string;
  currentCity: string;
  onSearchChange: (value: string) => void;
  onSearchKeyPress: (e: React.KeyboardEvent) => void;
  onCitySelect: (city: string) => void;
}

// Simplified city data - no icons or descriptions
const cityData = {
  'san francisco': { 
    name: 'San Francisco', 
    searchTerms: ['san francisco', 'sf', 'san fran', 'sanfrancisco']
  },
  'milan': { 
    name: 'Milan', 
    searchTerms: ['milan', 'milano', 'milaan', 'miland']
  },
  'paris': { 
    name: 'Paris', 
    searchTerms: ['paris', 'paris', 'pariis', 'pariss']
  },
  'new york': { 
    name: 'New York', 
    searchTerms: ['new york', 'ny', 'nyc', 'newyork', 'new yourk', 'new yor']
  },
  'london': { 
    name: 'London', 
    searchTerms: ['london', 'londdon', 'londn', 'lonon']
  },
  'tokyo': { 
    name: 'Tokyo', 
    searchTerms: ['tokyo', 'tokio', 'tokyio', 'tokya']
  },
  'rome': { 
    name: 'Rome', 
    searchTerms: ['rome', 'roma', 'roome', 'rom']
  },
  'barcelona': { 
    name: 'Barcelona', 
    searchTerms: ['barcelona', 'barselona', 'barcellona', 'barca']
  },
  'amsterdam': { 
    name: 'Amsterdam', 
    searchTerms: ['amsterdam', 'amsterdamm', 'amesterdam', 'amstrerdam']
  },
  'sydney': { 
    name: 'Sydney', 
    searchTerms: ['sydney', 'sydny', 'sideny', 'sydey']
  }
};

// Function to calculate string similarity (Levenshtein distance based)
const getSimilarity = (str1: string, str2: string): number => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
};

const getEditDistance = (str1: string, str2: string): number => {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  return matrix[str2.length][str1.length];
};

const CitySearch = ({ 
  searchQuery, 
  currentCity, 
  onSearchChange, 
  onSearchKeyPress,
  onCitySelect 
}: CitySearchProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredCities, setFilteredCities] = useState<Array<{key: string, data: typeof cityData[keyof typeof cityData], similarity: number}>>([]);
  const [userHasManuallySelectedCity, setUserHasManuallySelectedCity] = useState(false);
  const [ignoreGeoLocation, setIgnoreGeoLocation] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const { location, loading: geoLoading, getCurrentLocation } = useGeolocation();

  // Only update current city from geolocation if user hasn't manually selected one AND not ignoring geo
  useEffect(() => {
    if (location?.city && 
        location.city !== currentCity && 
        !userHasManuallySelectedCity && 
        !ignoreGeoLocation) {
      console.log('Geolocation detected city:', location.city);
      onCitySelect(location.city);
    }
  }, [location?.city, currentCity, onCitySelect, userHasManuallySelectedCity, ignoreGeoLocation]);

  // Get current city data
  const currentCityData = cityData[currentCity.toLowerCase() as keyof typeof cityData];

  useEffect(() => {
    if (searchQuery.trim() && searchQuery.trim() !== ' ') {
      const query = searchQuery.toLowerCase().trim();
      
      // Find matches with similarity scoring
      const matches = Object.entries(cityData)
        .map(([key, data]) => {
          let bestSimilarity = 0;
          
          // Check against all search terms for each city
          data.searchTerms.forEach(term => {
            if (term.includes(query) || query.includes(term)) {
              bestSimilarity = Math.max(bestSimilarity, 0.9);
            } else {
              const similarity = getSimilarity(query, term);
              bestSimilarity = Math.max(bestSimilarity, similarity);
            }
          });
          
          return { key, data, similarity: bestSimilarity };
        })
        .filter(item => item.similarity > 0.4) // Only show reasonably similar matches
        .sort((a, b) => b.similarity - a.similarity) // Sort by best match first
        .slice(0, 5); // Limit to top 5 results
      
      setFilteredCities(matches);
      setIsOpen(true);
    } else {
      setFilteredCities([]);
      setIsOpen(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCityClick = (cityName: string) => {
    console.log('Manual city selection:', cityName);
    setUserHasManuallySelectedCity(true);
    setIgnoreGeoLocation(true);
    onCitySelect(cityName);
    onSearchChange('');
    setIsOpen(false);
  };

  const handleLocationClick = () => {
    console.log('Location button clicked - resetting manual selection');
    setUserHasManuallySelectedCity(false);
    setIgnoreGeoLocation(false);
    getCurrentLocation();
  };

  return (
    <div ref={searchRef} className="relative flex-1 max-w-md z-50">
      {/* Current City Display / Search Input */}
      <div className="relative">
        {!searchQuery || searchQuery.trim() === ' ' ? (
          // Show current city when not searching - Modern clean design
          <div className="flex items-center gap-3 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-2xl h-14 px-5 hover:shadow-md transition-all cursor-pointer touch-manipulation shadow-sm"
               onClick={() => document.getElementById('city-search-input')?.focus()}>
            <MapPin className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Location</div>
              <div className="text-sm font-semibold text-foreground truncate">
                {currentCityData?.name || currentCity}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {geoLoading && (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLocationClick();
                }}
                className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors touch-manipulation"
                title="Detect current location"
              >
                <Locate className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          // Show search input when searching
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              id="city-search-input"
              type="text"
              placeholder="Search any city worldwide..."
              value={searchQuery === ' ' ? '' : searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyPress={onSearchKeyPress}
              onFocus={() => searchQuery && setIsOpen(true)}
              className="pl-12 pr-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-primary/20 rounded-2xl h-14 text-sm font-medium shadow-sm"
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Hidden input for focusing */}
      {(!searchQuery || searchQuery.trim() === ' ') && (
        <input
          id="city-search-input"
          type="text"
          className="absolute inset-0 opacity-0 cursor-pointer"
          onFocus={() => onSearchChange(' ')}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyPress={onSearchKeyPress}
        />
      )}

      {/* Dropdown Results - Modern design */}
      {isOpen && filteredCities.length > 0 && (
        <div className="fixed sm:absolute top-[calc(100%+8px)] left-4 right-4 sm:left-0 sm:right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-80 overflow-y-auto z-[60]">
          <div className="p-2">
            {filteredCities.map(({ key, data, similarity }) => {
              return (
                <button
                  key={key}
                  onClick={() => handleCityClick(data.name)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-colors text-left rounded-xl touch-manipulation group"
                >
                  <MapPin className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground text-sm truncate">{data.name}</div>
                  </div>
                  {similarity > 0.8 && (
                    <div className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full shrink-0">
                      Best match
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* No results - Modern design */}
      {isOpen && searchQuery.trim() && searchQuery.trim() !== ' ' && filteredCities.length === 0 && (
        <div className="fixed sm:absolute top-[calc(100%+8px)] left-4 right-4 sm:left-0 sm:right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 z-[60] text-center">
          <MapPin className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <div className="text-foreground font-semibold mb-1">No cities found</div>
          <div className="text-sm text-muted-foreground mb-3">Try searching for: Milan, Paris, New York, London, Tokyo</div>
        </div>
      )}
    </div>
  );
};

export default CitySearch;
