import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/home/Header';
import StoriesSection from '@/components/home/StoriesSection';
import FilterButtons from '@/components/home/FilterButtons';
import MapSection from '@/components/home/MapSection';
import LocationOfTheWeek from '@/components/home/LocationOfTheWeek';
import ModalsManager from '@/components/home/ModalsManager';
import BottomNavigation from '@/components/BottomNavigation';

interface Place {
  id: string;
  name: string;
  category: string;
  likes: number;
  friendsWhoSaved: { name: string; avatar: string }[];
  visitors: string[];
  isNew: boolean;
  coordinates: { lat: number; lng: number };
  image: string;
  addedBy?: string;
  addedDate: string;
  isFollowing?: boolean;
  popularity?: number;
  distance?: string;
  totalSaves: number;
}

// Mock data for locations
const mockLocations: Place[] = [
  {
    id: '1',
    name: 'Mario\'s Pizza Palace',
    category: 'restaurant',
    likes: 156,
    friendsWhoSaved: [
      { name: 'Sarah', avatar: 'photo-1494790108755-2616b5a5c75b' },
      { name: 'Mike', avatar: 'photo-1507003211169-0a1dd7228f2d' }
    ],
    visitors: ['user1', 'user2', 'user3'],
    isNew: false,
    coordinates: { lat: 37.7849, lng: -122.4094 },
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop',
    addedBy: 'user1',
    addedDate: '2024-05-25',
    isFollowing: true,
    popularity: 89,
    distance: '0.3 km',
    totalSaves: 23
  },
  {
    id: '2',
    name: 'Tony\'s Authentic Pizza',
    category: 'restaurant',
    likes: 89,
    friendsWhoSaved: [
      { name: 'Emma', avatar: 'photo-1438761681033-6461ffad8d80' }
    ],
    visitors: ['user4', 'user5'],
    isNew: true,
    coordinates: { lat: 37.7749, lng: -122.4194 },
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop',
    addedBy: 'user2',
    addedDate: '2024-06-01',
    isFollowing: false,
    popularity: 76,
    distance: '0.8 km',
    totalSaves: 15
  },
  {
    id: '3',
    name: 'Blue Bottle Coffee',
    category: 'cafe',
    likes: 234,
    friendsWhoSaved: [
      { name: 'Alex', avatar: 'photo-1472099645785-5658abf4ff4e' },
      { name: 'Sofia', avatar: 'photo-1534528741775-53994a69daeb' }
    ],
    visitors: ['user6', 'user7', 'user8'],
    isNew: false,
    coordinates: { lat: 37.7649, lng: -122.4294 },
    image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop',
    addedBy: 'user3',
    addedDate: '2024-05-15',
    isFollowing: true,
    popularity: 94,
    distance: '1.2 km',
    totalSaves: 42
  }
];

// Mock stories data
const mockStories = [
  {
    id: '1',
    userId: 'user1',
    userName: 'Sarah',
    userAvatar: 'photo-1494790108755-2616b5a5c75b',
    isViewed: false,
    locationId: '1',
    locationName: 'Mario\'s Pizza Palace',
    locationCategory: 'restaurant'
  },
  {
    id: '2',
    userId: 'user2',
    userName: 'Mike',
    userAvatar: 'photo-1507003211169-0a1dd7228f2d',
    isViewed: true,
    locationId: '2',
    locationName: 'Tony\'s Pizza',
    locationCategory: 'restaurant'
  }
];

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedCity, setSelectedCity] = useState('San Francisco');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [likedPlaces, setLikedPlaces] = useState<Set<string>>(new Set());
  const [messagesModalOpen, setMessagesModalOpen] = useState(false);
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
  const [createStoryModalOpen, setCreateStoryModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [placeInteractionModalOpen, setPlaceInteractionModalOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/welcome');
    }
  }, [user, navigate]);

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
  };

  const handleFilterChange = (filter: string) => {
    setSelectedFilter(filter);
  };

  const handleLikeToggle = (placeId: string) => {
    setLikedPlaces(prev => {
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
    setSelectedPlace(place);
    setShareModalOpen(true);
  };

  const handleComment = (place: Place) => {
    setSelectedPlace(place);
    setCommentModalOpen(true);
  };

  const handleShareModalShare = (friendIds: string[], place: Place) => {
    console.log('Sharing place:', place, 'with friends:', friendIds);
    // Implement share logic here
  };

  const handleCommentSubmit = (text: string, place: Place) => {
    console.log('Comment added:', text, 'to place:', place);
    // Implement comment submission logic here
  };

  const handlePlaceClick = (place: Place) => {
    setSelectedPlace(place);
    setPlaceInteractionModalOpen(true);
  };

  const filteredPlaces = mockLocations.filter(place => {
    if (selectedFilter === 'All') return true;
    return place.category === selectedFilter;
  });

  const topLocation = filteredPlaces.length > 0 ? filteredPlaces[0] : null;

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50/30 via-white to-purple-50/20">
      <Header
        onCitySelect={handleCitySelect}
        onMessagesClick={() => setMessagesModalOpen(true)}
        onNotificationsClick={() => setNotificationsModalOpen(true)}
        onCreateStoryClick={() => setCreateStoryModalOpen(true)}
      />
      
      <div className="flex-1 overflow-y-auto pb-20">
        <StoriesSection 
          stories={mockStories}
          onCreateStory={() => setCreateStoryModalOpen(true)}
          onStoryClick={(index) => console.log('Story clicked:', index)}
        />
        <FilterButtons 
          activeFilter={selectedFilter} 
          onFilterChange={handleFilterChange} 
        />
        
        <MapSection
          places={filteredPlaces.map(place => ({
            ...place,
            addedBy: {
              name: typeof place.addedBy === 'string' ? place.addedBy : 'Explorer',
              avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
              isFollowing: place.isFollowing || false
            }
          }))}
          selectedPlace={selectedPlace}
          onPlaceClick={handlePlaceClick}
          cityName={selectedCity}
        />
        
        {topLocation && (
          <LocationOfTheWeek 
            topLocation={topLocation}
            onLocationClick={handlePlaceClick}
          />
        )}
      </div>

      <BottomNavigation />

      <ModalsManager
        isMessagesModalOpen={messagesModalOpen}
        setMessagesModalOpen={setMessagesModalOpen}
        isNotificationsModalOpen={notificationsModalOpen}
        setNotificationsModalOpen={setNotificationsModalOpen}
        isCreateStoryModalOpen={createStoryModalOpen}
        setCreateStoryModalOpen={setCreateStoryModalOpen}
        isShareModalOpen={shareModalOpen}
        setShareModalOpen={setShareModalOpen}
        isCommentModalOpen={commentModalOpen}
        setCommentModalOpen={setCommentModalOpen}
        isPlaceInteractionModalOpen={placeInteractionModalOpen}
        setPlaceInteractionModalOpen={setPlaceInteractionModalOpen}
        selectedPlace={selectedPlace ? {
          ...selectedPlace,
          addedBy: {
            name: typeof selectedPlace.addedBy === 'string' ? selectedPlace.addedBy : 'Explorer',
            avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
            isFollowing: selectedPlace.isFollowing || false
          }
        } : null}
        onShareModalShare={(friendIds, place) => handleShareModalShare(friendIds, place)}
        onCommentSubmit={(text, place) => handleCommentSubmit(text, place)}
      />
    </div>
  );
};

export default HomePage;
