
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlaceLikes } from '@/hooks/usePlaceLikes';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';
import Header from './home/Header';
import StoriesSection from './home/StoriesSection';
import FilterButtons from './home/FilterButtons';
import PlaceCard from './home/PlaceCard';
import MapSection from './home/MapSection';
import ModalsManager from './home/ModalsManager';
import LocationOfTheWeek from './home/LocationOfTheWeek';
import { Place } from '@/types/place';

const HomePage = () => {
  const { user } = useAuth();
  const { likedPlaces, toggleLike } = usePlaceLikes();
  const { savedPlaces, isPlaceSaved, savePlace, unsavePlace } = useSavedPlaces();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'feed' | 'map'>('feed');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [sharePlace, setSharePlace] = useState<Place | null>(null);
  const [commentPlace, setCommentPlace] = useState<Place | null>(null);
  const [isCreateStoryModalOpen, setIsCreateStoryModalOpen] = useState(false);
  
  // Add search state management
  const [searchQuery, setSearchQuery] = useState('');
  const [currentCity, setCurrentCity] = useState('New York');

  // Mock data - in a real app, this would come from an API
  const [places, setPlaces] = useState<Place[]>([
    {
      id: '1',
      name: 'Café Central',
      category: 'cafe',
      likes: 24,
      visitors: ['user1', 'user2', 'user3'],
      isNew: true,
      coordinates: { lat: 40.7589, lng: -73.9851 },
      image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop',
      addedBy: 'user1'
    },
    {
      id: '2',
      name: 'Brooklyn Bridge',
      category: 'attraction',
      likes: 89,
      visitors: ['user4', 'user5'],
      isNew: false,
      coordinates: { lat: 40.7061, lng: -73.9969 },
      image: 'https://images.unsplash.com/photo-1518391846015-55a9cc003b25?w=400&h=300&fit=crop',
      addedBy: 'user2'
    }
  ]);

  const [mapCenter] = useState({ lat: 40.7589, lng: -73.9851 });

  // Mock stories data with correct Story interface
  const [stories] = useState([
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

  // Mock categories for filter
  const categories = [
    { id: 'all', name: 'All', icon: '🌟' },
    { id: 'cafe', name: 'Cafés', icon: '☕' },
    { id: 'restaurant', name: 'Food', icon: '🍽️' },
    { id: 'attraction', name: 'Sights', icon: '🏛️' },
    { id: 'nature', name: 'Nature', icon: '🌲' }
  ];

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
                activeFilter="following"
                onFilterChange={() => {}}
                newCount={5}
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
          <MapSection
            places={filteredPlaces}
            onPinClick={handlePinClick}
            mapCenter={mapCenter}
            selectedPlace={selectedPlace}
            onCloseSelectedPlace={() => setSelectedPlace(null)}
          />
        )}
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
