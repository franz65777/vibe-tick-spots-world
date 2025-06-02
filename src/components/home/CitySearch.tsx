
import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Building, Landmark, Building2, Clock, Mountain, Shield, Church, Waves, TreePine } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface CitySearchProps {
  searchQuery: string;
  currentCity: string;
  onSearchChange: (value: string) => void;
  onSearchKeyPress: (e: React.KeyboardEvent) => void;
  onCitySelect: (city: string) => void;
}

// City data with more appropriate landmark icons
const cityData = {
  'san francisco': { 
    name: 'San Francisco', 
    icon: Building2, // Golden Gate Bridge structure
    description: 'Golden Gate City'
  },
  'milan': { 
    name: 'Milan', 
    icon: Church, // Duomo cathedral
    description: 'Fashion Capital'
  },
  'milano': { 
    name: 'Milan', 
    icon: Church, // Duomo cathedral
    description: 'Fashion Capital'
  },
  'paris': { 
    name: 'Paris', 
    icon: Landmark, // Eiffel Tower
    description: 'City of Light'
  },
  'new york': { 
    name: 'New York', 
    icon: Building, // Skyscrapers/Empire State
    description: 'The Big Apple'
  },
  'london': { 
    name: 'London', 
    icon: Clock, // Big Ben
    description: 'Royal City'
  },
  'tokyo': { 
    name: 'Tokyo', 
    icon: Mountain, // Mount Fuji
    description: 'Land of Rising Sun'
  },
  'rome': { 
    name: 'Rome', 
    icon: Shield, // Roman architecture
    description: 'Eternal City'
  },
  'barcelona': { 
    name: 'Barcelona', 
    icon: Church, // Sagrada Familia
    description: 'Gaudí\'s City'
  },
  'amsterdam': { 
    name: 'Amsterdam', 
    icon: Waves, // Canals
    description: 'Venice of North'
  },
  'sydney': { 
    name: 'Sydney', 
    icon: Waves, // Opera House by harbor
    description: 'Harbor City'
  }
};

const CitySearch = ({ 
  searchQuery, 
  currentCity, 
  onSearchChange, 
  onSearchKeyPress,
  onCitySelect 
}: CitySearchProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredCities, setFilteredCities] = useState<Array<{key: string, data: typeof cityData[keyof typeof cityData]}>>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  // Get current city data
  const currentCityData = cityData[currentCity.toLowerCase() as keyof typeof cityData];
  const CurrentCityIcon = currentCityData?.icon || MapPin;

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = Object.entries(cityData)
        .filter(([key, data]) => 
          key.includes(searchQuery.toLowerCase()) || 
          data.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .map(([key, data]) => ({ key, data }));
      setFilteredCities(filtered);
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
    <div ref={searchRef} className="relative flex-1 max-w-md">
      {/* Current City Display / Search Input */}
      <div className="relative">
        {!searchQuery ? (
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
              value={searchQuery}
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
      {!searchQuery && (
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
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 max-h-64 overflow-y-auto z-50">
          {filteredCities.map(({ key, data }) => {
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
              </button>
            );
          })}
        </div>
      )}

      {/* No results */}
      {isOpen && searchQuery.trim() && filteredCities.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50">
          <div className="text-gray-500 text-sm text-center">
            No cities found. Try Milan, Paris, or New York.
          </div>
        </div>
      )}
    </div>
  );
};

export default CitySearch;
