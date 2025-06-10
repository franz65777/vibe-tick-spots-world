
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Filter, MoreHorizontal, Heart, MapPin as MapPinIcon, MessageSquare, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Header from './home/Header';
import FilterButtons from './home/FilterButtons';
import LocationOfTheWeek from './home/LocationOfTheWeek';
import StoriesSection from './home/StoriesSection';
import PlaceCard from './home/PlaceCard';
import MapSection from './home/MapSection';
import ModalsManager from './home/ModalsManager';
import NotificationsModal from './NotificationsModal';
import MessagesModal from './MessagesModal';

// Define consistent Place interface
interface Place {
  id: string;
  name: string;
  category: string;
  likes: number;
  friendsWhoSaved: { name: string; avatar: string; }[];
  visitors: string[];
  isNew: boolean;
  coordinates: { lat: number; lng: number; };
  rating?: number;
  image: string;
  description?: string;
  addedBy: { name: string; avatar: string; isFollowing: boolean; };
  distance: string;
  totalSaves: number;
  addedDate?: string;
  popularity?: number;
}

interface MapPin {
  id: string;
  name: string;
  coordinates: { lat: number; lng: number; };
  category: string;
  rating?: number;
  description?: string;
  addedBy: { name: string; avatar: string; isFollowing: boolean; };
}

