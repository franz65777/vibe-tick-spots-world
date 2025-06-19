
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlaceLikes } from '@/hooks/usePlaceLikes';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';
import { useMapPins } from '@/hooks/useMapPins';
import { useNotifications } from '@/hooks/useNotifications';
import Header from './home/Header';
import StoriesSection from './home/StoriesSection';
import FilterButtons from './home/FilterButtons';
import MapSection from './home/MapSection';
import ModalsManager from './home/ModalsManager';
import LocationOfTheWeek from './home/LocationOfTheWeek';
import NotificationsModal from './NotificationsModal';
import MessagesModal from './MessagesModal';
import { Place } from '@/types/place';

interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  preview: string;
  timestamp: Date;
  isViewed: boolean;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  locationId: string;
  locationName: string;
}

const HomePage = () => {
  const { user } = useAuth();
  const { likedPlaces, toggleLike } = usePlaceLikes();
  const { savedPlaces, savePlace, unsavePlace, isPlaceSaved } = useSavedPlaces();
  const { notifications, unreadCount } = useNotifications();
  const [activeFilter, setActiveFilter] = useState<'following' | 'popular' | 'new'>('following');
  const { pins, loading, refreshPins, hasFollowedUsers } = useMapPins(activeFilter);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [sharePlace, setSharePlace] = useState<Place | null>(null);
  const [commentPlace, setCommentPlace] = useState<Place | null>(null);
  const [isCreateStoryModalOpen, setIsCreateStoryModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isMessagesModalOpen, setIsMessagesModalOpen] = useState(false);
  
  // Add search state management
  const [searchQuery, setSearchQuery] = useState('');
  const [currentCity, setCurrentCity] = useState('New York');

  // Convert pins to places format for compatibility
  const places: Place[] = pins.map(pin => ({
    id: pin.id,
    name: pin.name,
    category: pin.category,
    coordinates: pin.coordinates,
    likes: pin.likes,
    visitors: Array.isArray(pin.visitors) ? pin.visitors : [],
    isNew: pin.isNew || false,
    image: pin.image,
    addedBy: typeof pin.addedBy === 'string' ? pin.addedBy : 'user',
    addedDate: pin.addedDate,
    isFollowing: pin.isFollowing,
    popularity: pin.popularity,
    distance: pin.distance,
    totalSaves: pin.totalSaves
  }));

  const [mapCenter] = useState({ lat: 40.7589, lng: -73.9851 });

  // Mock stories data with correct Story interface
  const [stories] = useState<Story[]>([
    { 
      id: '1', 
      userId: 'user1',
      userName: 'John', 
      userAvatar: '', 
      preview: '', 
      timestamp: new Date(),
      isViewed: false,
      mediaType: 'image' as const,
      mediaUrl: '',
      locationId: '1',
      locationName: 'Café Central'
    },
    { 
      id: '2', 
      userId: 'user2',
      userName: 'Sarah', 
      userAvatar: '', 
      preview: '', 
      timestamp: new Date(),
      isViewed: false,
      mediaType: 'image' as const,
      mediaUrl: '',
      locationId: '2',
      locationName: 'Brooklyn Bridge'
    }
  ]);

  const handlePinClick = (place: Place) => {
    setSelectedPlace(place);
  };

  const handleShare = (place: Place) => {
    setSharePlace(place);
  };

  const handleComment = (place: Place) => {
    setCommentPlace(place);
  };

  const handleCommentSubmit = (comment: string) => {
    console.log('Comment submitted:', comment);
    setCommentPlace(null);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      console.log('Search query:', searchQuery);
    }
  };

  const handleNotificationsClick = () => {
    setIsNotificationsModalOpen(true);
  };

  const handleMessagesClick = () => {
    setIsMessagesModalOpen(true);
  };

  const handleCitySelect = (city: string) => {
    setCurrentCity(city);
    setSearchQuery('');
    refreshPins(city);
  };

  const handleFilterChange = (filter: 'following' | 'popular' | 'new') => {
    setActiveFilter(filter);
  };

  // Sample location of the week data
  const locationOfTheWeek = {
    id: 'lotw-1',
    name: 'Central Park Conservatory Garden',
    image: 'https://images.unsplash.com/photo-1568515387631-8b650bbcdb90?w=400&h=300&fit=crop',
    description: 'A hidden gem in Central Park featuring beautiful seasonal gardens and peaceful walking paths.',
    category: 'park',
    likes: 245,
    saves: 89,
    coordinates: { lat: 40.7829, lng: -73.9654 },
    visitors: 156
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <Header 
        searchQuery={searchQuery}
        currentCity={currentCity}
        onSearchChange={setSearchQuery}
        onSearchKeyPress={handleSearchKeyPress}
        onNotificationsClick={handleNotificationsClick}
        onMessagesClick={handleMessagesClick}
        onCitySelect={handleCitySelect}
      />

      {/* Stories Section */}
      <div className="bg-white px-4 py-3 border-b border-gray-100">
        <StoriesSection 
          stories={stories}
          onCreateStory={() => setIsCreateStoryModalOpen(true)} 
        />
      </div>

      {/* Location of the Week */}
      <div className="bg-white px-4 py-4 border-b border-gray-100">
        <LocationOfTheWeek 
          topLocation={locationOfTheWeek}
          onLocationClick={(place: Place) => {
            handlePinClick(place);
          }}
        />
      </div>

      {/* Filter Buttons */}
      <div className="bg-white px-4 py-3 border-b border-gray-100 sticky top-0 z-10">
        <FilterButtons
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
          newCount={places.filter(p => p.isNew).length}
        />
      </div>
      
      {/* Map Section */}
      <div className="flex-1 overflow-hidden">
        <MapSection
          places={places}
          onPinClick={handlePinClick}
          mapCenter={mapCenter}
          selectedPlace={selectedPlace}
          onCloseSelectedPlace={() => setSelectedPlace(null)}
        />
      </div>

      {/* Modals */}
      <ModalsManager
        selectedPlace={selectedPlace}
        onCloseSelectedPlace={() => setSelectedPlace(null)}
        sharePlace={sharePlace}
        onCloseShare={() => setSharePlace(null)}
        commentPlace={commentPlace}
        onCloseComment={() => setCommentPlace(null)}
        onCommentSubmit={handleCommentSubmit}
        isCreateStoryModalOpen={isCreateStoryModalOpen}
        onCloseCreateStory={() => setIsCreateStoryModalOpen(false)}
        likedPlaces={likedPlaces}
        onToggleLike={toggleLike}
      />

      {/* Notifications Modal */}
      <NotificationsModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
      />

      {/* Messages Modal */}
      <MessagesModal
        isOpen={isMessagesModalOpen}
        onClose={() => setIsMessagesModalOpen(false)}
      />
    </div>
  );
};

export default HomePage;
