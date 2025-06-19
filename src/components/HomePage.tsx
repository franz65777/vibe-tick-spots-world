
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlaceLikes } from '@/hooks/usePlaceLikes';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';
import { useMapPins } from '@/hooks/useMapPins';
import Header from './home/Header';
import StoriesSection from './home/StoriesSection';
import FilterButtons from './home/FilterButtons';
import MapSection from './home/MapSection';
import ModalsManager from './home/ModalsManager';
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
  const [activeFilter, setActiveFilter] = useState<'following' | 'popular' | 'new'>('following');
  const { pins, loading, refreshPins, hasFollowedUsers } = useMapPins(activeFilter);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [sharePlace, setSharePlace] = useState<Place | null>(null);
  const [commentPlace, setCommentPlace] = useState<Place | null>(null);
  const [isCreateStoryModalOpen, setIsCreateStoryModalOpen] = useState(false);
  
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
    addedBy: typeof pin.addedBy === 'string' ? pin.addedBy : (pin.addedBy || 'user'),
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
    console.log('Notifications clicked');
  };

  const handleMessagesClick = () => {
    console.log('Messages clicked');
  };

  const handleCitySelect = (city: string) => {
    setCurrentCity(city);
    setSearchQuery('');
    refreshPins(city);
  };

  const handleFilterChange = (filter: 'following' | 'popular' | 'new') => {
    setActiveFilter(filter);
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
    </div>
  );
};

export default HomePage;
