import { useState, useEffect, useMemo } from 'react';
import { useLocation } from '@/hooks/useLocation';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';
import Header from './home/Header';
import FilterButtons from './home/FilterButtons';
import StoriesSection from './home/StoriesSection';
import LocationOfTheWeek from './home/LocationOfTheWeek';
import PlaceCard from './home/PlaceCard';
import MapSection from './home/MapSection';
import ModalsManager from './home/ModalsManager';

interface Place {
  id: string;
  name: string;
  category: string;
  image: string;
  likes: number;
  visitors: string[];
  isNew: boolean;
  coordinates: { lat: number; lng: number };
  friendsWhoSaved?: { name: string; avatar: string }[];
  addedBy?: string;
  addedDate?: string;
  isFollowing?: boolean;
}

const demoPlaces: Place[] = [
  {
    id: '1',
    name: 'The Cozy Corner Café',
    category: 'restaurants',
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=300&fit=crop',
    coordinates: { lat: 37.7749, lng: -122.4194 },
    likes: 24,
    visitors: ['user1', 'user2'],
    isNew: false,
    friendsWhoSaved: [
      { name: 'Sarah', avatar: 'photo-1494790108755-2616b5a5c75b' },
      { name: 'Mike', avatar: 'photo-1507003211169-0a1dd7228f2d' }
    ],
    addedBy: 'user1',
    addedDate: '2024-05-25',
    isFollowing: true
  },
  {
    id: '2',
    name: 'Sunset View Restaurant',
    category: 'restaurants',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
    coordinates: { lat: 37.7849, lng: -122.4094 },
    likes: 18,
    visitors: ['user3'],
    isNew: true,
    addedBy: 'user2',
    addedDate: '2024-06-01',
    isFollowing: true
  },
  {
    id: '3',
    name: 'Grand Plaza Hotel',
    category: 'cafes',
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=300&fit=crop',
    coordinates: { lat: 37.7949, lng: -122.4294 },
    likes: 45,
    visitors: ['user4', 'user5'],
    isNew: false,
    friendsWhoSaved: [
      { name: 'Emma', avatar: 'photo-1438761681033-6461ffad8d80' }
    ],
    addedBy: 'user5',
    addedDate: '2024-05-15',
    isFollowing: false
  },
  {
    id: '4',
    name: 'The Local Bar',
    category: 'bars',
    image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=300&fit=crop',
    coordinates: { lat: 37.8049, lng: -122.4394 },
    likes: 28,
    visitors: ['user6'],
    isNew: false,
    addedBy: 'user3',
    addedDate: '2024-05-20',
    isFollowing: true
  },
];

const HomePage = () => {
  const { currentCity, updateUserLocation } = useLocation();
  const { savedPlaces } = useSavedPlaces();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'following' | 'popular' | 'new'>('following');
  const [likedPlaces, setLikedPlaces] = useState(new Set());
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [modalState, setModalState] = useState({
    notifications: false,
    messages: false,
    share: false,
    comment: false,
    createStory: false
  });

  const filteredPlaces = useMemo(() => {
    let filtered = demoPlaces;

    if (activeFilter === 'following') {
      filtered = filtered.filter(place => place.isFollowing);
    }

    if (activeFilter === 'popular') {
      filtered = filtered.sort((a, b) => b.likes - a.likes);
    }

    return filtered;
  }, [activeFilter]);

  const getNewPlacesCount = () => {
    return demoPlaces.filter(place => place.isNew).length;
  };

  const handleCitySelect = (city: string) => {
    updateUserLocation(city);
  };

  const handleLikeToggle = (placeId: string) => {
    setLikedPlaces((prev) => {
      const newLiked = new Set(prev);
      if (newLiked.has(placeId)) {
        newLiked.delete(placeId);
      } else {
        newLiked.add(placeId);
      }
      return newLiked;
    });
  };

  const handleShare = (place: Place) => {
    console.log('Share place:', place.name);
    setModalState(prev => ({ ...prev, share: true }));
  };

  const handleComment = (place: Place) => {
    console.log('Comment on place:', place.name);
    setModalState(prev => ({ ...prev, comment: true }));
  };

  const handlePlaceClick = (place: Place) => {
    setSelectedPlace(place);
  };

  const handlePlaceUpdate = (updatedPlace: Place) => {
    setSelectedPlace(updatedPlace);
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-hidden">
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg">
        <Header
          searchQuery={searchQuery}
          currentCity={currentCity}
          onSearchChange={setSearchQuery}
          onSearchKeyPress={() => {}}
          onNotificationsClick={() => setModalState(prev => ({ ...prev, notifications: true }))}
          onMessagesClick={() => setModalState(prev => ({ ...prev, messages: true }))}
          onCitySelect={handleCitySelect}
        />
        <FilterButtons
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          newCount={getNewPlacesCount()}
        />
      </div>

      {/* Main content with proper top spacing */}
      <div className="flex-1 overflow-y-auto pt-32 pb-20">
        <div className="px-4 space-y-6">
          <StoriesSection onCreateStory={() => setModalState(prev => ({ ...prev, createStory: true }))} />
          <LocationOfTheWeek />
          
          <div className="space-y-4">
            {filteredPlaces.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                isLiked={likedPlaces.has(place.id)}
                onCardClick={handlePlaceClick}
                onLikeToggle={handleLikeToggle}
                onShare={handleShare}
                onComment={handleComment}
                cityName={currentCity}
              />
            ))}
          </div>
        </div>
      </div>

      <MapSection
        places={filteredPlaces}
        activeFilter={activeFilter}
        onPlaceSelect={handlePlaceClick}
      />

      <ModalsManager
        modalState={modalState}
        setModalState={setModalState}
        selectedPlace={selectedPlace}
        onPlaceUpdate={handlePlaceUpdate}
      />
    </div>
  );
};

export default HomePage;
