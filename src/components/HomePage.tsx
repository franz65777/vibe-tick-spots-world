
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

interface Story {
  id: string;
  user: {
    name: string;
    avatar: string;
  };
  image: string;
  title: string;
}

interface Place {
  id: string;
  name: string;
  description: string;
  location: string;
  category: string;
  image: string;
  likes: number;
  rating: number;
  visitors: string[];
  friendsWhoSaved: { name: string; avatar: string; }[];
  savedCount: number;
  stories?: Story[];
  latitude?: number;
  longitude?: number;
}

interface HomePlace {
  id: string;
  name: string;
  description: string;
  location: string;
  category: string;
  image: string;
  likes: number;
  rating: number;
  visitors: string[];
  friendsWhoSaved: { name: string; avatar: string; }[];
  savedCount: number;
  isNew: boolean;
  stories?: Story[];
  latitude?: number;
  longitude?: number;
}

const demoStories: Story[] = [
  {
    id: 'story1',
    user: { name: 'Alice', avatar: 'https://i.pravatar.cc/48?img=1' },
    image: 'https://images.unsplash.com/photo-1517840901100-8179e982acb7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1974&q=80',
    title: 'My amazing trip to the mountains'
  },
  {
    id: 'story2',
    user: { name: 'Bob', avatar: 'https://i.pravatar.cc/48?img=2' },
    image: 'https://images.unsplash.com/photo-1477959858617-67f85660d58e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2048&q=80',
    title: 'Exploring the city at night'
  },
  {
    id: 'story3',
    user: { name: 'Charlie', avatar: 'https://i.pravatar.cc/48?img=3' },
    image: 'https://images.unsplash.com/photo-1469474968028-56653f4e4262?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2074&q=80',
    title: 'Adventures in the jungle'
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

  const handleLike = (placeId: string) => {
    setPlaces(currentPlaces =>
      currentPlaces.map(place =>
        place.id === placeId ? { ...place, likes: place.likes + 1 } : place
      )
    );
    trackPlaceInteraction(placeId, 'like');
  };

  const handleSave = (placeId: string) => {
    setPlaces(currentPlaces =>
      currentPlaces.map(place =>
        place.id === placeId ? { ...place, savedCount: place.savedCount + 1 } : place
      )
    );
    trackPlaceInteraction(placeId, 'save');
  };

  const handleComment = (place: Place) => {
    console.log('Comment on:', place);
    trackPlaceInteraction(place.id, 'comment');
  };

  const handleShare = (place: Place) => {
    console.log('Share:', place);
    trackPlaceInteraction(place.id, 'share');
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
      description: homePlace.description,
      location: homePlace.location,
      category: homePlace.category,
      image: homePlace.image,
      likes: homePlace.likes,
      rating: homePlace.rating,
      visitors: homePlace.visitors,
      friendsWhoSaved: homePlace.friendsWhoSaved,
      savedCount: homePlace.savedCount,
      stories: homePlace.stories,
      latitude: homePlace.latitude,
      longitude: homePlace.longitude
    };
  };

  const handlePlaceInteraction = (place: HomePlace) => {
    setSelectedPlace(convertToPlace(place));
    setIsInteractionModalOpen(true);
  };

  const newCount = places.filter(place => place.isNew).length;

  return (
    <div className="flex flex-col h-full bg-white">
      <Header 
        searchQuery={searchData.searchQuery}
        currentCity=""
        onSearchChange={searchData.setSearchQuery}
        onSearchKeyPress={() => {}}
        onNotificationClick={() => {}}
        onMessagesClick={() => {}}
      />
      <StoriesSection stories={demoStories} />
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
            onLike={handleLike}
            onSave={handleSave}
            onComment={() => handleComment(convertToPlace(place))}
            onShare={() => handleShare(convertToPlace(place))}
            onClick={() => handlePlaceInteraction(place)}
          />
        ))}
      </div>

      {isInteractionModalOpen && selectedPlace && (
        <PlaceInteractionModal
          place={selectedPlace}
          isOpen={isInteractionModalOpen}
          onClose={() => setIsInteractionModalOpen(false)}
        />
      )}
    </div>
  );
};

export default HomePage;
