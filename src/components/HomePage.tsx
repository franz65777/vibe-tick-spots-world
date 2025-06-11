
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

// Define consistent Place interface that matches PlaceCard expectations
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
  const [activeFilter, setActiveFilter] = useState<'following' | 'popular' | 'new'>('following');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [showLocationDetail, setShowLocationDetail] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPlaceInteraction, setShowPlaceInteraction] = useState(false);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [likedPlaces, setLikedPlaces] = useState<Set<string>>(new Set());

  // Sample places data that matches the PlaceCard interface
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
      totalSaves: 89
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
      totalSaves: 156
    }
  ];

  const topLocation = places[0]; // Get the top location for Location of the Week

  const stories = [
    {
      id: '1',
      userId: 'user1',
      userName: 'Sarah Wilson',
      userAvatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png',
      isViewed: false,
      mediaUrl: '/lovable-uploads/8a9fd2cf-e687-48ee-a40f-3dd4b19ba4ff.png',
      mediaType: 'image' as const,
      locationId: '1',
      locationName: 'Central Park',
      locationAddress: 'Manhattan, NY',
      timestamp: '2024-06-01T10:30:00Z'
    }
  ];

  const mapPins: MapPin[] = places.map(place => ({
    id: place.id,
    name: place.name,
    coordinates: place.coordinates,
    category: place.category,
    rating: place.rating,
    description: place.description,
    addedBy: place.addedBy
  }));

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
    const place = places.find(p => p.id === placeId);
    if (place) {
      console.log('Liked place:', place.name);
      toast.success(`Liked ${place.name}!`);
    }
  };

  const handleSharePlace = (place: Place) => {
    setSelectedPlace(place);
    setShowShareModal(true);
  };

  const handleCommentPlace = (place: Place) => {
    setSelectedPlace(place);
    setShowCommentModal(true);
  };

  const handleCardClick = () => {
    // Handle card click
    console.log('Card clicked');
  };

  const handlePinClick = (place: Place) => {
    setSelectedPlace(place);
    setShowLocationDetail(true);
  };

  const filteredPlaces = activeFilter === 'following' 
    ? places 
    : places.filter(place => place.category === activeFilter);

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

  const handleLocationClick = (place: Place) => {
    setSelectedPlace(place);
    setShowLocationDetail(true);
  };

  const handleStoryClick = (storyId: string) => {
    console.log('Story clicked:', storyId);
  };

  const handleStoryCreated = () => {
    console.log('Story created');
    setShowCreateStory(false);
    toast.success('Story created successfully!');
  };

  const handleStoryViewed = (storyId: string) => {
    console.log('Story viewed:', storyId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        onNotificationsClick={() => setShowNotifications(true)}
        onMessagesClick={() => setShowMessages(true)}
        searchQuery=""
        currentCity="San Francisco"
        onSearchChange={() => {}}
        onSearchKeyPress={() => {}}
      />
      
      <div className="pt-16 pb-20">
        <div className="px-4 py-4">
          <LocationOfTheWeek 
            topLocation={topLocation}
            onLocationClick={handleLocationClick}
          />
          <StoriesSection 
            onCreateStory={() => setShowCreateStory(true)}
            stories={stories}
            onStoryClick={handleStoryClick}
          />
          <FilterButtons activeFilter={activeFilter} onFilterChange={setActiveFilter} />
          
          <div className="space-y-4 mb-6">
            {filteredPlaces.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                isLiked={likedPlaces.has(place.id)}
                onCardClick={handleCardClick}
                onLikeToggle={() => handleLikeToggle(place.id)}
                onShare={() => handleSharePlace(place)}
                onComment={() => handleCommentPlace(place)}
                cityName="San Francisco"
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
        isCreateStoryModalOpen={showCreateStory}
        isNotificationsModalOpen={showNotifications}
        isMessagesModalOpen={showMessages}
        isShareModalOpen={showShareModal}
        isCommentModalOpen={showCommentModal}
        isLocationDetailOpen={showLocationDetail}
        isStoriesViewerOpen={false}
        sharePlace={selectedPlace}
        commentPlace={selectedPlace}
        locationDetailPlace={selectedPlace}
        stories={stories}
        currentStoryIndex={0}
        onCreateStoryModalClose={() => setShowCreateStory(false)}
        onNotificationsModalClose={() => setShowNotifications(false)}
        onMessagesModalClose={() => setShowMessages(false)}
        onShareModalClose={() => setShowShareModal(false)}
        onCommentModalClose={() => setShowCommentModal(false)}
        onLocationDetailClose={() => setShowLocationDetail(false)}
        onStoriesViewerClose={() => {}}
        onStoryCreated={handleStoryCreated}
        onShare={handleShareWithFriends}
        onCommentSubmit={handleAddComment}
        onStoryViewed={handleStoryViewed}
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
