import { useState, useEffect } from 'react';
import Header from './home/Header';
import StoriesSection from './home/StoriesSection';
import LocationOfTheWeek from './home/LocationOfTheWeek';
import FilterButtons from './home/FilterButtons';
import PlaceCard from './home/PlaceCard';
import MapSection from './home/MapSection';
import ModalsManager from './home/ModalsManager';

interface Place {
  id: string;
  name: string;
  category: string;
  likes: number;
  friendsWhoSaved?: { name: string; avatar: string }[];
  visitors: string[];
  isNew: boolean;
  coordinates: { lat: number; lng: number };
  image?: string;
  addedBy?: string;
  addedDate?: string;
  isFollowing?: boolean;
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

const HomePage = () => {
  console.log('HomePage rendering...');
  
  const initialPlaces: Place[] = [
    {
      id: '1',
      name: 'Sunset Cafe',
      category: 'Restaurant',
      likes: 42,
      friendsWhoSaved: [
        { name: 'Alice', avatar: 'avatar-1.jpg' },
        { name: 'Bob', avatar: 'avatar-2.jpg' },
      ],
      visitors: ['Charlie', 'David'],
      isNew: true,
      coordinates: { lat: 37.7749, lng: -122.4194 },
      image: 'cafe-1.jpg',
      addedBy: 'Alice',
      addedDate: '2024-03-10',
      isFollowing: true,
      popularity: 0.8,
    },
    {
      id: '2',
      name: 'Mountain View Hotel',
      category: 'Hotel',
      likes: 120,
      friendsWhoSaved: [
        { name: 'Eve', avatar: 'avatar-3.jpg' },
        { name: 'Bob', avatar: 'avatar-2.jpg' },
      ],
      visitors: ['Alice', 'David', 'Charlie'],
      isNew: false,
      coordinates: { lat: 34.0522, lng: -118.2437 },
      image: 'hotel-1.jpg',
      addedBy: 'Bob',
      addedDate: '2024-03-05',
      isFollowing: false,
      popularity: 0.9,
    },
    {
      id: '3',
      name: 'City Art Gallery',
      category: 'Museum',
      likes: 78,
      friendsWhoSaved: [{ name: 'Charlie', avatar: 'avatar-4.jpg' }],
      visitors: ['Eve', 'Alice'],
      isNew: false,
      coordinates: { lat: 40.7128, lng: -74.006 },
      image: 'museum-1.jpg',
      addedBy: 'Charlie',
      addedDate: '2024-02-28',
      isFollowing: true,
      popularity: 0.7,
    },
    {
      id: '4',
      name: 'Lakeside Bar',
      category: 'Bar',
      likes: 95,
      friendsWhoSaved: [{ name: 'David', avatar: 'avatar-5.jpg' }],
      visitors: ['Bob', 'Eve'],
      isNew: true,
      coordinates: { lat: 51.5074, lng: 0.1278 },
      image: 'bar-1.jpg',
      addedBy: 'David',
      addedDate: '2024-02-20',
      isFollowing: false,
      popularity: 0.6,
    },
  ];

  const initialStories: Story[] = [
    {
      id: 'story1',
      userId: 'user1',
      userName: 'Alice',
      userAvatar: 'avatar-1.jpg',
      mediaUrl: 'https://images.unsplash.com/photo-1682685797497-f296491f8c69?w=400&h=800&fit=crop&auto=format&dpr=2',
      mediaType: 'image',
      locationId: 'location1',
      locationName: 'Sunset Cafe',
      locationAddress: '123 Main St, Anytown',
      timestamp: '2 hours ago',
      isViewed: false,
      bookingUrl: 'https://example.com/booking',
      locationCategory: 'Restaurant',
    },
    {
      id: 'story2',
      userId: 'user2',
      userName: 'Bob',
      userAvatar: 'avatar-2.jpg',
      mediaUrl: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=400&h=800&fit=crop&auto=format&dpr=2',
      mediaType: 'image',
      locationId: 'location2',
      locationName: 'Mountain View Hotel',
      locationAddress: '456 Elm St, Anytown',
      timestamp: '1 day ago',
      isViewed: false,
      locationCategory: 'Hotel',
    },
    {
      id: 'story3',
      userId: 'user3',
      userName: 'Charlie',
      userAvatar: 'avatar-4.jpg',
      mediaUrl: 'https://images.unsplash.com/photo-1541697497-6479bc410144?w=400&h=800&fit=crop&auto=format&dpr=2',
      mediaType: 'image',
      locationId: 'location3',
      locationName: 'City Art Gallery',
      locationAddress: '789 Oak St, Anytown',
      timestamp: '3 hours ago',
      isViewed: true,
      locationCategory: 'Museum',
    },
    {
      id: 'story4',
      userId: 'user4',
      userName: 'David',
      userAvatar: 'avatar-5.jpg',
      mediaUrl: 'https://images.unsplash.com/photo-1484820301354-639a0a862294?w=400&h=800&fit=crop&auto=format&dpr=2',
      mediaType: 'image',
      locationId: 'location4',
      locationName: 'Lakeside Bar',
      locationAddress: '101 Pine St, Anytown',
      timestamp: '5 hours ago',
      isViewed: true,
      locationCategory: 'Bar',
    },
    {
      id: 'story5',
      userId: 'user1',
      userName: 'Alice',
      userAvatar: 'avatar-1.jpg',
      mediaUrl: 'https://images.unsplash.com/photo-1541356665065-22676f35d225?w=400&h=800&fit=crop&auto=format&dpr=2',
      mediaType: 'image',
      locationId: 'location5',
      locationName: 'Another Cafe',
      locationAddress: '222 Maple St, Anytown',
      timestamp: '7 hours ago',
      isViewed: false,
      locationCategory: 'Restaurant',
    },
    {
      id: 'story6',
      userId: 'user2',
      userName: 'Bob',
      userAvatar: 'avatar-2.jpg',
      mediaUrl: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=400&h=800&fit=crop&auto=format&dpr=2',
      mediaType: 'image',
      locationId: 'location6',
      locationName: 'Seaside Hotel',
      locationAddress: '333 Cherry St, Anytown',
      timestamp: '9 hours ago',
      isViewed: false,
      locationCategory: 'Hotel',
    },
  ];

  const [searchQuery, setSearchQuery] = useState('');
  const [currentCity, setCurrentCity] = useState('San Francisco');
  const [activeFilter, setActiveFilter] = useState('All');
  const [places, setPlaces] = useState<Place[]>(initialPlaces);
  const [stories, setStories] = useState<Story[]>(initialStories);
  const [isCreateStoryModalOpen, setIsCreateStoryModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isMessagesModalOpen, setIsMessagesModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharePlace, setSharePlace] = useState<Place | null>(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [commentPlace, setCommentPlace] = useState<Place | null>(null);
  const [isLocationDetailOpen, setIsLocationDetailOpen] = useState(false);
  const [locationDetailPlace, setLocationDetailPlace] = useState<Place | null>(null);
  const [isStoriesViewerOpen, setIsStoriesViewerOpen] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [isSearchActive, setIsSearchActive] = useState(false);

  const mapCenter = { lat: 37.7749, lng: -122.4194 };

  const handleSearchChange = (value: string) => {
    console.log('Search query changed:', value);
    setSearchQuery(value);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      console.log('Search query submitted:', searchQuery);
    }
  };

  const handleCitySelect = (city: string) => {
    console.log('City selected:', city);
    setCurrentCity(city);
  };

  const handleLike = (placeId: string) => {
    console.log('Liked place:', placeId);
    setPlaces((prevPlaces) =>
      prevPlaces.map((place) =>
        place.id === placeId ? { ...place, likes: place.likes + 1 } : place
      )
    );
  };

  const handleSave = (placeId: string) => {
    console.log('Saved place:', placeId);
    // Implement save logic here
  };

  const handleShare = (place: Place) => {
    console.log('Share place:', place.name);
    setSharePlace(place);
    setIsShareModalOpen(true);
  };

  const handleShareSubmit = (friendIds: string[], place: Place) => {
    console.log('Shared place:', place.name, 'with friends:', friendIds);
    setIsShareModalOpen(false);
  };

  const handleComment = (place: Place) => {
    console.log('Comment on place:', place.name);
    setCommentPlace(place);
    setIsCommentModalOpen(true);
  };

  const handleCommentSubmit = (text: string, place: Place) => {
    console.log('Comment submitted:', text, 'for place:', place.name);
    setIsCommentModalOpen(false);
  };

  const handleLocationClick = (place: Place) => {
    console.log('Location clicked:', place.name);
    setLocationDetailPlace(place);
    setIsLocationDetailOpen(true);
  };

  const handleStoryClick = (index: number) => {
    console.log('Story clicked:', index);
    setCurrentStoryIndex(index);
    setIsStoriesViewerOpen(true);
  };

  const handleStoryCreated = () => {
    console.log('New story created');
    setIsCreateStoryModalOpen(false);
  };

  const handleStoryViewed = (storyId: string) => {
    console.log('Story viewed:', storyId);
    setStories(prevStories =>
      prevStories.map(story =>
        story.id === storyId ? { ...story, isViewed: true } : story
      )
    );
  };

  const filteredPlaces = places.filter((place) => {
    if (activeFilter === 'All') return true;
    return place.category === activeFilter;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
      {/* Header */}
      <Header
        searchQuery={searchQuery}
        currentCity={currentCity}
        onSearchChange={handleSearchChange}
        onSearchKeyPress={handleSearchKeyPress}
        onNotificationsClick={() => setIsNotificationsModalOpen(true)}
        onMessagesClick={() => setIsMessagesModalOpen(true)}
        onCitySelect={handleCitySelect}
        onSearchActiveChange={setIsSearchActive}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Stories Section - Hidden when search is active */}
        {!isSearchActive && (
          <div className="px-4 py-3">
            <StoriesSection
              stories={stories}
              onCreateStory={() => setIsCreateStoryModalOpen(true)}
              onStoryClick={handleStoryClick}
            />
          </div>
        )}

        {/* Location of the Week - Hidden when search is active */}
        {!isSearchActive && (
          <div className="px-4 mb-4">
            <LocationOfTheWeek />
          </div>
        )}

        {/* Filter Buttons - Hidden when search is active */}
        {!isSearchActive && (
          <div className="px-4 mb-4">
            <FilterButtons
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
            />
          </div>
        )}

        {/* Places Grid */}
        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            {filteredPlaces.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                onLike={handleLike}
                onSave={handleSave}
                onShare={handleShare}
                onComment={handleComment}
                onLocationClick={handleLocationClick}
              />
            ))}
          </div>
        </div>

        {/* Map Section */}
        <div className="px-4 pb-6">
          <MapSection
            places={filteredPlaces}
            center={mapCenter}
            onPlaceClick={handleLocationClick}
          />
        </div>
      </div>

      {/* Modals Manager */}
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
        onShare={handleShareSubmit}
        onCommentSubmit={handleCommentSubmit}
        onStoryViewed={handleStoryViewed}
      />
    </div>
  );
};

export default HomePage;
