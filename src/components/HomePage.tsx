
import { useState, useEffect } from 'react';
import { Heart, Settings, Bell, Plus, MapPin, Search, X, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import SaveLocationDialog from '@/components/SaveLocationDialog';
import { locationService, Location } from '@/services/locationService';
import LocationDetailSheet from '@/components/LocationDetailSheet';
import StoriesViewer from './StoriesViewer';
import CreateStoryModal from './CreateStoryModal';
import NotificationsModal from './NotificationsModal';
import MessagesModal from './MessagesModal';

const HomePage = () => {
  console.log('HomePage component rendering...');
  
  const [selectedTab, setSelectedTab] = useState('following');
  const [selectedCity, setSelectedCity] = useState('Detecting location...');
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [savedLocations, setSavedLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [showLocationDetail, setShowLocationDetail] = useState(false);
  const [selectedStory, setSelectedStory] = useState<number | null>(null);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);

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

  // Mock stories data - in a real app this would come from your API
  const mockStories = [
    {
      id: '1',
      userId: 'user1',
      userName: 'Emma',
      userAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b9e1a9a5?w=100&h=100&fit=crop&crop=face',
      mediaUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=600&fit=crop',
      mediaType: 'image' as const,
      locationId: '1',
      locationName: 'Cafe Central',
      locationAddress: '123 Main St',
      timestamp: '2h ago',
      isViewed: false,
      bookingUrl: 'https://www.opentable.com/booking/cafe-central'
    },
    {
      id: '2',
      userId: 'user2',
      userName: 'Michael',
      userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
      mediaUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=600&fit=crop',
      mediaType: 'image' as const,
      locationId: '2',
      locationName: 'The Rooftop Bar',
      locationAddress: '456 High St',
      timestamp: '4h ago',
      isViewed: true,
      bookingUrl: 'https://www.booking.com/hotel/rooftop-bar'
    },
    {
      id: '3',
      userId: 'user3',
      userName: 'Sophia',
      userAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
      mediaUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=600&fit=crop',
      mediaType: 'image' as const,
      locationId: '3',
      locationName: 'Giuseppe\'s Restaurant',
      locationAddress: '789 Food St',
      timestamp: '6h ago',
      isViewed: false,
      bookingUrl: 'https://www.opentable.com/booking/giuseppe-restaurant'
    }
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

  // Load user's saved locations with error handling
  useEffect(() => {
    console.log('HomePage useEffect for loading saved locations running...');
    loadSavedLocations();
  }, []);

  const loadSavedLocations = async () => {
    try {
      console.log('Loading saved locations...');
      setIsLoading(true);
      const locations = await locationService.getUserSavedLocations();
      console.log('Loaded locations:', locations);
      setSavedLocations(locations);
    } catch (error) {
      console.error('Error loading saved locations:', error);
      // Don't fail the component, just use empty array
      setSavedLocations([]);
    } finally {
      setIsLoading(false);
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

  const handlePinClick = (place: any) => {
    console.log('Pin clicked:', place);
    // Convert place to Location format
    const location: Location = {
      id: place.id,
      name: place.name,
      category: place.category,
      address: place.address || `${place.coordinates.lat}, ${place.coordinates.lng}`, // Mock address
      latitude: place.coordinates.lat,
      longitude: place.coordinates.lng,
      created_by: 'demo-user',
      pioneer_user_id: 'demo-user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    console.log('Setting selected location:', location);
    setSelectedLocation(location);
    setShowLocationDetail(true);
    console.log('LocationDetailSheet should open now');
  };

  const handleLocationCardClick = (place: any) => {
    console.log('Location card clicked:', place);
    // Convert place to Location format - same as handlePinClick
    const location: Location = {
      id: place.id,
      name: place.name,
      category: place.category,
      address: place.address || `${place.category} in ${selectedCity}`, // Better mock address
      latitude: place.coordinates.lat,
      longitude: place.coordinates.lng,
      created_by: 'demo-user',
      pioneer_user_id: 'demo-user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    console.log('Setting selected location from card:', location);
    setSelectedLocation(location);
    setShowLocationDetail(true);
    console.log('LocationDetailSheet should open from card click');
  };

  const handleStoryViewed = (storyId: string) => {
    console.log('Story viewed:', storyId);
    // In a real app, you would update the story's viewed status in your backend
  };

  const handleStoryCreated = () => {
    console.log('Story created');
    // In a real app, you would refresh the stories list
  };

  const friends = [
    { name: 'Emma', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b9e1a9a5?w=100&h=100&fit=crop&crop=face' },
    { name: 'Michael', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face' },
    { name: 'Sophia', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face' },
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
      coordinates: { lat: 37.7749, lng: -122.4194 },
      image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=300&fit=crop'
    },
    {
      id: '2',
      name: 'Mission Rooftop Bar',
      category: 'Bar',
      rating: 4.6,
      visitors: ['Sophia'],
      isNew: true,
      price: '$$$',
      coordinates: { lat: 37.7849, lng: -122.4094 },
      image: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=400&h=300&fit=crop'
    }
  ];

  console.log('HomePage rendering with state:', {
    selectedTab,
    selectedCity,
    savedLocations: savedLocations.length,
    places: places.length,
    isLoading,
    showLocationDetail,
    selectedLocation: selectedLocation?.name
  });

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-white items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    );
  }

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
            <button 
              onClick={() => setShowNotifications(true)}
              className="relative"
            >
              <Bell className="w-6 h-6 text-gray-600" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
            </button>
            <button 
              onClick={() => setShowMessages(true)}
              className="relative"
            >
              <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-xs">📋</span>
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
            </button>
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
            <div 
              className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center cursor-pointer"
              onClick={() => setShowCreateStory(true)}
            >
              <Plus className="w-6 h-6 text-gray-400" />
            </div>
            <span className="text-xs text-gray-500">Add Story</span>
          </div>
          {mockStories.map((story, index) => (
            <div key={story.id} className="flex flex-col items-center gap-2">
              <div 
                className={`w-16 h-16 rounded-full p-0.5 cursor-pointer ${
                  story.isViewed 
                    ? 'bg-gray-300' 
                    : 'bg-gradient-to-r from-pink-500 to-purple-500'
                }`}
                onClick={() => setSelectedStory(index)}
              >
                <div className="w-full h-full rounded-full bg-white p-0.5">
                  <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-xs font-medium">{story.userName[0]}</span>
                  </div>
                </div>
              </div>
              <span className="text-xs text-gray-700 font-medium">{story.userName}</span>
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
              onClick={() => handlePinClick(place)}
            >
              {/* Pin */}
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white hover:scale-110 transition-transform">
                <div className="w-3 h-3 bg-white rounded-full"></div>
              </div>
              
              {/* Hover Info Card */}
              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-3 min-w-48 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
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
            <div 
              key={place.id} 
              className="relative cursor-pointer hover:scale-[1.02] transition-transform"
              onClick={() => handleLocationCardClick(place)}
            >
              {place.isNew && (
                <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium z-10">
                  NEW
                </div>
              )}
              <div className="bg-gray-100 rounded-xl h-32 relative overflow-hidden">
                {place.image ? (
                  <img
                    src={place.image}
                    alt={place.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.setAttribute('style', 'display: block');
                    }}
                  />
                ) : null}
                <div className={`absolute inset-0 bg-gradient-to-r from-green-400 to-blue-400 opacity-50 ${place.image ? 'hidden' : ''}`}></div>
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

      {/* Location Detail Sheet */}
      <LocationDetailSheet
        isOpen={showLocationDetail}
        onClose={() => {
          console.log('Closing LocationDetailSheet');
          setShowLocationDetail(false);
          setSelectedLocation(null);
        }}
        location={selectedLocation}
      />

      {/* Stories Viewer */}
      {selectedStory !== null && (
        <StoriesViewer
          stories={mockStories}
          initialStoryIndex={selectedStory}
          onClose={() => setSelectedStory(null)}
          onStoryViewed={handleStoryViewed}
        />
      )}

      {/* Create Story Modal */}
      <CreateStoryModal
        isOpen={showCreateStory}
        onClose={() => setShowCreateStory(false)}
        onStoryCreated={handleStoryCreated}
      />

      {/* Notifications Modal */}
      <NotificationsModal
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      {/* Messages Modal */}
      <MessagesModal
        isOpen={showMessages}
        onClose={() => setShowMessages(false)}
      />
    </div>
  );
};

export default HomePage;
