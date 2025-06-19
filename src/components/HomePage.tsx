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
  const [activeFilter, setActiveFilter] = useState<'following' | 'popular'>('following');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
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

  // Convert pins to places format and filter by categories - FIXED FILTERING
  const places: Place[] = pins
    .map(pin => ({
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
    }))
    .filter(place => {
      // If no categories selected, show all places
      if (selectedCategories.length === 0) {
        return true;
      }
      // Only show places that match selected categories
      return selectedCategories.includes(place.category);
    });

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

  const handleFilterChange = (filter: 'following' | 'popular') => {
    console.log('Filter changed to:', filter);
    setActiveFilter(filter);
    // Clear selected categories when switching filters
    setSelectedCategories([]);
  };

  const handleCategoryChange = (categories: string[]) => {
    console.log('Categories changed to:', categories);
    setSelectedCategories(categories);
  };

  // Get location of the week based on current city
  const getLocationOfTheWeek = () => {
    const locationsByCity: Record<string, any> = {
      'New York': {
        id: 'lotw-ny',
        name: 'Central Park Conservatory Garden',
        image: 'https://images.unsplash.com/photo-1568515387631-8b650bbcdb90?w=400&h=300&fit=crop',
        category: 'park',
        likes: 245,
        coordinates: { lat: 40.7829, lng: -73.9654 },
        visitors: 156
      },
      'San Francisco': {
        id: 'lotw-sf',
        name: 'Golden Gate Park Japanese Tea Garden',
        image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
        category: 'park',
        likes: 189,
        coordinates: { lat: 37.7701, lng: -122.4696 },
        visitors: 123
      },
      'Milan': {
        id: 'lotw-milan',
        name: 'Navigli District',
        image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=300&fit=crop',
        category: 'attraction',
        likes: 167,
        coordinates: { lat: 45.4583, lng: 9.1756 },
        visitors: 89
      },
      'Paris': {
        id: 'lotw-paris',
        name: 'Jardin du Luxembourg',
        image: 'https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=400&h=300&fit=crop',
        category: 'park',
        likes: 298,
        coordinates: { lat: 48.8462, lng: 2.3372 },
        visitors: 201
      }
    };

    return locationsByCity[currentCity] || locationsByCity['New York'];
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
          topLocation={getLocationOfTheWeek()}
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
          selectedCategories={selectedCategories}
          onCategoryChange={handleCategoryChange}
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
