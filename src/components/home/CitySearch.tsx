
import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Building, Landmark, Building2, Clock, Mountain, Shield, Church, Waves, TreePine, Locate, Globe, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useGeolocation } from '@/hooks/useGeolocation';

interface CitySearchProps {
  searchQuery: string;
  currentCity: string;
  onSearchChange: (value: string) => void;
  onSearchKeyPress: (e: React.KeyboardEvent) => void;
  onCitySelect: (city: string) => void;
}

// Expanded global cities database with more comprehensive coverage
const globalCities = [
  // Major US cities
  { name: 'New York', country: 'USA', icon: Building, coordinates: { lat: 40.7128, lng: -74.0060 } },
  { name: 'Los Angeles', country: 'USA', icon: Building, coordinates: { lat: 34.0522, lng: -118.2437 } },
  { name: 'Chicago', country: 'USA', icon: Building, coordinates: { lat: 41.8781, lng: -87.6298 } },
  { name: 'San Francisco', country: 'USA', icon: Building2, coordinates: { lat: 37.7749, lng: -122.4194 } },
  { name: 'Miami', country: 'USA', icon: Waves, coordinates: { lat: 25.7617, lng: -80.1918 } },
  { name: 'Las Vegas', country: 'USA', icon: Building2, coordinates: { lat: 36.1699, lng: -115.1398 } },
  { name: 'Seattle', country: 'USA', icon: Mountain, coordinates: { lat: 47.6062, lng: -122.3321 } },
  
  // European capitals and major cities
  { name: 'London', country: 'UK', icon: Clock, coordinates: { lat: 51.5074, lng: -0.1278 } },
  { name: 'Paris', country: 'France', icon: Landmark, coordinates: { lat: 48.8566, lng: 2.3522 } },
  { name: 'Rome', country: 'Italy', icon: Shield, coordinates: { lat: 41.9028, lng: 12.4964 } },
  { name: 'Milan', country: 'Italy', icon: Church, coordinates: { lat: 45.4642, lng: 9.1900 } },
  { name: 'Turin', country: 'Italy', icon: Mountain, coordinates: { lat: 45.0703, lng: 7.6869 } },
  { name: 'Florence', country: 'Italy', icon: Church, coordinates: { lat: 43.7696, lng: 11.2558 } },
  { name: 'Venice', country: 'Italy', icon: Waves, coordinates: { lat: 45.4408, lng: 12.3155 } },
  { name: 'Naples', country: 'Italy', icon: Mountain, coordinates: { lat: 40.8518, lng: 14.2681 } },
  { name: 'Barcelona', country: 'Spain', icon: Church, coordinates: { lat: 41.3851, lng: 2.1734 } },
  { name: 'Madrid', country: 'Spain', icon: Building, coordinates: { lat: 40.4168, lng: -3.7038 } },
  { name: 'Amsterdam', country: 'Netherlands', icon: Waves, coordinates: { lat: 52.3676, lng: 4.9041 } },
  { name: 'Berlin', country: 'Germany', icon: Building, coordinates: { lat: 52.5200, lng: 13.4050 } },
  { name: 'Munich', country: 'Germany', icon: Mountain, coordinates: { lat: 48.1351, lng: 11.5820 } },
  { name: 'Vienna', country: 'Austria', icon: Church, coordinates: { lat: 48.2082, lng: 16.3738 } },
  { name: 'Prague', country: 'Czech Republic', icon: Shield, coordinates: { lat: 50.0755, lng: 14.4378 } },
  { name: 'Budapest', country: 'Hungary', icon: Building, coordinates: { lat: 47.4979, lng: 19.0402 } },
  { name: 'Warsaw', country: 'Poland', icon: Building, coordinates: { lat: 52.2297, lng: 21.0122 } },
  { name: 'Stockholm', country: 'Sweden', icon: Waves, coordinates: { lat: 59.3293, lng: 18.0686 } },
  { name: 'Copenhagen', country: 'Denmark', icon: Waves, coordinates: { lat: 55.6761, lng: 12.5683 } },
  { name: 'Oslo', country: 'Norway', icon: Mountain, coordinates: { lat: 59.9139, lng: 10.7522 } },
  { name: 'Helsinki', country: 'Finland', icon: TreePine, coordinates: { lat: 60.1699, lng: 24.9384 } },
  { name: 'Dublin', country: 'Ireland', icon: Church, coordinates: { lat: 53.3498, lng: -6.2603 } },
  { name: 'Lisbon', country: 'Portugal', icon: Waves, coordinates: { lat: 38.7223, lng: -9.1393 } },
  { name: 'Athens', country: 'Greece', icon: Shield, coordinates: { lat: 37.9838, lng: 23.7275 } },
  { name: 'Istanbul', country: 'Turkey', icon: Church, coordinates: { lat: 41.0082, lng: 28.9784 } },
  { name: 'Moscow', country: 'Russia', icon: Shield, coordinates: { lat: 55.7558, lng: 37.6176 } },
  
  // Asian cities
  { name: 'Tokyo', country: 'Japan', icon: Mountain, coordinates: { lat: 35.6762, lng: 139.6503 } },
  { name: 'Osaka', country: 'Japan', icon: Building, coordinates: { lat: 34.6937, lng: 135.5023 } },
  { name: 'Kyoto', country: 'Japan', icon: Church, coordinates: { lat: 35.0116, lng: 135.7681 } },
  { name: 'Seoul', country: 'South Korea', icon: Building, coordinates: { lat: 37.5665, lng: 126.9780 } },
  { name: 'Hong Kong', country: 'China', icon: Building2, coordinates: { lat: 22.3193, lng: 114.1694 } },
  { name: 'Shanghai', country: 'China', icon: Building2, coordinates: { lat: 31.2304, lng: 121.4737 } },
  { name: 'Beijing', country: 'China', icon: Shield, coordinates: { lat: 39.9042, lng: 116.4074 } },
  { name: 'Singapore', country: 'Singapore', icon: Building, coordinates: { lat: 1.3521, lng: 103.8198 } },
  { name: 'Bangkok', country: 'Thailand', icon: Church, coordinates: { lat: 13.7563, lng: 100.5018 } },
  { name: 'Mumbai', country: 'India', icon: Building, coordinates: { lat: 19.0760, lng: 72.8777 } },
  { name: 'Delhi', country: 'India', icon: Building, coordinates: { lat: 28.7041, lng: 77.1025 } },
  { name: 'Bangalore', country: 'India', icon: Building, coordinates: { lat: 12.9716, lng: 77.5946 } },
  
  // Middle East & Africa
  { name: 'Dubai', country: 'UAE', icon: Building2, coordinates: { lat: 25.2048, lng: 55.2708 } },
  { name: 'Abu Dhabi', country: 'UAE', icon: Building2, coordinates: { lat: 24.4539, lng: 54.3773 } },
  { name: 'Tel Aviv', country: 'Israel', icon: Building, coordinates: { lat: 32.0853, lng: 34.7818 } },
  { name: 'Cairo', country: 'Egypt', icon: Shield, coordinates: { lat: 30.0444, lng: 31.2357 } },
  { name: 'Cape Town', country: 'South Africa', icon: Mountain, coordinates: { lat: -33.9249, lng: 18.4241 } },
  { name: 'Johannesburg', country: 'South Africa', icon: Building, coordinates: { lat: -26.2041, lng: 28.0473 } },
  
  // Americas
  { name: 'Toronto', country: 'Canada', icon: Building, coordinates: { lat: 43.6532, lng: -79.3832 } },
  { name: 'Vancouver', country: 'Canada', icon: Mountain, coordinates: { lat: 49.2827, lng: -123.1207 } },
  { name: 'Montreal', country: 'Canada', icon: Building, coordinates: { lat: 45.5017, lng: -73.5673 } },
  { name: 'São Paulo', country: 'Brazil', icon: Building, coordinates: { lat: -23.5505, lng: -46.6333 } },
  { name: 'Rio de Janeiro', country: 'Brazil', icon: Waves, coordinates: { lat: -22.9068, lng: -43.1729 } },
  { name: 'Buenos Aires', country: 'Argentina', icon: Building, coordinates: { lat: -34.6118, lng: -58.3960 } },
  { name: 'Mexico City', country: 'Mexico', icon: Building, coordinates: { lat: 19.4326, lng: -99.1332 } },
  
  // Oceania
  { name: 'Sydney', country: 'Australia', icon: Waves, coordinates: { lat: -33.8688, lng: 151.2093 } },
  { name: 'Melbourne', country: 'Australia', icon: Building, coordinates: { lat: -37.8136, lng: 144.9631 } },
  { name: 'Perth', country: 'Australia', icon: Waves, coordinates: { lat: -31.9505, lng: 115.8605 } },
  { name: 'Auckland', country: 'New Zealand', icon: Waves, coordinates: { lat: -36.8485, lng: 174.7633 } },
];

