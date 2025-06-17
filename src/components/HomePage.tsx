import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from './home/Header';
import StoriesSection from './home/StoriesSection';
import FilterButtons from './home/FilterButtons';
import PlaceCard from './home/PlaceCard';
import LocationOfTheWeek from './home/LocationOfTheWeek';
import MapSection from './home/MapSection';
import ModalsManager from './home/ModalsManager';
import PlaceInteractionModal from './home/PlaceInteractionModal';
import { useSearch } from '@/hooks/useSearch';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Place } from '@/types/place';

interface HomeStory {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  isViewed: boolean;
  locationId: string;
  locationName: string;
  locationCategory?: string;
}

interface HomePlace extends Place {
  description: string;
  location: string;
  rating: number;
  visitors: string[];
  friendsWhoSaved: { name: string; avatar: string; }[];
  savedCount: number;
  stories?: HomeStory[];
  latitude?: number;
  longitude?: number;
}

const demoStories: HomeStory[] = [
  {
    id: 'story1',
    userId: 'user1',
    userName: 'Alice',
    userAvatar: 'https://i.pravatar.cc/48?img=1',
    isViewed: false,
    locationId: '1',
    locationName: 'Cozy Coffee Shop',
    locationCategory: 'cafe'
  },
  {
    id: 'story2',
    userId: 'user2',
    userName: 'Bob',
    userAvatar: 'https://i.pravatar.cc/48?img=2',
    isViewed: false,
    locationId: '2',
    locationName: 'The Art Museum',
    locationCategory: 'museum'
  },
  {
    id: 'story3',
    userId: 'user3',
    userName: 'Charlie',
    userAvatar: 'https://i.pravatar.cc/48?img=3',
    isViewed: false,
    locationId: '3',
    locationName: 'Greenwood Park',
    locationCategory: 'park'
  },
];

