
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import BottomNavigation from './BottomNavigation';
import Header from './home/Header';
import StoriesSection from './home/StoriesSection';
import MapSection from './home/MapSection';
import LocationOfTheWeek from './home/LocationOfTheWeek';
import FilterButtons from './home/FilterButtons';
import PlaceCard from './home/PlaceCard';
import ModalsManager from './home/ModalsManager';

// Define unified Place interface
interface Place {
  id: string;
  name: string;
  category: string;
  likes: number;
  friendsWhoSaved: { name: string; avatar: string; }[];
  visitors: string[];
  isNew: boolean;
  coordinates: { lat: number; lng: number };
  rating: number;
  reviews: number;
  distance: string;
  addedBy: { name: string; avatar: string; isFollowing: boolean };
  addedDate: string;
  image: string;
  description?: string;
  totalSaves: number;
}

const HomePage = () => {
  const { user } = useAuth();
  const { location, loading: locationLoading } = useGeolocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentCity, setCurrentCity] = useState('Stockholm');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [isCreateStoryModalOpen, setIsCreateStoryModalOpen] = useState(false);
  const [likedPlaces, setLikedPlaces] = useState<Set<string>>(new Set());

  // Generate demo places data
  useEffect(() => {
    const demoPlaces: Place[] = [
      {
        id: '1',
        name: 'Gamla Stan',
        category: 'Historic',
        likes: 234,
        friendsWhoSaved: [
          { name: 'Emma', avatar: '/api/placeholder/32/32' },
          { name: 'Alex', avatar: '/api/placeholder/32/32' }
        ],
        visitors: ['Emma', 'Alex', 'Sara'],
        isNew: true,
        coordinates: { lat: 59.3251, lng: 18.0711 },
        rating: 4.8,
        reviews: 156,
        distance: '0.5 km',
        addedBy: { name: 'Emma', avatar: '/api/placeholder/32/32', isFollowing: true },
        addedDate: '2024-01-15',
        image: '/api/placeholder/400/300',
        description: 'Historic old town with cobblestone streets',
        totalSaves: 234
      },
      {
        id: '2',
        name: 'Vasa Museum',
        category: 'Museum',
        likes: 189,
        friendsWhoSaved: [
          { name: 'John', avatar: '/api/placeholder/32/32' }
        ],
        visitors: ['John', 'Lisa'],
        isNew: false,
        coordinates: { lat: 59.3280, lng: 18.0912 },
        rating: 4.7,
        reviews: 89,
        distance: '1.2 km',
        addedBy: { name: 'John', avatar: '/api/placeholder/32/32', isFollowing: false },
        addedDate: '2024-01-10',
        image: '/api/placeholder/400/300',
        description: 'Maritime museum with preserved 17th-century ship',
        totalSaves: 189
      }
    ];

    setPlaces(demoPlaces);
  }, []);

  const handleSearch = (query: string) => {
    console.log('Search query:', query);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(searchQuery);
    }
  };

  const handleCitySelect = (city: string) => {
    setCurrentCity(city);
    console.log('Selected city:', city);
  };

  const handleFilterChange = (filter: string) => {
    setSelectedFilter(filter);
    console.log('Selected filter:', filter);
  };

  const handlePlaceClick = (place: Place) => {
    setSelectedPlace(place);
    setIsDetailSheetOpen(true);
  };

  const handleMapPinClick = (place: Place) => {
    handlePlaceClick(place);
  };

  const handleLike = (place: Place) => {
    setPlaces(prev => prev.map(p => 
      p.id === place.id 
        ? { ...p, likes: p.likes + 1 }
        : p
    ));
  };

  const handleSave = (place: Place) => {
    console.log('Saving place:', place.name);
  };

  const handleShare = (friendIds: string[], place: Place) => {
    console.log('Sharing place with friends:', friendIds, place.name);
    setIsShareModalOpen(false);
  };

  const handleComment = (text: string, place: Place) => {
    console.log('Adding comment:', text, 'to place:', place.name);
    setIsCommentModalOpen(false);
  };

  const handleLikeToggle = (placeId: string) => {
    setLikedPlaces(prev => {
      const newSet = new Set(prev);
      if (newSet.has(placeId)) {
        newSet.delete(placeId);
      } else {
        newSet.add(placeId);
      }
      return newSet;
    });
  };

  const topLocation = places.length > 0 ? places[0] : null;

  const filteredPlaces = places.filter(place => {
    const matchesFilter = selectedFilter === 'All' || place.category === selectedFilter;
    const matchesSearch = place.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header
        searchQuery={searchQuery}
        currentCity={currentCity}
        onSearchChange={setSearchQuery}
        onSearchKeyPress={handleSearchKeyPress}
        onNotificationsClick={() => setIsNotificationsOpen(true)}
        onMessagesClick={() => setIsMessagesOpen(true)}
        onCitySelect={handleCitySelect}
      />
      
      <div className="flex-1 overflow-auto pb-20">
        <StoriesSection 
          stories={[]}
          onStoryClick={() => {}}
          onCreateStory={() => setIsCreateStoryModalOpen(true)} 
        />
        
        <div className="px-4 sm:px-6 space-y-6">
          <MapSection 
            places={places}
            onPinClick={handleMapPinClick}
            mapCenter={location ? { lat: location.latitude, lng: location.longitude } : undefined}
            selectedPlace={selectedPlace}
          />
          
          {topLocation && (
            <LocationOfTheWeek 
              topLocation={topLocation}
              onLocationClick={handlePlaceClick}
            />
          )}
          
          <FilterButtons 
            selectedFilter={selectedFilter}
            onFilterChange={handleFilterChange}
          />
          
          <div className="space-y-4">
            {filteredPlaces.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                isLiked={likedPlaces.has(place.id)}
                onCardClick={() => handlePlaceClick(place)}
                onLikeToggle={() => handleLikeToggle(place.id)}
                onShare={() => {
                  setSelectedPlace(place);
                  setIsShareModalOpen(true);
                }}
                onComment={() => {
                  setSelectedPlace(place);
                  setIsCommentModalOpen(true);
                }}
                cityName={currentCity}
              />
            ))}
          </div>
        </div>
      </div>

      <BottomNavigation />

      <ModalsManager
        selectedPlace={selectedPlace}
        isDetailSheetOpen={isDetailSheetOpen}
        isNotificationsOpen={isNotificationsOpen}
        isMessagesOpen={isMessagesOpen}
        isShareModalOpen={isShareModalOpen}
        isCommentModalOpen={isCommentModalOpen}
        isCreateStoryModalOpen={isCreateStoryModalOpen}
        onCloseDetailSheet={() => setIsDetailSheetOpen(false)}
        onCloseNotifications={() => setIsNotificationsOpen(false)}
        onCloseMessages={() => setIsMessagesOpen(false)}
        onCloseShareModal={() => setIsShareModalOpen(false)}
        onCloseCommentModal={() => setIsCommentModalOpen(false)}
        onCloseCreateStoryModal={() => setIsCreateStoryModalOpen(false)}
        onShare={handleShare}
        onComment={handleComment}
      />
    </div>
  );
};

export default HomePage;