// Enhanced search function with better fuzzy matching
const searchCities = (query: string) => {
  if (!query.trim()) return [];
  
  const searchTerm = query.toLowerCase().trim();
  return globalCities
    .filter(city => {
      const cityName = city.name.toLowerCase();
      const countryName = city.country.toLowerCase();
      
      // Exact match gets highest priority
      if (cityName === searchTerm || countryName === searchTerm) return true;
      
      // Starts with match
      if (cityName.startsWith(searchTerm)) return true;
      
      // Contains match
      if (cityName.includes(searchTerm) || countryName.includes(searchTerm)) return true;
      
      return false;
    })
    .sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      
      // Exact matches first
      if (aName === searchTerm && bName !== searchTerm) return -1;
      if (bName === searchTerm && aName !== searchTerm) return 1;
      
      // Starts with matches second
      const aStarts = aName.startsWith(searchTerm);
      const bStarts = bName.startsWith(searchTerm);
      if (aStarts && !bStarts) return -1;
      if (bStarts && !aStarts) return 1;
      
      // Alphabetical order for the rest
      return aName.localeCompare(bName);
    })
    .slice(0, 10);
};

const CitySearch = ({ 
  searchQuery, 
  currentCity, 
  onSearchChange, 
  onSearchKeyPress,
  onCitySelect 
}: CitySearchProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredCities, setFilteredCities] = useState<typeof globalCities>([]);
  const [userHasManuallySelectedCity, setUserHasManuallySelectedCity] = useState(false);
  const [ignoreGeoLocation, setIgnoreGeoLocation] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const { location, loading: geoLoading, getCurrentLocation } = useGeolocation();

  // Get current city data
  const currentCityData = globalCities.find(city => 
    city.name.toLowerCase() === currentCity.toLowerCase()
  );
  const CurrentCityIcon = currentCityData?.icon || MapPin;

  useEffect(() => {
    if (location?.city && 
        location.city !== currentCity && 
        !userHasManuallySelectedCity && 
        !ignoreGeoLocation) {
      console.log('Geolocation detected city:', location.city);
      onCitySelect(location.city);
    }
  }, [location?.city, currentCity, onCitySelect, userHasManuallySelectedCity, ignoreGeoLocation]);

  useEffect(() => {
    if (searchQuery.trim() && searchQuery.trim() !== ' ') {
      const results = searchCities(searchQuery.trim());
      setFilteredCities(results);
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

  const handleClearSearch = () => {
    onSearchChange('');
    setIsOpen(false);
  };

  return (
    <div ref={searchRef} className="relative flex-1 max-w-md z-[100]">
      {/* Current City Display / Search Input */}
      <div className="relative">
        {!searchQuery || searchQuery.trim() === ' ' ? (
          // Show current city when not searching
          <div className="flex items-center gap-3 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-2xl h-12 px-4 hover:bg-white transition-all cursor-pointer shadow-sm"
               onClick={() => document.getElementById('city-search-input')?.focus()}>
            <CurrentCityIcon className="w-5 h-5 text-blue-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-gray-900 font-medium block truncate">
                {currentCityData?.name || currentCity}
              </span>
              {currentCityData?.country && (
                <span className="text-xs text-gray-500">{currentCityData.country}</span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {geoLoading && (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLocationClick();
                }}
                className="w-6 h-6 text-gray-400 hover:text-blue-600 transition-colors"
                title="Detect current location"
              >
                <Locate className="w-4 h-4" />
              </button>
              <Globe className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        ) : (
          // Show search input when searching
          <div className="relative">
            <Input
              id="city-search-input"
              type="text"
              placeholder="Search any city worldwide..."
              value={searchQuery === ' ' ? '' : searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyPress={onSearchKeyPress}
              onFocus={() => searchQuery && setIsOpen(true)}
              className="pl-12 pr-12 bg-white/95 backdrop-blur-sm border-gray-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-2xl h-12 shadow-sm"
              autoFocus
            />
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            {searchQuery && searchQuery.trim() !== ' ' && (
              <button
                onClick={handleClearSearch}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
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

      {/* Dropdown Results */}
      {isOpen && filteredCities.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-80 overflow-y-auto z-[9999] backdrop-blur-sm">
          <div className="p-2">
            <div className="text-xs text-gray-500 px-3 py-2 border-b border-gray-100">
              Found {filteredCities.length} cities
            </div>
            {filteredCities.map((city) => {
              const IconComponent = city.icon;
              return (
                <button
                  key={`${city.name}-${city.country}`}
                  onClick={() => handleCityClick(city.name)}
                  className="w-full flex items-center gap-3 px-3 py-3 hover:bg-gray-50 transition-colors text-left rounded-xl mx-1 my-1"
                >
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                    <IconComponent className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{city.name}</div>
                    <div className="text-sm text-gray-500 truncate">{city.country}</div>
                  </div>
                  <div className="text-xs text-gray-400 shrink-0">
                    {city.coordinates.lat.toFixed(1)}°, {city.coordinates.lng.toFixed(1)}°
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* No results */}
      {isOpen && searchQuery.trim() && searchQuery.trim() !== ' ' && filteredCities.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 z-[9999] backdrop-blur-sm">
          <div className="text-center">
            <Globe className="w-8 h-8 text-gray-400 mx-auto mb-3" />
            <div className="text-gray-900 font-medium mb-1">No cities found</div>
            <div className="text-sm text-gray-500">
              Try searching for "{searchQuery}" with different spelling or try major cities nearby
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CitySearch;
