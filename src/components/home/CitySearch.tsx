
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, MapPin, Search, X } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';

interface CitySearchProps {
  currentCity: string;
  onCitySelect: (city: string, coordinates: { lat: number; lng: number }) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const CitySearch = ({ 
  currentCity, 
  onCitySelect, 
  searchQuery, 
  onSearchChange, 
  onSearchKeyPress 
}: CitySearchProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { searchCity } = useGeolocation();

  // Popular cities for quick access
  const popularCities = [
    'San Francisco', 'New York', 'London', 'Paris', 'Tokyo', 'Milan',
    'Barcelona', 'Rome', 'Amsterdam', 'Sydney', 'Dubai', 'Singapore',
    'Los Angeles', 'Chicago', 'Miami', 'Toronto', 'Vancouver', 'Berlin',
    'Madrid', 'Lisbon', 'Stockholm', 'Copenhagen', 'Mumbai', 'Delhi',
    'Bangkok', 'Seoul', 'Melbourne', 'Cape Town', 'Buenos Aires'
  ];

  const handleCitySearch = async (cityName: string) => {
    if (!cityName.trim()) return;
    
    setIsSearching(true);
    try {
      const coordinates = await searchCity(cityName);
      if (coordinates) {
        onCitySelect(cityName, coordinates);
        setIsOpen(false);
        setSearchInput('');
      } else {
        console.error('City not found:', cityName);
      }
    } catch (error) {
      console.error('Error searching city:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);
    
    if (value.length > 0) {
      const filtered = popularCities
        .filter(city => city.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 5);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchInput.trim()) {
      handleCitySearch(searchInput);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchInput('');
        setSuggestions([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-2 flex-1">
      {/* City Selector */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-colors min-w-0"
        >
          <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span className="font-medium text-gray-900 truncate max-w-[100px] sm:max-w-none">
            {currentCity}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-80 max-w-[90vw] bg-white rounded-2xl shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden">
            {/* Search Input */}
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search any city in the world..."
                  value={searchInput}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  className="w-full pl-10 pr-10 py-2 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  autoFocus
                />
                {searchInput && (
                  <button
                    onClick={() => {
                      setSearchInput('');
                      setSuggestions([]);
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {isSearching && (
                <div className="mt-2 text-center text-sm text-gray-500">
                  Searching...
                </div>
              )}
            </div>

            {/* Search Suggestions */}
            {suggestions.length > 0 && (
              <div className="py-2">
                <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Suggestions
                </div>
                {suggestions.map((city) => (
                  <button
                    key={city}
                    onClick={() => handleCitySearch(city)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <Search className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">{city}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Popular Cities */}
            <div className="py-2 max-h-64 overflow-y-auto">
              <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Popular Cities
              </div>
              {popularCities.map((city) => (
                <button
                  key={city}
                  onClick={() => handleCitySearch(city)}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                    city === currentCity ? 'bg-blue-50 text-blue-600' : 'text-gray-900'
                  }`}
                >
                  <MapPin className={`w-4 h-4 ${city === currentCity ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span>{city}</span>
                  {city === currentCity && (
                    <div className="ml-auto w-2 h-2 bg-blue-600 rounded-full"></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Global Search Input */}
      <div className="flex-1 relative max-w-xs">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search places..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyPress={onSearchKeyPress}
          className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-2xl border-0 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all placeholder-gray-500"
        />
      </div>
    </div>
  );
};

export default CitySearch;
