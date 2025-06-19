
import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Building, Landmark, Building2, Clock, Mountain, Shield, Church, Waves, TreePine, Locate, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useGeolocation } from '@/hooks/useGeolocation';

interface CitySearchProps {
  searchQuery: string;
  currentCity: string;
  onSearchChange: (value: string) => void;
  onSearchKeyPress: (e: React.KeyboardEvent) => void;
  onCitySelect: (city: string) => void;
}

// Global cities database with coordinates and icons
const globalCities = [
  // Major cities
  { name: 'New York', country: 'USA', icon: Building, coordinates: { lat: 40.7128, lng: -74.0060 } },
  { name: 'London', country: 'UK', icon: Clock, coordinates: { lat: 51.5074, lng: -0.1278 } },
  { name: 'Paris', country: 'France', icon: Landmark, coordinates: { lat: 48.8566, lng: 2.3522 } },
  { name: 'Tokyo', country: 'Japan', icon: Mountain, coordinates: { lat: 35.6762, lng: 139.6503 } },
  { name: 'Dubai', country: 'UAE', icon: Building2, coordinates: { lat: 25.2048, lng: 55.2708 } },
  { name: 'Singapore', country: 'Singapore', icon: Building, coordinates: { lat: 1.3521, lng: 103.8198 } },
  { name: 'Sydney', country: 'Australia', icon: Waves, coordinates: { lat: -33.8688, lng: 151.2093 } },
  { name: 'Rome', country: 'Italy', icon: Shield, coordinates: { lat: 41.9028, lng: 12.4964 } },
  { name: 'Barcelona', country: 'Spain', icon: Church, coordinates: { lat: 41.3851, lng: 2.1734 } },
  { name: 'Amsterdam', country: 'Netherlands', icon: Waves, coordinates: { lat: 52.3676, lng: 4.9041 } },
  { name: 'Berlin', country: 'Germany', icon: Building, coordinates: { lat: 52.5200, lng: 13.4050 } },
  { name: 'Milan', country: 'Italy', icon: Church, coordinates: { lat: 45.4642, lng: 9.1900 } },
  { name: 'San Francisco', country: 'USA', icon: Building2, coordinates: { lat: 37.7749, lng: -122.4194 } },
  { name: 'Los Angeles', country: 'USA', icon: Building, coordinates: { lat: 34.0522, lng: -118.2437 } },
  { name: 'Chicago', country: 'USA', icon: Building, coordinates: { lat: 41.8781, lng: -87.6298 } },
  { name: 'Miami', country: 'USA', icon: Waves, coordinates: { lat: 25.7617, lng: -80.1918 } },
  { name: 'Toronto', country: 'Canada', icon: Building, coordinates: { lat: 43.6532, lng: -79.3832 } },
  { name: 'Vancouver', country: 'Canada', icon: Mountain, coordinates: { lat: 49.2827, lng: -123.1207 } },
  { name: 'Bangkok', country: 'Thailand', icon: Church, coordinates: { lat: 13.7563, lng: 100.5018 } },
  { name: 'Hong Kong', country: 'China', icon: Building2, coordinates: { lat: 22.3193, lng: 114.1694 } },
  { name: 'Seoul', country: 'South Korea', icon: Building, coordinates: { lat: 37.5665, lng: 126.9780 } },
  { name: 'Mumbai', country: 'India', icon: Building, coordinates: { lat: 19.0760, lng: 72.8777 } },
  { name: 'Delhi', country: 'India', icon: Building, coordinates: { lat: 28.7041, lng: 77.1025 } },
  { name: 'Istanbul', country: 'Turkey', icon: Church, coordinates: { lat: 41.0082, lng: 28.9784 } },
  { name: 'Cairo', country: 'Egypt', icon: Shield, coordinates: { lat: 30.0444, lng: 31.2357 } },
  { name: 'Cape Town', country: 'South Africa', icon: Mountain, coordinates: { lat: -33.9249, lng: 18.4241 } },
  { name: 'São Paulo', country: 'Brazil', icon: Building, coordinates: { lat: -23.5505, lng: -46.6333 } },
  { name: 'Rio de Janeiro', country: 'Brazil', icon: Waves, coordinates: { lat: -22.9068, lng: -43.1729 } },
  { name: 'Buenos Aires', country: 'Argentina', icon: Building, coordinates: { lat: -34.6118, lng: -58.3960 } },
  { name: 'Mexico City', country: 'Mexico', icon: Building, coordinates: { lat: 19.4326, lng: -99.1332 } }
];

// Search function with fuzzy matching
const searchCities = (query: string) => {
  if (!query.trim()) return [];
  
  const searchTerm = query.toLowerCase();
  return globalCities
    .filter(city => 
      city.name.toLowerCase().includes(searchTerm) || 
      city.country.toLowerCase().includes(searchTerm)
    )
    .sort((a, b) => {
      // Prioritize exact matches
      const aExact = a.name.toLowerCase().startsWith(searchTerm) ? 0 : 1;
      const bExact = b.name.toLowerCase().startsWith(searchTerm) ? 0 : 1;
      return aExact - bExact;
    })
    .slice(0, 8);
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
                onClick={handleLocationClick}
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
              placeholder="Search any city in the world..."
              value={searchQuery === ' ' ? '' : searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyPress={onSearchKeyPress}
              onFocus={() => searchQuery && setIsOpen(true)}
              className="pl-12 pr-4 bg-white/95 backdrop-blur-sm border-gray-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-2xl h-12 shadow-sm"
              autoFocus
            />
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
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
              Try searching for major cities or countries
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CitySearch;
