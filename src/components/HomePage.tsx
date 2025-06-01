
import { useState, useEffect } from 'react';
import { Heart, Settings, Bell, Plus, MapPin, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const HomePage = () => {
  const [selectedTab, setSelectedTab] = useState('following');
  const [selectedCity, setSelectedCity] = useState('Detecting location...');
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);

  // Sample cities for search (in a real app, this would come from an API)
  const popularCities = [
    'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix',
    'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'Austin',
    'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte', 'Seattle',
    'Denver', 'Washington', 'Boston', 'Nashville', 'Baltimore',
    'Oklahoma City', 'Portland', 'Las Vegas', 'Louisville', 'Milwaukee',
    'Albuquerque', 'Tucson', 'Fresno', 'Sacramento', 'Kansas City',
    'Atlanta', 'Miami', 'Colorado Springs', 'Raleigh', 'Omaha',
    'Long Beach', 'Virginia Beach', 'Oakland', 'Minneapolis', 'Tampa',
    'Tulsa', 'Arlington', 'New Orleans', 'Wichita', 'Cleveland'
  ];

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          console.log('User location:', latitude, longitude);
          
          // In a real app, you would use a reverse geocoding service
          // For now, we'll simulate getting the city name
          try {
            // Simulated reverse geocoding - in real app use Google Maps API or similar
            setSelectedCity('Current Location');
            setTimeout(() => {
              // Simulate getting actual city name
              setSelectedCity('San Francisco'); // Default fallback
            }, 1000);
          } catch (error) {
            console.error('Error getting location name:', error);
            setSelectedCity('San Francisco');
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          setSelectedCity('San Francisco'); // Default fallback
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    } else {
      setSelectedCity('San Francisco'); // Default fallback
    }
  }, []);

  // Handle search functionality
  useEffect(() => {
    if (searchQuery.length > 0) {
      const filtered = popularCities.filter(city =>
        city.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5); // Limit to 5 results
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    setIsSearching(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const friends = [
    { name: 'Emma', avatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png' },
    { name: 'Michael', avatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png' },
    { name: 'Sophia', avatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png' },
  ];

  const places = [
    {
      id: 1,
      name: 'Golden Gate Cafe',
      category: 'Restaurant',
      rating: 4.8,
      visitors: ['Emma', 'Michael'],
      isNew: false,
      price: '$$'
    },
    {
      id: 2,
      name: 'Mission Rooftop Bar',
      category: 'Bar',
      rating: 4.6,
      visitors: ['Sophia'],
      isNew: true,
      price: '$$$'
    }
  ];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <span className="text-sm text-gray-500">Discover</span>
              {isSearching ? (
                <div className="relative">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for a city..."
                    className="text-lg font-semibold border-0 p-0 h-auto bg-transparent focus-visible:ring-0"
                    autoFocus
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 mt-1">
                      {searchResults.map((city) => (
                        <button
                          key={city}
                          onClick={() => handleCitySelect(city)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                        >
                          {city}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setIsSearching(true)}
                  className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors text-left"
                >
                  {selectedCity}
                </button>
              )}
            </div>
            {isSearching && (
              <button
                onClick={() => {
                  setIsSearching(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="w-6 h-6 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="w-6 h-6 text-gray-600" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
            </div>
            <div className="relative">
              <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-xs">📋</span>
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
          <button
            onClick={() => setSelectedTab('following')}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all",
              selectedTab === 'following'
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600"
            )}
          >
            <div className="flex items-center justify-center gap-1">
              <span className="text-xs">👥</span>
              Following
            </div>
          </button>
          <button
            onClick={() => setSelectedTab('popular')}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all",
              selectedTab === 'popular'
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600"
            )}
          >
            <div className="flex items-center justify-center gap-1">
              <Heart className="w-4 h-4" />
              Popular
            </div>
          </button>
          <button
            onClick={() => setSelectedTab('new')}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all relative",
              selectedTab === 'new'
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600"
            )}
          >
            <div className="flex items-center justify-center gap-1">
              <Settings className="w-4 h-4" />
              New
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
            </div>
          </button>
        </div>

        {/* Friends Stories */}
        <div className="flex gap-3 mb-4">
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center">
              <Plus className="w-6 h-6 text-gray-400" />
            </div>
            <span className="text-xs text-gray-500">Add Story</span>
          </div>
          {friends.map((friend, index) => (
            <div key={index} className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 p-0.5">
                <div className="w-full h-full rounded-full bg-white p-0.5">
                  <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-xs font-medium">{friend.name[0]}</span>
                  </div>
                </div>
              </div>
              <span className="text-xs text-gray-700 font-medium">{friend.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-green-100 via-blue-100 to-blue-200">
          {/* Mock Map */}
          <div className="absolute inset-4 bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="h-full relative bg-gradient-to-br from-green-50 to-blue-50">
              {/* Mock map elements */}
              <div className="absolute top-8 left-8 text-xs font-medium text-gray-600">
                PACIFIC HEIGHTS
              </div>
              <div className="absolute top-16 right-8 text-xs font-medium text-gray-600">
                CHINATOWN
              </div>
              <div className="absolute bottom-20 left-12 text-xs font-medium text-gray-600">
                MISSION<br />DISTRICT
              </div>
              <div className="absolute bottom-32 right-16 text-xs font-medium text-gray-600">
                UNION SQUARE
              </div>
              
              {/* Mock location pins */}
              <div className="absolute top-20 left-1/2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              <div className="absolute top-32 right-20 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              <div className="absolute bottom-24 left-1/3 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>

              {/* Expand button */}
              <button className="absolute bottom-4 right-4 w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center">
                <div className="grid grid-cols-2 gap-0.5">
                  <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                  <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                  <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                  <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 py-4 bg-white border-t border-gray-100">
        <div className="flex gap-3 mb-4">
          <Button size="sm" className="bg-blue-600 text-white rounded-full">All</Button>
          <Button size="sm" variant="outline" className="rounded-full">Restaurants</Button>
          <Button size="sm" variant="outline" className="rounded-full">Hotels</Button>
          <Button size="sm" variant="outline" className="rounded-full">Bars</Button>
        </div>

        {/* Place Cards */}
        <div className="space-y-3">
          {places.map((place) => (
            <div key={place.id} className="relative">
              {place.isNew && (
                <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium z-10">
                  NEW
                </div>
              )}
              <div className="bg-gray-100 rounded-xl h-32 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-blue-400 opacity-50"></div>
                <div className="absolute bottom-2 right-2 bg-white text-gray-800 text-xs px-2 py-1 rounded">
                  {place.price}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Add Button */}
      <button className="absolute bottom-20 right-4 w-14 h-14 bg-blue-600 rounded-2xl shadow-lg flex items-center justify-center">
        <Plus className="w-6 h-6 text-white" />
      </button>
    </div>
  );
};

export default HomePage;
