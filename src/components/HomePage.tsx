
import { useState } from 'react';
import { MapPin, Search, User, Heart, Settings, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import LocationDetailSheet from './LocationDetailSheet';
import StoriesViewer from './StoriesViewer';
import CreateStoryModal from './CreateStoryModal';
import Map from './Map';
import { Location } from '@/services/locationService';

const HomePage = () => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [savedLocations, setSavedLocations] = useState<Location[]>([
    {
      id: '1',
      name: 'Central Park',
      category: 'park',
      address: 'New York, NY',
      latitude: 40.785091,
      longitude: -73.968285,
      created_by: 'user1',
      pioneer_user_id: 'user1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      name: 'Golden Gate Bridge',
      category: 'landmark',
      address: 'San Francisco, CA',
      latitude: 37.819929,
      longitude: -122.478255,
      created_by: 'user2',
      pioneer_user_id: 'user2',
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    },
    {
      id: '3',
      name: 'Eiffel Tower',
      category: 'landmark',
      address: 'Paris, France',
      latitude: 48.8584,
      longitude: 2.2945,
      created_by: 'user3',
      pioneer_user_id: 'user3',
      created_at: '2024-01-03T00:00:00Z',
      updated_at: '2024-01-03T00:00:00Z',
    },
  ]);
  const [selectedTab, setSelectedTab] = useState('map');
  const [selectedStory, setSelectedStory] = useState<number | null>(null);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [selectedMapFilter, setSelectedMapFilter] = useState('following');

  // Mock stories data - in a real app this would come from your API
  const mockStories = [
    {
      id: '1',
      userId: 'user1',
      userName: 'Emma',
      userAvatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png',
      mediaUrl: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png',
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
      userAvatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png',
      mediaUrl: '/lovable-uploads/5bb15f7b-b3ba-4eae-88b1-7fa789eb67c4.png',
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
      userName: 'Alex',
      userAvatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png',
      mediaUrl: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png',
      mediaType: 'image' as const,
      locationId: '3',
      locationName: 'Giuseppe\'s Restaurant',
      locationAddress: '789 Food St',
      timestamp: '6h ago',
      isViewed: false,
      bookingUrl: 'https://www.opentable.com/booking/giuseppe-restaurant'
    }
  ];

  const handleStoryViewed = (storyId: string) => {
    console.log('Story viewed:', storyId);
    // In a real app, you would update the story's viewed status in your backend
  };

  const handleStoryCreated = () => {
    console.log('Story created');
    // In a real app, you would refresh the stories list
  };

  const handleLocationClick = (location: Location) => {
    setSelectedLocation(location);
    setIsSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
  };

  const getFilteredLocations = () => {
    switch (selectedMapFilter) {
      case 'following':
        return savedLocations.filter(loc => ['user1', 'user2'].includes(loc.created_by));
      case 'popular':
        return savedLocations.slice(0, 2); // Mock: show first 2 as most popular
      case 'new':
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return savedLocations.filter(loc => new Date(loc.created_at) > oneWeekAgo);
      default:
        return savedLocations;
    }
  };

  const renderMap = () => {
    const filteredLocations = getFilteredLocations();
    
    return (
      <div className="flex-1 p-4">
        <Map 
          locations={filteredLocations}
          selectedFilter={selectedMapFilter}
          onLocationClick={handleLocationClick}
        />
      </div>
    );
  };

  const renderList = () => (
    <div className="flex-1 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Saved Locations</h2>
      </div>
      <div className="space-y-3">
        {savedLocations.map((location) => (
          <Card
            key={location.id}
            className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleLocationClick(location)}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-blue-50 text-blue-500 w-8 h-8 flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">{location.name}</h3>
                  <p className="text-sm text-gray-500">{location.address}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Discover</h1>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowCreateStory(true)}
              className="text-blue-600"
            >
              <Plus className="w-5 h-5 mr-1" />
              Story
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stories */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex gap-3 overflow-x-auto">
          {/* Your story */}
          <div 
            className="flex-shrink-0 text-center cursor-pointer"
            onClick={() => setShowCreateStory(true)}
          >
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center relative">
              <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center">
                <Plus className="w-6 h-6 text-gray-600" />
              </div>
            </div>
            <p className="text-xs mt-1 text-gray-600">Your Story</p>
          </div>

          {/* Friends' stories */}
          {mockStories.map((story, index) => (
            <div 
              key={story.id}
              className="flex-shrink-0 text-center cursor-pointer"
              onClick={() => setSelectedStory(index)}
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center relative ${
                story.isViewed 
                  ? 'bg-gray-300' 
                  : 'bg-gradient-to-r from-pink-500 to-orange-500'
              }`}>
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center overflow-hidden">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium">{story.userName[0]}</span>
                  </div>
                </div>
              </div>
              <p className="text-xs mt-1 text-gray-600 truncate w-16">{story.userName}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Map Filter Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex justify-around items-center">
          <button
            onClick={() => setSelectedMapFilter('following')}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors",
              selectedMapFilter === 'following' ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"
            )}
          >
            Following
          </button>
          <button
            onClick={() => setSelectedMapFilter('popular')}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors",
              selectedMapFilter === 'popular' ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"
            )}
          >
            Popular
          </button>
          <button
            onClick={() => setSelectedMapFilter('new')}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors",
              selectedMapFilter === 'new' ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"
            )}
          >
            New
          </button>
        </div>
      </div>

      {/* Selection Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex justify-around items-center">
          <button
            onClick={() => setSelectedTab('map')}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors",
              selectedTab === 'map' ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"
            )}
          >
            Map
          </button>
          <button
            onClick={() => setSelectedTab('list')}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors",
              selectedTab === 'list' ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"
            )}
          >
            List
          </button>
        </div>
      </div>

      {/* Map or List */}
      {selectedTab === 'map' ? renderMap() : renderList()}

      {/* Location Detail Sheet */}
      <LocationDetailSheet
        isOpen={isSheetOpen}
        onClose={handleCloseSheet}
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
    </div>
  );
};

export default HomePage;