const HomePage = () => {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<'following' | 'popular' | 'new'>('popular');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [showLocationDetail, setShowLocationDetail] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPlaceInteraction, setShowPlaceInteraction] = useState(false);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentCity, setCurrentCity] = useState('San Francisco');
  const [likedPlaces, setLikedPlaces] = useState<Set<string>>(new Set());

  // Sample places data
  const places: Place[] = [
    {
      id: '1',
      name: 'Central Park',
      category: 'Parks',
      likes: 124,
      friendsWhoSaved: [
        { name: 'Sarah', avatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png' },
        { name: 'Mike', avatar: '/lovable-uploads/5bb15f7b-b3ba-4eae-88b1-7fa789eb67c4.png' }
      ],
      visitors: ['john_doe', 'sarah_wilson', 'mike_chen'],
      isNew: true,
      coordinates: { lat: 40.785091, lng: -73.968285 },
      rating: 4.8,
      image: '/lovable-uploads/8a9fd2cf-e687-48ee-a40f-3dd4b19ba4ff.png',
      description: 'A beautiful park in the heart of Manhattan',
      addedBy: { name: 'John Doe', avatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png', isFollowing: false },
      distance: '0.5 km',
      totalSaves: 89,
      addedDate: '2024-01-15',
      popularity: 95
    },
    {
      id: '2',
      name: 'Brooklyn Bridge',
      category: 'Landmarks',
      likes: 89,
      friendsWhoSaved: [
        { name: 'Alex', avatar: '/lovable-uploads/5df0be70-7240-4958-ba55-5921ab3785e9.png' }
      ],
      visitors: ['alex_brown', 'emma_davis'],
      isNew: false,
      coordinates: { lat: 40.706086, lng: -73.996864 },
      rating: 4.9,
      image: '/lovable-uploads/5bb15f7b-b3ba-4eae-88b1-7fa789eb67c4.png',
      description: 'Iconic bridge connecting Manhattan and Brooklyn',
      addedBy: { name: 'Emma Davis', avatar: '/lovable-uploads/5df0be70-7240-4958-ba55-5921ab3785e9.png', isFollowing: true },
      distance: '1.2 km',
      totalSaves: 156,
      addedDate: '2024-01-10',
      popularity: 88
    }
  ];

  const stories = [
    { id: '1', user: 'John', avatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png', isViewed: false },
    { id: '2', user: 'Sarah', avatar: '/lovable-uploads/5bb15f7b-b3ba-4eae-88b1-7fa789eb67c4.png', isViewed: true }
  ];

  const topLocation = places[0];

  const mapPins: MapPin[] = places.map(place => ({
    id: place.id,
    name: place.name,
    coordinates: place.coordinates,
    category: place.category,
    rating: place.rating,
    description: place.description,
    addedBy: place.addedBy
  }));

  const handleLikePlace = (placeId: string) => {
    const newLikedPlaces = new Set(likedPlaces);
    if (likedPlaces.has(placeId)) {
      newLikedPlaces.delete(placeId);
      toast.success('Removed from likes!');
    } else {
      newLikedPlaces.add(placeId);
      toast.success('Added to likes!');
    }
    setLikedPlaces(newLikedPlaces);
  };

  const handleSavePlace = (placeId: string) => {
    console.log('Saved place:', placeId);
    toast.success('Place saved to your collection!');
  };

  const handleSuggestPlace = (place: Place) => {
    setSelectedPlace(place);
    setShowShareModal(true);
  };

  const handleCommentPlace = (place: Place) => {
    setSelectedPlace(place);
    setShowCommentModal(true);
  };

  const handlePinClick = (pin: MapPin) => {
    const place = places.find(p => p.id === pin.id);
    if (place) {
      setSelectedPlace(place);
      setShowLocationDetail(true);
    }
  };

  const handlePlaceClick = (place: Place) => {
    setSelectedPlace(place);
    setShowLocationDetail(true);
  };

  const filteredPlaces = places.filter(place => {
    if (activeFilter === 'new') return place.isNew;
    if (activeFilter === 'following') return place.addedBy.isFollowing;
    return true; // popular shows all
  });

  const handleShareWithFriends = (friendIds: string[], place: Place) => {
    console.log('Sharing place with friends:', friendIds, place.name);
    toast.success(`Suggested ${place.name} to ${friendIds.length} friends!`);
    setShowShareModal(false);
  };

  const handleAddComment = (text: string, place: Place) => {
    console.log('Adding comment:', text, 'to place:', place.name);
    toast.success('Comment added!');
    setShowCommentModal(false);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      console.log('Search for:', searchQuery);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        searchQuery={searchQuery}
        currentCity={currentCity}
        onSearchChange={setSearchQuery}
        onSearchKeyPress={handleSearchKeyPress}
        onNotificationsClick={() => setShowNotifications(true)}
        onMessagesClick={() => setShowMessages(true)}
        onCitySelect={setCurrentCity}
      />
      
      <div className="pt-16 pb-20">
        <div className="px-4 py-4">
          <LocationOfTheWeek 
            topLocation={topLocation}
            onLocationClick={() => handlePlaceClick(topLocation)}
          />
          <StoriesSection 
            stories={stories}
            onCreateStory={() => setShowCreateStory(true)}
            onStoryClick={(storyId) => console.log('Story clicked:', storyId)}
          />
          <FilterButtons activeFilter={activeFilter} onFilterChange={setActiveFilter} />
          
          <div className="space-y-4 mb-6">
            {filteredPlaces.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                isLiked={likedPlaces.has(place.id)}
                onCardClick={() => handlePlaceClick(place)}
                onLikeToggle={() => handleLikePlace(place.id)}
                onShare={() => handleSuggestPlace(place)}
                onComment={() => handleCommentPlace(place)}
                cityName={currentCity}
              />
            ))}
          </div>

          <MapSection 
            pins={mapPins}
            onPinClick={handlePinClick}
          />
        </div>
      </div>

      <ModalsManager
        selectedPlace={selectedPlace}
        showLocationDetail={showLocationDetail}
        showSaveDialog={showSaveDialog}
        showCommentModal={showCommentModal}
        showShareModal={showShareModal}
        showPlaceInteraction={showPlaceInteraction}
        showCreateStory={showCreateStory}
        onCloseLocationDetail={() => setShowLocationDetail(false)}
        onCloseSaveDialog={() => setShowSaveDialog(false)}
        onCloseCommentModal={() => setShowCommentModal(false)}
        onCloseShareModal={() => setShowShareModal(false)}
        onClosePlaceInteraction={() => setShowPlaceInteraction(false)}
        onCloseCreateStory={() => setShowCreateStory(false)}
        onShareWithFriends={handleShareWithFriends}
        onAddComment={handleAddComment}
      />

      <NotificationsModal 
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      <MessagesModal 
        isOpen={showMessages}
        onClose={() => setShowMessages(false)}
      />
    </div>
  );
};

export default HomePage;
