import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Building, Landmark, Building2, Clock, Mountain, Shield, Church, Waves, TreePine } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface CitySearchProps {
  searchQuery: string;
  currentCity: string;
  onSearchChange: (value: string) => void;
  onSearchKeyPress: (e: React.KeyboardEvent) => void;
  onCitySelect: (city: string) => void;
  onSearchActiveChange?: (isActive: boolean) => void;
}

// City data with more appropriate landmark icons and search variations
const cityData = {
  'san francisco': { 
    name: 'San Francisco', 
    icon: Building2,
    description: 'Golden Gate City',
    searchTerms: ['san francisco', 'sf', 'san fran', 'sanfrancisco']
  },
  'milan': { 
    name: 'Milan', 
    icon: Church,
    description: 'Fashion Capital',
    searchTerms: ['milan', 'milano', 'milaan', 'miland']
  },
  'paris': { 
    name: 'Paris', 
    icon: Landmark,
    description: 'City of Light',
    searchTerms: ['paris', 'paris', 'pariis', 'pariss']
  },
  'new york': { 
    name: 'New York', 
    icon: Building,
    description: 'The Big Apple',
    searchTerms: ['new york', 'ny', 'nyc', 'newyork', 'new yourk', 'new yor']
  },
  'london': { 
    name: 'London', 
    icon: Clock,
    description: 'Royal City',
    searchTerms: ['london', 'londdon', 'londn', 'lonon']
  },
  'tokyo': { 
    name: 'Tokyo', 
    icon: Mountain,
    description: 'Land of Rising Sun',
    searchTerms: ['tokyo', 'tokio', 'tokyio', 'tokya']
  },
  'rome': { 
    name: 'Rome', 
    icon: Shield,
    description: 'Eternal City',
    searchTerms: ['rome', 'roma', 'roome', 'rom']
  },
  'barcelona': { 
    name: 'Barcelona', 
    icon: Church,
    description: 'Gaudí\'s City',
    searchTerms: ['barcelona', 'barselona', 'barcellona', 'barca']
  },
  'amsterdam': { 
    name: 'Amsterdam', 
    icon: Waves,
    description: 'Venice of North',
    searchTerms: ['amsterdam', 'amsterdamm', 'amesterdam', 'amstrerdam']
  },
  'sydney': { 
    name: 'Sydney', 
    icon: Waves,
    description: 'Harbor City',
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
  onCitySelect,
  onSearchActiveChange 
}: CitySearchProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredCities, setFilteredCities] = useState<Array<{key: string, data: typeof cityData[keyof typeof cityData], similarity: number}>>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  // Get current city data
  const currentCityData = cityData[currentCity.toLowerCase() as keyof typeof cityData];
  const CurrentCityIcon = currentCityData?.icon || MapPin;

  const isSearchActive = searchQuery && searchQuery.trim() !== ' ';

  // Notify parent when search becomes active/inactive
  useEffect(() => {
    onSearchActiveChange?.(isSearchActive);
  }, [isSearchActive, onSearchActiveChange]);

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
    onCitySelect(cityName);
    onSearchChange('');
    setIsOpen(false);
  };

  return (
    <div ref={searchRef} className="relative flex-1 max-w-md z-50">
      {/* Current City Display / Search Input */}
      <div className="relative">
        {!isSearchActive ? (
          // Show current city when not searching
          <div className="flex items-center gap-3 bg-white/90 border border-gray-200 rounded-2xl h-12 px-4 hover:bg-white transition-colors cursor-pointer"
               onClick={() => document.getElementById('city-search-input')?.focus()}>
            <CurrentCityIcon className="w-5 h-5 text-blue-600 shrink-0" />
            <span className="text-gray-900 font-medium">{currentCityData?.name || currentCity}</span>
            <Search className="w-4 h-4 text-gray-400 ml-auto" />
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
              className="pl-4 pr-10 bg-white/90 border-gray-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-2xl h-12"
              autoFocus
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          </div>
        )}
      </div>

      {/* Hidden input for focusing */}
      {!isSearchActive && (
        <input
          id="city-search-input"
          type="text"
          className="absolute inset-0 opacity-0 cursor-pointer"
          onFocus={() => onSearchChange(' ')}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyPress={onSearchKeyPress}
        />
      )}

      {/* Dropdown Results */}
      {isOpen && filteredCities.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-64 overflow-y-auto z-50">
          {filteredCities.map(({ key, data, similarity }) => {
            const IconComponent = data.icon;
            return (
              <button
                key={key}
                onClick={() => handleCityClick(data.name)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-b-0"
              >
                <IconComponent className="w-5 h-5 text-blue-600 shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{data.name}</div>
                  <div className="text-xs text-gray-500">{data.description}</div>
                </div>
                {similarity > 0.8 && (
                  <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    Best match
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* No results */}
      {isOpen && searchQuery.trim() && searchQuery.trim() !== ' ' && filteredCities.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-50">
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