const demoPlaces: HomePlace[] = [
  {
    id: '1',
    name: 'Cozy Coffee Shop',
    description: 'A warm and inviting place to enjoy a cup of coffee and a pastry.',
    location: '123 Main St, Anytown',
    category: 'Cafe',
    image: 'https://images.unsplash.com/photo-1517436021523-54d496938ca1?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1974&q=80',
    likes: 42,
    rating: 4.5,
    visitors: ['user1', 'user2', 'user3'],
    friendsWhoSaved: [
      { name: 'Alice', avatar: 'https://i.pravatar.cc/48?img=1' },
      { name: 'Bob', avatar: 'https://i.pravatar.cc/48?img=2' }
    ],
    savedCount: 15,
    isNew: true,
    coordinates: { lat: 34.052235, lng: -118.243683 },
    stories: demoStories.slice(0, 2),
    latitude: 34.052235,
    longitude: -118.243683
  },
  {
    id: '2',
    name: 'The Art Museum',
    description: 'Explore a wide range of art from around the world.',
    location: '456 Elm St, Anytown',
    category: 'Museum',
    image: 'https://images.unsplash.com/photo-1544920504-3d9e5ee149aa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
    likes: 123,
    rating: 4.8,
    visitors: ['user4', 'user5'],
    friendsWhoSaved: [
      { name: 'Charlie', avatar: 'https://i.pravatar.cc/48?img=3' }
    ],
    savedCount: 42,
    isNew: false,
    coordinates: { lat: 34.052235, lng: -118.243683 },
    stories: demoStories.slice(1, 3),
    latitude: 34.052235,
    longitude: -118.243683
  },
  {
    id: '3',
    name: 'Greenwood Park',
    description: 'A beautiful park with walking trails and picnic areas.',
    location: '789 Oak St, Anytown',
    category: 'Park',
    image: 'https://images.unsplash.com/photo-1497252689836-99c94e695c1e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
    likes: 78,
    rating: 4.6,
    visitors: ['user6', 'user7', 'user8'],
    friendsWhoSaved: [
      { name: 'Alice', avatar: 'https://i.pravatar.cc/48?img=1' },
      { name: 'Bob', avatar: 'https://i.pravatar.cc/48?img=2' },
      { name: 'Charlie', avatar: 'https://i.pravatar.cc/48?img=3' }
    ],
    savedCount: 28,
    isNew: false,
    coordinates: { lat: 34.052235, lng: -118.243683 },
    latitude: 34.052235,
    longitude: -118.243683
  },
];

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [places, setPlaces] = useState<HomePlace[]>(demoPlaces);
  const [activeFilter, setActiveFilter] = useState<'following' | 'popular' | 'new'>('popular');
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [likedPlaces, setLikedPlaces] = useState<Set<string>>(new Set());
  const searchData = useSearch();
  const { trackUserAction, trackPlaceInteraction } = useAnalytics();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleFilterChange = (filter: 'following' | 'popular' | 'new') => {
    setActiveFilter(filter);
    trackUserAction('filter_change', { filter });
  };

  const handleLikeToggle = (placeId: string) => {
    const isCurrentlyLiked = likedPlaces.has(placeId);
    
    if (isCurrentlyLiked) {
      setLikedPlaces(prev => {
        const newSet = new Set(prev);
        newSet.delete(placeId);
        return newSet;
      });
      setPlaces(currentPlaces =>
        currentPlaces.map(place =>
          place.id === placeId ? { ...place, likes: place.likes - 1 } : place
        )
      );
    } else {
      setLikedPlaces(prev => new Set(prev).add(placeId));
      setPlaces(currentPlaces =>
        currentPlaces.map(place =>
          place.id === placeId ? { ...place, likes: place.likes + 1 } : place
        )
      );
    }
    
    trackPlaceInteraction(placeId, 'like');
  };

  const handleComment = (place: Place) => {
    console.log('Comment on:', place);
    trackPlaceInteraction(place.id, 'comment');
  };

  const handleShare = (place: Place) => {
    console.log('Share:', place);
    trackPlaceInteraction(place.id, 'share');
  };

  const handleCardClick = (place: Place) => {
    setSelectedPlace(place);
    setIsInteractionModalOpen(true);
  };

  const filteredPlaces = React.useMemo(() => {
    let filtered = places;

    if (searchData.searchQuery) {
      const query = searchData.searchQuery.toLowerCase();
      filtered = filtered.filter(
        place =>
          place.name.toLowerCase().includes(query) ||
          place.description.toLowerCase().includes(query) ||
          place.location.toLowerCase().includes(query)
      );
    }

    // Apply filter logic
    switch (activeFilter) {
      case 'following':
        // Filter places from followed users (demo logic)
        break;
      case 'popular':
        filtered = filtered.sort((a, b) => b.likes - a.likes);
        break;
      case 'new':
        filtered = filtered.filter(place => place.isNew);
        break;
    }

    return filtered;
  }, [places, searchData.searchQuery, activeFilter]);

  const convertToPlace = (homePlace: HomePlace): Place => {
    return {
      id: homePlace.id,
      name: homePlace.name,
      category: homePlace.category,
      likes: homePlace.likes,
      isNew: homePlace.isNew,
      coordinates: homePlace.coordinates,
      image: homePlace.image,
      friendsWhoSaved: homePlace.friendsWhoSaved,
      visitors: homePlace.visitors
    };
  };

  const newCount = places.filter(place => place.isNew).length;

  return (
    <div className="flex flex-col h-full bg-white">
      <Header 
        searchQuery={searchData.searchQuery}
        currentCity=""
        onSearchChange={searchData.setSearchQuery}
        onSearchKeyPress={() => {}}
        onNotificationsClick={() => {}}
        onMessagesClick={() => {}}
      />
      <StoriesSection 
        stories={demoStories}
        onCreateStory={() => {}}
        onStoryClick={() => {}}
      />
      <FilterButtons 
        activeFilter={activeFilter} 
        onFilterChange={handleFilterChange}
        newCount={newCount}
      />

      {/* Places Grid */}
      <div className="flex-1 px-4 pb-20 space-y-4">
        {filteredPlaces.map((place) => (
          <PlaceCard
            key={place.id}
            place={convertToPlace(place)}
            isLiked={likedPlaces.has(place.id)}
            onCardClick={handleCardClick}
            onLikeToggle={handleLikeToggle}
            onComment={handleComment}
            onShare={handleShare}
            cityName="Anytown"
          />
        ))}
      </div>

      {isInteractionModalOpen && selectedPlace && (
        <PlaceInteractionModal
          place={selectedPlace}
          mode="comments"
          isOpen={isInteractionModalOpen}
          onClose={() => setIsInteractionModalOpen(false)}
        />
      )}
    </div>
  );
};

export default HomePage;
