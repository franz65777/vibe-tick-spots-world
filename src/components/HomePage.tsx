import { useState, useEffect } from 'react';
import { Heart, Settings, Bell, Plus, MapPin, Search, X, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import SaveLocationDialog from '@/components/SaveLocationDialog';
import { locationService, Location } from '@/services/locationService';

const HomePage = () => {
  console.log('HomePage component rendering...');
  
  const [selectedTab, setSelectedTab] = useState('following');
  const [selectedCity, setSelectedCity] = useState('Detecting location...');
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [savedLocations, setSavedLocations] = useState<Location[]>([]);

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
    console.log('HomePage useEffect for location running...');
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

  // Load user's saved locations
  useEffect(() => {
    console.log('HomePage useEffect for loading saved locations running...');
    loadSavedLocations();
  }, []);

  const loadSavedLocations = async () => {
    try {
      console.log('Loading saved locations...');
      const locations = await locationService.getUserSavedLocations();
      console.log('Loaded locations:', locations);
      setSavedLocations(locations);
    } catch (error) {
      console.error('Error loading saved locations:', error);
    }
  };

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

  // Replace sample places with actual saved locations or default places
  const places = savedLocations.length > 0 ? savedLocations.map(location => ({
    id: location.id,
    name: location.name,
    category: location.category,
    rating: 4.5 + Math.random() * 0.5, // Mock rating
    visitors: ['Emma', 'Michael'], // Mock visitors
    isNew: false,
    price: '$$',
    coordinates: { lat: location.latitude || 37.7749, lng: location.longitude || -122.4194 }
  })) : [
    {
      id: '1',
      name: 'Golden Gate Cafe',
      category: 'Restaurant',
      rating: 4.8,
      visitors: ['Emma', 'Michael'],
      isNew: false,
      price: '$$',
      coordinates: { lat: 37.7749, lng: -122.4194 }
    },
    {
      id: '2',
      name: 'Mission Rooftop Bar',
      category: 'Bar',
      rating: 4.6,
      visitors: ['Sophia'],
      isNew: true,
      price: '$$$',
      coordinates: { lat: 37.7849, lng: -122.4094 }
    }
  ];

  console.log('HomePage rendering with state:', {
    selectedTab,
    selectedCity,
    savedLocations: savedLocations.length,
    places: places.length
  });

  return (
    <div className="flex flex-col h-full bg-white">
      {console.log('HomePage JSX rendering...')}
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

      {/* Map Section */}
      <div className="px-4 pb-4 bg-white">
        <div className="h-64 bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl relative overflow-hidden shadow-lg">
          {/* Map Background with Google Maps Style */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-green-50 to-blue-200">
            {/* Street lines */}
            <svg className="absolute inset-0 w-full h-full">
              <defs>
                <pattern id="streets" patternUnits="userSpaceOnUse" width="40" height="40">
                  <path d="M0,20 L40,20" stroke="#ddd" strokeWidth="1"/>
                  <path d="M20,0 L20,40" stroke="#ddd" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#streets)" opacity="0.3"/>
            </svg>
          </div>

          {/* Location Labels */}
          <div className="absolute top-4 left-4 text-xs font-medium text-gray-600 bg-white/80 px-2 py-1 rounded">
            PACIFIC HEIGHTS
          </div>
          <div className="absolute top-6 right-4 text-xs font-medium text-gray-600 bg-white/80 px-2 py-1 rounded">
            CHINATOWN
          </div>
          <div className="absolute bottom-16 left-4 text-xs font-medium text-gray-600 bg-white/80 px-2 py-1 rounded">
            MISSION<br />DISTRICT
          </div>
          <div className="absolute bottom-20 right-8 text-xs font-medium text-gray-600 bg-white/80 px-2 py-1 rounded">
            UNION SQUARE
          </div>

          {/* Place Pins with visitor info */}
          {places.map((place, index) => (
            <div 
              key={place.id}
              className="absolute group cursor-pointer"
              style={{
                top: `${30 + index * 15}%`,
                left: `${25 + index * 20}%`
              }}
            >
              {/* Pin */}
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                <div className="w-3 h-3 bg-white rounded-full"></div>
              </div>
              
              {/* Hover Info Card */}
              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-3 min-w-48 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <div className="text-sm font-semibold text-gray-900">{place.name}</div>
                <div className="text-xs text-gray-500 mb-1">{place.category} • {place.price}</div>
                <div className="text-xs text-gray-600">
                  Visited by: {place.visitors.join(', ')}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-yellow-500">★</span>
                  <span className="text-xs text-gray-600">{place.rating}</span>
                </div>
                {/* Arrow */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"></div>
              </div>
            </div>
          ))}

          {/* Current Location Indicator */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-4 h-4 bg-blue-600 rounded-full border-4 border-white shadow-lg animate-pulse"></div>
          </div>

          {/* Expand Map Button */}
          <button className="absolute bottom-4 right-4 w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors">
            <div className="grid grid-cols-2 gap-0.5">
              <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
            </div>
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 py-4 bg-white border-t border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-3">
            <Button size="sm" className="bg-blue-600 text-white rounded-full">All</Button>
            <Button size="sm" variant="outline" className="rounded-full">Restaurants</Button>
            <Button size="sm" variant="outline" className="rounded-full">Hotels</Button>
            <Button size="sm" variant="outline" className="rounded-full">Bars</Button>
          </div>
          {savedLocations.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Bookmark className="w-3 h-3" />
              {savedLocations.length} saved
            </div>
          )}
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
                <div className="absolute bottom-2 left-2 text-white text-sm font-medium">
                  {place.name}
                </div>
                <div className="absolute top-2 right-2 text-white text-xs">
                  ★ {place.rating}
                </div>
              </div>
            </div>
          ))}
          
          {savedLocations.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No saved locations yet</h3>
              <p className="text-sm text-gray-500 mb-4">Start saving places to create location hubs!</p>
              <Button
                onClick={() => setShowSaveDialog(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Save Your First Location
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Add Button */}
      <button 
        onClick={() => setShowSaveDialog(true)}
        className="absolute bottom-20 right-4 w-14 h-14 bg-blue-600 rounded-2xl shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
      >
        <Plus className="w-6 h-6 text-white" />
      </button>

      {/* Save Location Dialog */}
      <SaveLocationDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onLocationSaved={loadSavedLocations}
      />
    </div>
  );
};

export default HomePage;
