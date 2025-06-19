
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlaceLikes } from '@/hooks/usePlaceLikes';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';
import { useMapPins } from '@/hooks/useMapPins';
import Header from './home/Header';
import StoriesSection from './home/StoriesSection';
import FilterButtons from './home/FilterButtons';
import PlaceCard from './home/PlaceCard';
import MapSection from './home/MapSection';
import ModalsManager from './home/ModalsManager';
import LocationOfTheWeek from './home/LocationOfTheWeek';
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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'feed' | 'map'>('map'); // Default to map view
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
    addedBy: pin.addedBy || 'user',
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

  const filteredPlaces = selectedCategory === 'all' 
    ? places 
    : places.filter(place => place.category === selectedCategory);

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

  const handleCardClick = (place: Place) => {
    setSelectedPlace(place);
  };

  const handleSaveToggle = async (place: Place) => {
    if (isPlaceSaved(place.id)) {
      await unsavePlace(place.id, currentCity);
    } else {
      await savePlace({
        id: place.id,
        name: place.name,
        category: place.category,
        city: currentCity,
        coordinates: place.coordinates
      });
    }
  };

  const handleFilterChange = (filter: 'following' | 'popular' | 'new') => {
    setActiveFilter(filter);
  };

  // Mock categories for filter
  const categories = [
    { id: 'all', name: 'All', icon: '🌟' },
    { id: 'cafe', name: 'Cafés', icon: '☕' },
    { id: 'restaurant', name: 'Food', icon: '🍽️' },
    { id: 'attraction', name: 'Sights', icon: '🏛️' },
    { id: 'nature', name: 'Nature', icon: '🌲' }
  ];

  // Toggle between map and feed view
  const toggleViewMode = () => {
    setViewMode(viewMode === 'map' ? 'feed' : 'map');
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

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'feed' ? (
          <div className="h-full overflow-y-auto">
            {/* Stories Section */}
            <div className="bg-white px-4 py-3 border-b border-gray-100">
              <StoriesSection 
                stories={stories}
                onCreateStory={() => setIsCreateStoryModalOpen(true)} 
              />
            </div>

            {/* Location of the Week */}
            <div className="px-4 py-3">
              <LocationOfTheWeek 
                topLocation={{
                  id: '1',
                  name: 'Central Park',
                  image: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=400&h=300&fit=crop',
                  category: 'nature',
                  likes: 245,
                  saves: 89
                }}
                onLocationClick={(location) => console.log('Location clicked:', location)}
              />
            </div>

            {/* Filter Buttons */}
            <div className="bg-white px-4 py-3 border-y border-gray-100 sticky top-0 z-10">
              <FilterButtons
                activeFilter={activeFilter}
                onFilterChange={handleFilterChange}
                newCount={filteredPlaces.filter(p => p.isNew).length}
              />
            </div>

            {/* Places Feed */}
            <div className="px-4 py-2 space-y-3">
              {filteredPlaces.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  onLikeToggle={() => toggleLike(place.id)}
                  isLiked={likedPlaces.has(place.id)}
                  isSaved={isPlaceSaved(place.id)}
                  onCardClick={handleCardClick}
                  onSaveToggle={handleSaveToggle}
                  onShare={() => handleShare(place)}
                  onComment={() => handleComment(place)}
                  cityName={currentCity}
                />
              ))}
            </div>

            {/* Bottom padding for mobile navigation */}
            <div className="h-20"></div>
          </div>
        ) : (
          <>
            {/* Filter Buttons for Map View */}
            <div className="bg-white px-4 py-3 border-b border-gray-100 sticky top-0 z-10">
              <FilterButtons
                activeFilter={activeFilter}
                onFilterChange={handleFilterChange}
                newCount={filteredPlaces.filter(p => p.isNew).length}
              />
            </div>
            
            {/* Map Section */}
            <MapSection
              places={filteredPlaces}
              onPinClick={handlePinClick}
              mapCenter={mapCenter}
              selectedPlace={selectedPlace}
              onCloseSelectedPlace={() => setSelectedPlace(null)}
            />
          </>
        )}
      </div>

      {/* View Toggle Button */}
      <div className="fixed bottom-20 right-4 z-20">
        <button
          onClick={toggleViewMode}
          className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        >
          {viewMode === 'map' ? '📋' : '🗺️'}
        </button>
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
