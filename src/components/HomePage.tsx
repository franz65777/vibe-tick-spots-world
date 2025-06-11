
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
  friendsWhoSaved?: { name: string; avatar: string }[];
  visitors: string[];
  isNew: boolean;
  coordinates: { lat: number; lng: number };
  rating: number;
  reviews: number;
  distance: string;
  addedBy?: { name: string; avatar: string; isFollowing: boolean };
  addedDate: string;
  image: string;
  description?: string;
  totalSaves: number;
  popularity?: number;
}

interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  isViewed: boolean;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  locationId: string;
  locationName: string;
  locationAddress: string;
  timestamp: string;
  bookingUrl?: string;
  locationCategory?: string;
}

interface MapPin {
  id: string;
  position: { lat: number; lng: number };
  place: Place;
}

const HomePage = () => {
  const { user } = useAuth();
  const { location, loading: locationLoading } = useGeolocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentCity, setCurrentCity] = useState('Stockholm');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [places, setPlaces] = useState<Place[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [likedPlaces, setLikedPlaces] = useState<Set<string>>(new Set());
  const [mapPins, setMapPins] = useState<MapPin[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [isCreateStoryModalOpen, setIsCreateStoryModalOpen] = useState(false);
  const [isStoriesViewerOpen, setIsStoriesViewerOpen] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  // Generate demo places and stories data
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

    const demoStories: Story[] = [
      {
        id: 'story-1',
        userId: 'user-1',
        userName: 'Emma',
        userAvatar: '/api/placeholder/32/32',
        isViewed: false,
        mediaUrl: '/api/placeholder/400/600',
        mediaType: 'image',
        locationId: '1',
        locationName: 'Gamla Stan',
        locationAddress: 'Stockholm, Sweden',
        timestamp: '2024-01-15T10:30:00Z',
        locationCategory: 'restaurant'
      },
      {
        id: 'story-2',
        userId: 'user-2',
        userName: 'Alex',
        userAvatar: '/api/placeholder/32/32',
        isViewed: true,
        mediaUrl: '/api/placeholder/400/600',
        mediaType: 'image',
        locationId: '2',
        locationName: 'Vasa Museum',
        locationAddress: 'Stockholm, Sweden',
        timestamp: '2024-01-14T15:45:00Z',
        locationCategory: 'museum'
      }
    ];

    setPlaces(demoPlaces);
    setStories(demoStories);

    // Generate map pins from places
    const pins: MapPin[] = demoPlaces.map(place => ({
      id: place.id,
      position: place.coordinates,
      place: place
    }));
    setMapPins(pins);
  }, []);

  const topLocation = places.length > 0 ? places[0] : null;

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

  const handleMapPinClick = (pin: MapPin) => {
    const placeWithImage: Place = {
      ...pin.place,
      image: pin.place.image || '/api/placeholder/400/300'
    };
    handlePlaceClick(placeWithImage);
  };

  const handlePlaceCardClick = (place: Place) => {
    handlePlaceClick(place);
  };

  const handleLikeToggle = (place: Place) => {
    const newLikedPlaces = new Set(likedPlaces);
    if (likedPlaces.has(place.id)) {
      newLikedPlaces.delete(place.id);
      setPlaces(prev => prev.map(p => 
        p.id === place.id 
          ? { ...p, likes: p.likes - 1 }
          : p
      ));
    } else {
      newLikedPlaces.add(place.id);
      setPlaces(prev => prev.map(p => 
        p.id === place.id 
          ? { ...p, likes: p.likes + 1 }
          : p
      ));
    }
    setLikedPlaces(newLikedPlaces);
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

  const handleStoryClick = (index: number) => {
    setCurrentStoryIndex(index);
    setIsStoriesViewerOpen(true);
  };

  const handleStoryViewed = (storyId: string) => {
    setStories(prev => prev.map(story => 
      story.id === storyId 
        ? { ...story, isViewed: true }
        : story
    ));
  };

  const handleStoryCreated = () => {
    console.log('Story created');
    setIsCreateStoryModalOpen(false);
  };

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
          stories={stories}
          onCreateStory={() => setIsCreateStoryModalOpen(true)}
          onStoryClick={handleStoryClick}
        />
        
        <div className="px-4 sm:px-6 space-y-6">
          <MapSection 
            places={places}
            onPinClick={handlePlaceClick}
            userLocation={location}
          />
          
          {topLocation && (
            <LocationOfTheWeek 
              topLocation={topLocation}
              onLocationClick={handlePlaceClick}
            />
          )}
          
          <FilterButtons 
            filters={['All', 'Historic', 'Museum', 'Restaurant', 'Bar']}
            selectedFilter={selectedFilter}
            onFilterChange={handleFilterChange}
          />
          
          <div className="space-y-4">
            {filteredPlaces.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                isLiked={likedPlaces.has(place.id)}
                onCardClick={() => handlePlaceCardClick(place)}
                onLikeToggle={() => handleLikeToggle(place)}
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
        isCreateStoryModalOpen={isCreateStoryModalOpen}
        isNotificationsModalOpen={isNotificationsOpen}
        isMessagesModalOpen={isMessagesOpen}
        isShareModalOpen={isShareModalOpen}
        isCommentModalOpen={isCommentModalOpen}
        isLocationDetailOpen={isDetailSheetOpen}
        isStoriesViewerOpen={isStoriesViewerOpen}
        sharePlace={selectedPlace}
        commentPlace={selectedPlace}
        locationDetailPlace={selectedPlace}
        stories={stories}
        currentStoryIndex={currentStoryIndex}
        onCreateStoryModalClose={() => setIsCreateStoryModalOpen(false)}
        onNotificationsModalClose={() => setIsNotificationsOpen(false)}
        onMessagesModalClose={() => setIsMessagesOpen(false)}
        onShareModalClose={() => setIsShareModalOpen(false)}
        onCommentModalClose={() => setIsCommentModalOpen(false)}
        onLocationDetailClose={() => setIsDetailSheetOpen(false)}
        onStoriesViewerClose={() => setIsStoriesViewerOpen(false)}
        onStoryCreated={handleStoryCreated}
        onShare={handleShare}
        onCommentSubmit={handleComment}
        onStoryViewed={handleStoryViewed}
      />
    </div>
  );
};

export default HomePage;
