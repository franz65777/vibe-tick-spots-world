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
import MapSection from './home/MapSection';
import StoriesSection from './home/StoriesSection';
import PlaceCard from './home/PlaceCard';
import ShareModal from './home/ShareModal';
import CommentModal from './home/CommentModal';

const HomePage = () => {
  console.log('HomePage component rendering...');
  
  const [selectedTab, setSelectedTab] = useState('following');
  const [selectedCity, setSelectedCity] = useState('Detecting location...');
  const [selectedCategory, setSelectedCategory] = useState('All');
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
  const [likedPlaces, setLikedPlaces] = useState<Set<string>>(new Set());
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedPlaceForShare, setSelectedPlaceForShare] = useState<any>(null);
  const [selectedPlaceForComment, setSelectedPlaceForComment] = useState<any>(null);

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
          
          try {
            setSelectedCity('Current Location');
            setTimeout(() => {
              setSelectedCity('San Francisco');
            }, 1000);
          } catch (error) {
            console.error('Error getting location name:', error);
            setSelectedCity('San Francisco');
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          setSelectedCity('San Francisco');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    } else {
      setSelectedCity('San Francisco');
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
      ).slice(0, 5);
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
    const location: Location = {
      id: place.id,
      name: place.name,
      category: place.category,
      address: place.address || `${place.coordinates.lat}, ${place.coordinates.lng}`,
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
    const location: Location = {
      id: place.id,
      name: place.name,
      category: place.category,
      address: place.address || `${place.category} in ${selectedCity}`,
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
  };

  const handleStoryCreated = () => {
    console.log('Story created');
  };

  const friends = [
    { name: 'Emma', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b9e1a9a5?w=100&h=100&fit=crop&crop=face' },
    { name: 'Michael', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face' },
    { name: 'Sophia', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face' },
  ];

  // Replace sample places with actual saved locations or default places with like data
  const allPlaces = savedLocations.length > 0 ? savedLocations.map(location => ({
    id: location.id,
    name: location.name,
    category: location.category,
    likes: Math.floor(Math.random() * 200) + 50,
    friendsWhoSaved: friends.slice(0, Math.floor(Math.random() * 3) + 1),
    visitors: ['Emma', 'Michael'],
    isNew: false,
    coordinates: { lat: location.latitude || 37.7749, lng: location.longitude || -122.4194 }
  })) : [
    {
      id: '1',
      name: 'Golden Gate Cafe',
      category: 'Restaurant',
      likes: 128,
      friendsWhoSaved: [friends[0], friends[1]],
      visitors: ['Emma', 'Michael'],
      isNew: false,
      coordinates: { lat: 37.7749, lng: -122.4194 },
      image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=300&fit=crop'
    },
    {
      id: '2',
      name: 'Mission Rooftop Bar',
      category: 'Bar',
      likes: 89,
      friendsWhoSaved: [friends[2]],
      visitors: ['Sophia'],
      isNew: true,
      coordinates: { lat: 37.7849, lng: -122.4094 },
      image: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=400&h=300&fit=crop'
    },
    {
      id: '3',
      name: 'Grand Hotel Downtown',
      category: 'Hotel',
      likes: 156,
      friendsWhoSaved: [friends[0]],
      visitors: ['Emma'],
      isNew: false,
      coordinates: { lat: 37.7649, lng: -122.4194 },
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop'
    },
    {
      id: '4',
      name: 'Sunset Bistro',
      category: 'Restaurant',
      likes: 92,
      friendsWhoSaved: [friends[1], friends[2]],
      visitors: ['Michael', 'Sophia'],
      isNew: true,
      coordinates: { lat: 37.7549, lng: -122.4294 },
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop'
    }
  ];

  const filteredPlaces = selectedCategory === 'All' 
    ? allPlaces 
    : allPlaces.filter(place => place.category === selectedCategory);

  const handleLikeToggle = (placeId: string) => {
    setLikedPlaces(prev => {
      const newLiked = new Set(prev);
      if (newLiked.has(placeId)) {
        newLiked.delete(placeId);
      } else {
        newLiked.add(placeId);
      }
      return newLiked;
    });
  };

  const handleShare = (place: any) => {
    console.log('Opening share modal for:', place.name);
    setSelectedPlaceForShare(place);
    setShowShareModal(true);
  };

  const handleComment = (place: any) => {
    console.log('Opening comments for:', place.name);
    setSelectedPlaceForComment(place);
    setShowCommentModal(true);
  };

  const handleShareSubmit = (friendIds: string[], place: any) => {
    console.log('Sharing place with friends:', { place: place.name, friendIds });
    // In a real app, this would create messages with the shared location
  };

  const handleCommentSubmit = (text: string, place: any) => {
    console.log('Adding comment:', { place: place.name, text });
    // In a real app, this would save the comment to the backend
  };

  console.log('HomePage rendering with state:', {
    selectedTab,
    selectedCity,
    selectedCategory,
    savedLocations: savedLocations.length,
    places: filteredPlaces.length,
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
        <StoriesSection
          stories={mockStories}
          onCreateStory={() => setShowCreateStory(true)}
          onStoryClick={(index) => setSelectedStory(index)}
        />
      </div>

      {/* Map Section */}
      <MapSection
        places={filteredPlaces}
        onPinClick={handlePinClick}
      />

      {/* Categories */}
      <div className="px-4 py-4 bg-white border-t border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-3">
            <Button 
              size="sm" 
              className={cn(
                "rounded-full",
                selectedCategory === 'All' 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
              onClick={() => setSelectedCategory('All')}
            >
              All
            </Button>
            <Button 
              size="sm" 
              className={cn(
                "rounded-full",
                selectedCategory === 'Restaurant' 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
              onClick={() => setSelectedCategory('Restaurant')}
            >
              Restaurants
            </Button>
            <Button 
              size="sm" 
              className={cn(
                "rounded-full",
                selectedCategory === 'Hotel' 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
              onClick={() => setSelectedCategory('Hotel')}
            >
              Hotels
            </Button>
            <Button 
              size="sm" 
              className={cn(
                "rounded-full",
                selectedCategory === 'Bar' 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
              onClick={() => setSelectedCategory('Bar')}
            >
              Bars
            </Button>
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
          {filteredPlaces.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              isLiked={likedPlaces.has(place.id)}
              onCardClick={handleLocationCardClick}
              onLikeToggle={handleLikeToggle}
              onShare={handleShare}
              onComment={handleComment}
            />
          ))}
          
          {filteredPlaces.length === 0 && selectedCategory !== 'All' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No {selectedCategory.toLowerCase()}s found</h3>
              <p className="text-sm text-gray-500 mb-4">Try selecting a different category or save some locations!</p>
            </div>
          )}

          {savedLocations.length === 0 && selectedCategory === 'All' && (
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

      {/* Modals and Dialogs */}
      <SaveLocationDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onLocationSaved={loadSavedLocations}
      />

      <LocationDetailSheet
        isOpen={showLocationDetail}
        onClose={() => {
          console.log('Closing LocationDetailSheet');
          setShowLocationDetail(false);
          setSelectedLocation(null);
        }}
        location={selectedLocation}
      />

      {selectedStory !== null && (
        <StoriesViewer
          stories={mockStories}
          initialStoryIndex={selectedStory}
          onClose={() => setSelectedStory(null)}
          onStoryViewed={handleStoryViewed}
        />
      )}

      <CreateStoryModal
        isOpen={showCreateStory}
        onClose={() => setShowCreateStory(false)}
        onStoryCreated={handleStoryCreated}
      />

      <NotificationsModal
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      <MessagesModal
        isOpen={showMessages}
        onClose={() => setShowMessages(false)}
      />

      <ShareModal
        isOpen={showShareModal}
        onClose={() => {
          setShowShareModal(false);
          setSelectedPlaceForShare(null);
        }}
        place={selectedPlaceForShare}
        onShare={handleShareSubmit}
      />

      <CommentModal
        isOpen={showCommentModal}
        onClose={() => {
          setShowCommentModal(false);
          setSelectedPlaceForComment(null);
        }}
        place={selectedPlaceForComment}
        onCommentSubmit={handleCommentSubmit}
      />
    </div>
  );
};

export default HomePage;
