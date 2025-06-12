
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Header from './home/Header';
import CitySearch from './home/CitySearch';
import FilterButtons from './home/FilterButtons';
import StoriesSection from './home/StoriesSection';
import LocationOfTheWeek from './home/LocationOfTheWeek';
import PlaceCard from './home/PlaceCard';
import MapSection from './home/MapSection';
import ModalsManager from './home/ModalsManager';
import { Place } from '@/types/place';

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

const HomePage = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentCity, setCurrentCity] = useState('San Francisco');
  const [selectedFilter, setSelectedFilter] = useState<'following' | 'popular' | 'new'>('popular');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [stories, setStories] = useState<Story[]>([]);
  const [isCreateStoryModalOpen, setIsCreateStoryModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isMessagesModalOpen, setIsMessagesModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [isLocationDetailOpen, setIsLocationDetailOpen] = useState(false);
  const [isStoriesViewerOpen, setIsStoriesViewerOpen] = useState(false);
  const [sharePlace, setSharePlace] = useState<Place | null>(null);
  const [commentPlace, setCommentPlace] = useState<Place | null>(null);
  const [locationDetailPlace, setLocationDetailPlace] = useState<Place | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [likedPlaces, setLikedPlaces] = useState<Set<string>>(new Set());

  // Demo places data
  const [places, setPlaces] = useState<Place[]>([
    {
      id: '1',
      name: 'The Cozy Corner Café',
      category: 'cafe',
      likes: 24,
      friendsWhoSaved: [
        { name: 'Alice', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b9c4aa47?w=40&h=40&fit=crop&crop=face' },
        { name: 'Bob', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face' }
      ],
      visitors: ['user1', 'user2', 'user3'],
      isNew: true,
      coordinates: { lat: 37.7849, lng: -122.4094 },
      image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop',
      addedBy: 'Sarah Chen',
      addedDate: '2024-01-15',
      isFollowing: true
    },
    {
      id: '2',
      name: 'Sunset View Restaurant',
      category: 'restaurant',
      likes: 18,
      friendsWhoSaved: [
        { name: 'Charlie', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=40&h=40&fit=crop&crop=face' }
      ],
      visitors: ['user4', 'user5'],
      isNew: false,
      coordinates: { lat: 37.7849, lng: -122.4194 },
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
      addedBy: 'Mike Johnson',
      addedDate: '2024-01-10',
      isFollowing: false
    }
  ]);

  useEffect(() => {
    // Initialize demo stories
    const demoStories: Story[] = [
      {
        id: '1',
        userId: 'user1',
        userName: 'Sarah Chen',
        userAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b9c4aa47?w=40&h=40&fit=crop&crop=face',
        isViewed: false,
        mediaUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=600&fit=crop',
        mediaType: 'image',
        locationId: '1',
        locationName: 'The Cozy Corner Café',
        locationAddress: '123 Main St, Downtown',
        timestamp: new Date().toISOString(),
        bookingUrl: 'https://example.com/book',
        locationCategory: 'cafe'
      }
    ];
    setStories(demoStories);
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      console.log('Searching for:', searchQuery);
    }
  };

  const handleCityChange = (city: string) => {
    setCurrentCity(city);
  };

  const handleFilterChange = (filter: 'following' | 'popular' | 'new') => {
    setSelectedFilter(filter);
  };

  const handlePlaceSelect = (place: Place) => {
    setSelectedPlace(place);
  };

  const handleToggleMap = () => {
    setIsMapExpanded(!isMapExpanded);
  };

  const handleStoryClick = (storyIndex: number) => {
    setCurrentStoryIndex(storyIndex);
    setIsStoriesViewerOpen(true);
  };

  const handleCreateStoryClick = () => {
    setIsCreateStoryModalOpen(true);
  };

  const handleNotificationsClick = () => {
    setIsNotificationsModalOpen(true);
  };

  const handleMessagesClick = () => {
    setIsMessagesModalOpen(true);
  };

  const handleShareClick = (place: Place) => {
    setSharePlace(place);
    setIsShareModalOpen(true);
  };

  const handleCommentClick = (place: Place) => {
    setCommentPlace(place);
    setIsCommentModalOpen(true);
  };

  const handleLocationClick = (place: Place) => {
    setLocationDetailPlace(place);
    setIsLocationDetailOpen(true);
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

  const handleCardClick = (place: Place) => {
    handleLocationClick(place);
  };

  const handleStoryCreated = () => {
    console.log('Story created successfully');
  };

  const handleShare = (friendIds: string[], place: Place) => {
    console.log('Sharing place with friends:', { friendIds, place });
  };

  const handleCommentSubmit = (text: string, place: Place) => {
    console.log('Comment submitted:', { text, place });
  };

  const handleStoryViewed = (storyId: string) => {
    setStories(prev => prev.map(story => 
      story.id === storyId ? { ...story, isViewed: true } : story
    ));
  };

  const topLocation = places[0] || null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        searchQuery={searchQuery}
        currentCity={currentCity}
        onSearchChange={handleSearchChange}
        onSearchKeyPress={handleSearchKeyPress}
        onNotificationsClick={handleNotificationsClick}
        onMessagesClick={handleMessagesClick}
      />
      
      <div className="pt-16">
        <CitySearch
          currentCity={currentCity}
          onCityChange={handleCityChange}
        />
        
        <FilterButtons
          activeFilter={selectedFilter}
          onFilterChange={handleFilterChange}
          newCount={0}
        />
        
        <StoriesSection
          stories={stories}
          onStoryClick={handleStoryClick}
          onCreateStory={handleCreateStoryClick}
        />
        
        <LocationOfTheWeek
          topLocation={topLocation}
          onLocationClick={handleLocationClick}
        />
        
        <div className="px-4 pb-4">
          {places.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              isLiked={likedPlaces.has(place.id)}
              onCardClick={handleCardClick}
              onLikeToggle={handleLikeToggle}
              onShare={handleShareClick}
              onComment={handleCommentClick}
              cityName={currentCity}
            />
          ))}
        </div>
        
        <MapSection
          places={places}
          selectedPlace={selectedPlace}
          isExpanded={isMapExpanded}
          onToggleExpanded={handleToggleMap}
          onPlaceSelect={handlePlaceSelect}
        />
      </div>

      <ModalsManager
        isCreateStoryModalOpen={isCreateStoryModalOpen}
        isNotificationsModalOpen={isNotificationsModalOpen}
        isMessagesModalOpen={isMessagesModalOpen}
        isShareModalOpen={isShareModalOpen}
        isCommentModalOpen={isCommentModalOpen}
        isLocationDetailOpen={isLocationDetailOpen}
        isStoriesViewerOpen={isStoriesViewerOpen}
        sharePlace={sharePlace}
        commentPlace={commentPlace}
        locationDetailPlace={locationDetailPlace}
        stories={stories}
        currentStoryIndex={currentStoryIndex}
        onCreateStoryModalClose={() => setIsCreateStoryModalOpen(false)}
        onNotificationsModalClose={() => setIsNotificationsModalOpen(false)}
        onMessagesModalClose={() => setIsMessagesModalOpen(false)}
        onShareModalClose={() => setIsShareModalOpen(false)}
        onCommentModalClose={() => setIsCommentModalOpen(false)}
        onLocationDetailClose={() => setIsLocationDetailOpen(false)}
        onStoriesViewerClose={() => setIsStoriesViewerOpen(false)}
        onStoryCreated={handleStoryCreated}
        onShare={handleShare}
        onCommentSubmit={handleCommentSubmit}
        onStoryViewed={handleStoryViewed}
      />
    </div>
  );
};

export default HomePage;
