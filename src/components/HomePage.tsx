import { useState } from 'react';
import { Heart, Bell, MessageCircle, Users, TrendingUp, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import MapSection from '@/components/home/MapSection';
import StoriesSection from '@/components/home/StoriesSection';
import PlaceCard from '@/components/home/PlaceCard';
import CreateStoryModal from '@/components/CreateStoryModal';
import NotificationsModal from '@/components/NotificationsModal';
import MessagesModal from '@/components/MessagesModal';
import StoriesViewer from '@/components/StoriesViewer';
import ShareModal from '@/components/home/ShareModal';
import CommentModal from '@/components/home/CommentModal';
import LocationOfTheWeek from '@/components/home/LocationOfTheWeek';

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

const mockPlaces: Place[] = [
  {
    id: '1',
    name: 'The Cozy Corner Café',
    category: 'cafe',
    likes: 24,
    friendsWhoSaved: [
      { name: 'Sarah', avatar: '1649972904349-6e44c42644a7' },
      { name: 'Mike', avatar: '1581091226825-a6a2a5aee158' }
    ],
    visitors: ['user1', 'user2'],
    isNew: false,
    coordinates: { lat: 37.7849, lng: -122.4094 },
    image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop',
    addedBy: 'user1',
    addedDate: '2024-05-25',
    isFollowing: true,
    popularity: 85
  },
  {
    id: '2',
    name: 'Sunset View Restaurant',
    category: 'restaurant',
    likes: 18,
    visitors: ['user3'],
    isNew: true,
    coordinates: { lat: 37.7849, lng: -122.4194 },
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
    addedBy: 'user2',
    addedDate: '2024-06-01',
    isFollowing: true,
    popularity: 92
  },
  {
    id: '3',
    name: 'Grand Plaza Hotel',
    category: 'hotel',
    likes: 45,
    friendsWhoSaved: [
      { name: 'Emma', avatar: '1581092795360-fd1ca04f0952' }
    ],
    visitors: ['user4', 'user5'],
    isNew: false,
    coordinates: { lat: 37.7749, lng: -122.4094 },
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop',
    addedBy: 'user5',
    addedDate: '2024-05-15',
    isFollowing: false,
    popularity: 96
  },
  {
    id: '4',
    name: 'Neon Nights Bar',
    category: 'bar',
    likes: 32,
    visitors: ['user6'],
    isNew: true,
    coordinates: { lat: 37.7649, lng: -122.4194 },
    image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=300&fit=crop',
    addedBy: 'user3',
    addedDate: '2024-05-30',
    isFollowing: true,
    popularity: 78
  },
  {
    id: '5',
    name: 'Ocean Breeze Restaurant',
    category: 'restaurant',
    likes: 28,
    friendsWhoSaved: [
      { name: 'Alex', avatar: '1535268647677-300dbf3d78d1' },
      { name: 'Jordan', avatar: '1649972904349-6e44c42644a7' },
      { name: 'Casey', avatar: '1581091226825-a6a2a5aee158' }
    ],
    visitors: ['user7', 'user8'],
    isNew: false,
    coordinates: { lat: 37.7549, lng: -122.4294 },
    image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=300&fit=crop',
    addedBy: 'user6',
    addedDate: '2024-05-10',
    isFollowing: false,
    popularity: 88
  },
  {
    id: '6',
    name: 'Artisan Coffee House',
    category: 'cafe',
    likes: 22,
    visitors: ['user9'],
    isNew: false,
    coordinates: { lat: 37.7949, lng: -122.4294 },
    image: 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=400&h=300&fit=crop',
    addedBy: 'user4',
    addedDate: '2024-05-20',
    isFollowing: true,
    popularity: 71
  }
];

const mockStories: Story[] = [
  {
    id: '1',
    userId: 'user1',
    userName: 'Sarah',
    userAvatar: '1649972904349-6e44c42644a7',
    isViewed: false,
    mediaUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=600&fit=crop',
    mediaType: 'image',
    locationId: '1',
    locationName: 'The Cozy Corner Café',
    locationAddress: '123 Main St, Downtown',
    timestamp: '2 hours ago',
    bookingUrl: 'https://www.opentable.com/booking',
    locationCategory: 'restaurant'
  },
  {
    id: '4',
    userId: 'user1',
    userName: 'Sarah',
    userAvatar: '1649972904349-6e44c42644a7',
    isViewed: false,
    mediaUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=600&fit=crop',
    mediaType: 'image',
    locationId: '4',
    locationName: 'Neon Nights Bar',
    locationAddress: '789 Night St, Downtown',
    timestamp: '1 hour ago',
    bookingUrl: 'https://www.opentable.com/booking',
    locationCategory: 'bar'
  },
  {
    id: '5',
    userId: 'user1',
    userName: 'Sarah',
    userAvatar: '1649972904349-6e44c42644a7',
    isViewed: false,
    mediaUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=600&fit=crop',
    mediaType: 'image',
    locationId: '3',
    locationName: 'Grand Plaza Hotel',
    locationAddress: '456 Park Ave, Midtown',
    timestamp: '30 minutes ago',
    bookingUrl: 'https://www.booking.com/hotel',
    locationCategory: 'hotel'
  },
  {
    id: '6',
    userId: 'user1',
    userName: 'Sarah',
    userAvatar: '1649972904349-6e44c42644a7',
    isViewed: false,
    mediaUrl: 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=400&h=600&fit=crop',
    mediaType: 'image',
    locationId: '6',
    locationName: 'Artisan Coffee House',
    locationAddress: '789 Coffee St, Downtown',
    timestamp: '15 minutes ago',
    bookingUrl: 'https://www.opentable.com/booking',
    locationCategory: 'cafe'
  },
  {
    id: '2',
    userId: 'user2',
    userName: 'Mike',
    userAvatar: '1581091226825-a6a2a5aee158',
    isViewed: true,
    mediaUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=600&fit=crop',
    mediaType: 'image',
    locationId: '3',
    locationName: 'Grand Plaza Hotel',
    locationAddress: '456 Park Ave, Midtown',
    timestamp: '4 hours ago',
    bookingUrl: 'https://www.booking.com/hotel',
    locationCategory: 'hotel'
  },
  {
    id: '7',
    userId: 'user2',
    userName: 'Mike',
    userAvatar: '1581091226825-a6a2a5aee158',
    isViewed: false,
    mediaUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=600&fit=crop',
    mediaType: 'image',
    locationId: '4',
    locationName: 'Neon Nights Bar',
    locationAddress: '789 Night St, Downtown',
    timestamp: '3 hours ago',
    bookingUrl: 'https://www.opentable.com/booking',
    locationCategory: 'bar'
  },
  {
    id: '3',
    userId: 'user3',
    userName: 'Emma',
    userAvatar: '1581092795360-fd1ca04f0952',
    isViewed: false,
    mediaUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=600&fit=crop',
    mediaType: 'image',
    locationId: '5',
    locationName: 'Ocean Breeze Restaurant',
    locationAddress: '789 Coastal Rd, Seafront',
    timestamp: '6 hours ago',
    bookingUrl: 'https://www.opentable.com/r/ocean-breeze',
    locationCategory: 'restaurant'
  }
];

const HomePage = () => {
  console.log('HomePage rendering...');
  
  const [isCreateStoryModalOpen, setIsCreateStoryModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isMessagesModalOpen, setIsMessagesModalOpen] = useState(false);
  const [isStoriesViewerOpen, setIsStoriesViewerOpen] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [stories, setStories] = useState(mockStories);
  const [activeFilter, setActiveFilter] = useState<'following' | 'popular' | 'new'>('following');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [likedPlaces, setLikedPlaces] = useState<Set<string>>(new Set());
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [sharePlace, setSharePlace] = useState<Place | null>(null);
  const [commentPlace, setCommentPlace] = useState<Place | null>(null);

  // Get the most popular location based on total engagement (likes + visitors)
  const getLocationOfTheWeek = () => {
    return mockPlaces.reduce((topPlace, currentPlace) => {
      const currentEngagement = currentPlace.likes + currentPlace.visitors.length + (currentPlace.friendsWhoSaved?.length || 0);
      const topEngagement = topPlace.likes + topPlace.visitors.length + (topPlace.friendsWhoSaved?.length || 0);
      return currentEngagement > topEngagement ? currentPlace : topPlace;
    });
  };

  const getFilteredPlaces = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    switch (activeFilter) {
      case 'following':
        return mockPlaces.filter(place => place.isFollowing);
      case 'popular':
        return mockPlaces.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      case 'new':
        return mockPlaces.filter(place => {
          const addedDate = new Date(place.addedDate || '');
          return place.isFollowing && addedDate >= oneWeekAgo;
        });
      default:
        return mockPlaces;
    }
  };

  const handleCreateStory = () => {
    console.log('Create story clicked');
    setIsCreateStoryModalOpen(true);
  };

  const handleStoryCreated = () => {
    console.log('Story created successfully');
    // TODO: Refresh stories list
  };

  const handleStoryClick = (index: number) => {
    console.log('Story clicked:', index);
    setCurrentStoryIndex(index);
    setIsStoriesViewerOpen(true);
  };

  const handleStoryViewed = (storyId: string) => {
    setStories(prev => prev.map(story => 
      story.id === storyId ? { ...story, isViewed: true } : story
    ));
  };

  const handlePinClick = (place: Place) => {
    console.log('Map pin clicked:', place.name);
    setSelectedPlace(place);
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
    setSharePlace(place);
    setIsShareModalOpen(true);
  };

  const handleComment = (place: Place) => {
    setCommentPlace(place);
    setIsCommentModalOpen(true);
  };

  const handleShareSubmit = (friendIds: string[], place: Place) => {
    console.log('Sharing place:', place.name, 'with friends:', friendIds);
    // TODO: Implement actual sharing logic
  };

  const handleCommentSubmit = (text: string, place: Place) => {
    console.log('Adding comment:', text, 'to place:', place.name);
    // TODO: Implement actual comment submission logic
  };

  const handleCardClick = (place: Place) => {
    console.log('Place card clicked:', place.name);
    // TODO: Navigate to place detail view
  };

  const filteredPlaces = getFilteredPlaces();
  const locationOfTheWeek = getLocationOfTheWeek();

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-blue-50/30 via-white to-purple-50/20">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-lg px-6 py-8 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Discover
            </h1>
            <p className="text-gray-500 text-sm mt-1">Find amazing places around you</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsNotificationsModalOpen(true)}
              className="relative w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center hover:scale-105 transition-all duration-200 shadow-lg shadow-blue-500/25"
            >
              <Bell className="w-5 h-5 text-white" />
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full flex items-center justify-center font-medium shadow-lg">
                3
              </div>
            </button>
            <button
              onClick={() => setIsMessagesModalOpen(true)}
              className="relative w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center hover:scale-105 transition-all duration-200 shadow-lg shadow-purple-500/25"
            >
              <MessageCircle className="w-5 h-5 text-white" />
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full flex items-center justify-center font-medium shadow-lg">
                2
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Stories Section */}
      <div className="bg-white/60 backdrop-blur-sm px-6 py-4">
        <div className="overflow-x-auto">
          <StoriesSection 
            stories={stories}
            onCreateStory={handleCreateStory}
            onStoryClick={handleStoryClick}
          />
        </div>
      </div>

      {/* Location of the Week - Compact */}
      <LocationOfTheWeek 
        topLocation={locationOfTheWeek}
        onLocationClick={handleCardClick}
      />

      {/* Filter Buttons */}
      <div className="bg-white/60 backdrop-blur-sm px-6 py-3">
        <div className="flex gap-3">
          <button
            onClick={() => setActiveFilter('following')}
            className={cn(
              "flex items-center gap-3 px-6 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 shadow-lg",
              activeFilter === 'following'
                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue-500/30 scale-105"
                : "bg-white/90 text-gray-600 hover:bg-white hover:shadow-xl hover:scale-105"
            )}
          >
            <Users className="w-5 h-5" />
            Following
          </button>
          <button
            onClick={() => setActiveFilter('popular')}
            className={cn(
              "flex items-center gap-3 px-6 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 shadow-lg",
              activeFilter === 'popular'
                ? "bg-gradient-to-r from-pink-500 to-red-500 text-white shadow-pink-500/30 scale-105"
                : "bg-white/90 text-gray-600 hover:bg-white hover:shadow-xl hover:scale-105"
            )}
          >
            <Heart className="w-5 h-5" />
            Popular
          </button>
          <button
            onClick={() => setActiveFilter('new')}
            className={cn(
              "flex items-center gap-3 px-6 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 shadow-lg relative",
              activeFilter === 'new'
                ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-purple-500/30 scale-105"
                : "bg-white/90 text-gray-600 hover:bg-white hover:shadow-xl hover:scale-105"
            )}
          >
            <Sparkles className="w-5 h-5" />
            New
            {getFilteredPlaces().length > 0 && activeFilter !== 'new' && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-orange-400 to-red-500 rounded-full animate-pulse"></div>
            )}
          </button>
        </div>
      </div>

      {/* Map Section */}
      <div className="flex-1 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-white/20 via-transparent to-transparent pointer-events-none z-10"></div>
        <MapSection places={filteredPlaces} onPinClick={handlePinClick} />
      </div>

      {/* Selected Place Card */}
      {selectedPlace && (
        <div className="bg-white/95 backdrop-blur-lg p-6 mx-4 mb-4 rounded-3xl shadow-2xl shadow-black/10 border border-white/20">
          <PlaceCard
            place={selectedPlace}
            isLiked={likedPlaces.has(selectedPlace.id)}
            onCardClick={handleCardClick}
            onLikeToggle={handleLikeToggle}
            onShare={handleShare}
            onComment={handleComment}
          />
        </div>
      )}

      {/* Modals */}
      <CreateStoryModal
        isOpen={isCreateStoryModalOpen}
        onClose={() => setIsCreateStoryModalOpen(false)}
        onStoryCreated={handleStoryCreated}
      />

      <NotificationsModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
      />

      <MessagesModal
        isOpen={isMessagesModalOpen}
        onClose={() => setIsMessagesModalOpen(false)}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        place={sharePlace}
        onShare={handleShareSubmit}
      />

      <CommentModal
        isOpen={isCommentModalOpen}
        onClose={() => setIsCommentModalOpen(false)}
        place={commentPlace}
        onCommentSubmit={handleCommentSubmit}
      />

      {/* Stories Viewer */}
      {isStoriesViewerOpen && (
        <StoriesViewer
          stories={stories}
          initialStoryIndex={currentStoryIndex}
          onClose={() => setIsStoriesViewerOpen(false)}
          onStoryViewed={handleStoryViewed}
        />
      )}
    </div>
  );
};

export default HomePage;
