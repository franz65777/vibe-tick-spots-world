
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';
import { useAuth } from '@/contexts/AuthContext';
import Header from './home/Header';
import CitySearch from './home/CitySearch';
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
  rating: number;
  tags: string[];
  description: string;
  address: string;
  coordinates: { lat: number; lng: number };
  openingHours: string;
  priceRange: string;
  visitors: string[];
  friendsWhoSaved: { name: string; avatar: string; }[];
  isNew?: boolean;
  distance?: string;
  estimatedTime?: string;
  phone?: string;
  website?: string;
  socialMedia?: {
    instagram?: string;
    facebook?: string;
  };
  likes: number;
}

interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  isViewed: boolean;
  locationId: string;
  locationName: string;
  locationCategory?: string;
}

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { savedPlaces, savePlace, unsavePlace, isPlaceSaved } = useSavedPlaces();
  
  const [selectedCity, setSelectedCity] = useState('Milan');
  const [selectedFilter, setSelectedFilter] = useState<'following' | 'popular' | 'new'>('popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [isLocationDetailOpen, setIsLocationDetailOpen] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [placeToSave, setPlaceToSave] = useState<Place | null>(null);

  // Demo data
  const stories: Story[] = [
    {
      id: '1',
      userId: 'user1',
      userName: 'Marco',
      userAvatar: '/api/placeholder/40/40',
      isViewed: false,
      locationId: 'cafe-milano-1',
      locationName: 'Café Milano',
      locationCategory: 'cafe'
    },
    {
      id: '2',
      userId: 'user2',
      userName: 'Sofia',
      userAvatar: '/api/placeholder/40/40',
      isViewed: true,
      locationId: 'duomo-restaurant-1',
      locationName: 'Duomo Restaurant',
      locationCategory: 'restaurant'
    },
    {
      id: '3',
      userId: 'user3',
      userName: 'Luca',
      userAvatar: '/api/placeholder/40/40',
      isViewed: false,
      locationId: 'navigli-bar-1',
      locationName: 'Navigli Bar',
      locationCategory: 'bar'
    }
  ];

  const demoPlaces: Place[] = [
    {
      id: 'cafe-milano-1',
      name: 'Café Milano',
      category: 'cafe',
      image: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png',
      rating: 4.8,
      tags: ['Coffee', 'Breakfast', 'WiFi'],
      description: 'Charming café in the heart of Milan with excellent coffee and pastries.',
      address: 'Via Brera 12, Milan',
      coordinates: { lat: 45.4642, lng: 9.1900 },
      openingHours: '7:00 AM - 7:00 PM',
      priceRange: '€€',
      visitors: ['Marco', 'Sofia', 'Luca'],
      friendsWhoSaved: [
        { name: 'Marco', avatar: '/api/placeholder/32/32' },
        { name: 'Sofia', avatar: '/api/placeholder/32/32' }
      ],
      isNew: true,
      distance: '0.5 km',
      estimatedTime: '2 min walk',
      likes: 24
    },
    {
      id: 'duomo-restaurant-1',
      name: 'Duomo Restaurant',
      category: 'restaurant',
      image: '/lovable-uploads/5bb15f7b-b3ba-4eae-88b1-7fa789eb67c4.png',
      rating: 4.6,
      tags: ['Italian', 'Fine Dining', 'Romantic'],
      description: 'Elegant restaurant with a view of the Duomo cathedral.',
      address: 'Piazza del Duomo 5, Milan',
      coordinates: { lat: 45.4640, lng: 9.1896 },
      openingHours: '12:00 PM - 11:00 PM',
      priceRange: '€€€',
      visitors: ['Anna', 'Giuseppe'],
      friendsWhoSaved: [
        { name: 'Anna', avatar: '/api/placeholder/32/32' }
      ],
      likes: 18
    },
    {
      id: 'navigli-bar-1',
      name: 'Navigli Bar',
      category: 'bar',
      image: '/lovable-uploads/5df0be70-7240-4958-ba55-5921ab3785e9.png',
      rating: 4.4,
      tags: ['Cocktails', 'Nightlife', 'Canal View'],
      description: 'Trendy bar along the famous Navigli canals.',
      address: 'Naviglio Grande 15, Milan',
      coordinates: { lat: 45.4583, lng: 9.1756 },
      openingHours: '6:00 PM - 2:00 AM',
      priceRange: '€€',
      visitors: ['Matteo', 'Giulia', 'Francesco'],
      friendsWhoSaved: [
        { name: 'Matteo', avatar: '/api/placeholder/32/32' },
        { name: 'Giulia', avatar: '/api/placeholder/32/32' }
      ],
      likes: 31
    }
  ];

  const filteredPlaces = demoPlaces.filter(place => {
    const matchesFilter = selectedFilter === 'popular' || place.category === selectedFilter.toLowerCase();
    const matchesSearch = searchQuery === '' || 
      place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      place.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const handlePlaceClick = (place: Place) => {
    console.log('Place clicked:', place.name);
    setSelectedPlace(place);
    setIsLocationDetailOpen(true);
  };

  const handleSavePlace = (place: Place) => {
    if (isPlaceSaved(place.id)) {
      unsavePlace(place.id, selectedCity);
    } else {
      setPlaceToSave(place);
      setShowSaveDialog(true);
    }
  };

  const confirmSavePlace = () => {
    if (placeToSave) {
      savePlace({
        id: placeToSave.id,
        name: placeToSave.name,
        category: placeToSave.category,
        city: selectedCity,
        coordinates: placeToSave.coordinates
      });
      setShowSaveDialog(false);
      setPlaceToSave(null);
    }
  };

  const handleSearch = () => {
    // Handle search functionality
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleNotifications = () => {
    // Handle notifications
  };

  const handleMessages = () => {
    // Handle messages
  };

  const handleCreateStory = () => {
    // Handle create story
  };

  // Get the top location for location of the week
  const topLocation = demoPlaces.reduce((prev, current) => 
    (prev.likes > current.likes) ? prev : current
  );

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <Header 
        searchQuery={searchQuery}
        currentCity={selectedCity}
        onSearchChange={setSearchQuery}
        onSearchKeyPress={handleKeyPress}
        onNotificationsClick={handleNotifications}
        onMessagesClick={handleMessages}
        onCitySelect={setSelectedCity}
      />
      
      <div className="flex-1 overflow-y-auto pb-20">
        <FilterButtons 
          activeFilter={selectedFilter}
          onFilterChange={setSelectedFilter}
          newCount={demoPlaces.filter(p => p.isNew).length}
        />
        
        <StoriesSection 
          stories={stories}
          onCreateStory={handleCreateStory}
          onStoryClick={(index) => {
            setSelectedStoryIndex(index);
            setIsStoryViewerOpen(true);
          }}
        />
        
        <LocationOfTheWeek 
          topLocation={topLocation}
          onLocationClick={handlePlaceClick}
        />
        
        <div className="px-4 space-y-4">
          {filteredPlaces.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              isSaved={isPlaceSaved(place.id)}
              onSave={() => handleSavePlace(place)}
              onClick={() => handlePlaceClick(place)}
            />
          ))}
        </div>
        
        <MapSection 
          places={filteredPlaces}
          onPinClick={handlePlaceClick}
          selectedPlace={selectedPlace}
          onCloseSelectedPlace={() => setSelectedPlace(null)}
        />
      </div>

      <ModalsManager
        selectedPlace={selectedPlace}
        isLocationDetailOpen={isLocationDetailOpen}
        isCommentModalOpen={isCommentModalOpen}
        isShareModalOpen={isShareModalOpen}
        isStoryViewerOpen={isStoryViewerOpen}
        showSaveDialog={showSaveDialog}
        selectedStoryIndex={selectedStoryIndex}
        stories={stories}
        onLocationDetailClose={() => setIsLocationDetailOpen(false)}
        onCommentModalClose={() => setIsCommentModalOpen(false)}
        onShareModalClose={() => setIsShareModalOpen(false)}
        onStoryViewerClose={() => setIsStoryViewerOpen(false)}
        onSaveDialogClose={() => {
          setShowSaveDialog(false);
          setPlaceToSave(null);
        }}
        onCommentModalOpen={() => setIsCommentModalOpen(true)}
        onShareModalOpen={() => setIsShareModalOpen(true)}
        onConfirmSave={confirmSavePlace}
        placeToSave={placeToSave}
      />
    </div>
  );
};

export default HomePage;
