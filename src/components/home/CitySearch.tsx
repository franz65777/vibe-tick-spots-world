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
          // Show current city when not searching - Clean design
          <div className="flex items-center gap-3 bg-white/90 border border-gray-200 rounded-2xl h-12 px-4 hover:bg-white transition-colors cursor-pointer touch-manipulation"
               onClick={() => document.getElementById('city-search-input')?.focus()}>
            <span className="text-gray-900 font-medium flex-1 text-sm sm:text-base truncate">
              {currentCityData?.name || currentCity}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              {geoLoading && (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              )}
              <button
                onClick={handleLocationClick}
                className="w-6 h-6 text-gray-400 hover:text-blue-600 transition-colors touch-manipulation"
                title="Detect current location"
              >
                <Locate className="w-4 h-4" />
              </button>
              <Search className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        ) : (
          // Show search input when searching
          <div className="relative">
            <Input
              id="city-search-input"
              type="text"
              placeholder="Search cities..."
              value={searchQuery === ' ' ? '' : searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyPress={onSearchKeyPress}
              onFocus={() => searchQuery && setIsOpen(true)}
              className="pl-4 pr-10 bg-white/90 border-gray-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-2xl h-12 text-sm sm:text-base"
              autoFocus
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
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

      {/* Dropdown Results - Simplified */}
      {isOpen && filteredCities.length > 0 && (
        <div className="fixed sm:absolute top-[calc(100%+8px)] left-4 right-4 sm:left-0 sm:right-0 sm:mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-64 overflow-y-auto z-[60] backdrop-blur-sm">
          {filteredCities.map(({ key, data, similarity }) => {
            return (
              <button
                key={key}
                onClick={() => handleCityClick(data.name)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left border-b border-gray-50 last:border-b-0 touch-manipulation"
              >
                <div className="font-medium text-gray-900 text-sm truncate">{data.name}</div>
                {similarity > 0.8 && (
                  <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded shrink-0">
                    Best match
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* No results - Mobile optimized z-index */}
      {isOpen && searchQuery.trim() && searchQuery.trim() !== ' ' && filteredCities.length === 0 && (
        <div className="fixed sm:absolute top-[calc(100%+8px)] left-4 right-4 sm:left-0 sm:right-0 sm:mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-[60] backdrop-blur-sm">
          <div className="text-gray-500 text-sm text-center">
            <div className="mb-2">No cities found for "{searchQuery}"</div>
            <div className="text-xs">Try: Milan, Paris, New York, London, Tokyo</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CitySearch;
