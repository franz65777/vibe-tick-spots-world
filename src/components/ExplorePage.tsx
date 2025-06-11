import { useState, useEffect, useRef } from 'react';
import { useSearch } from '@/hooks/useSearch';
import SearchHeader from '@/components/explore/SearchHeader';
import SearchResults from '@/components/explore/SearchResults';
import RecommendationsSection from '@/components/explore/RecommendationsSection';
import ShareModal from '@/components/home/ShareModal';
import CommentModal from '@/components/home/CommentModal';

// Standardized Place interface to match PlaceCard expectations
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
  addedBy: { name: string; avatar: string; isFollowing: boolean };
  addedDate?: string;
  isFollowing?: boolean;
  popularity?: number;
  distance: string;
  totalSaves: number;
}

interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
  followers: number;
  following: number;
  savedPlaces: number;
  isFollowing: boolean;
}

// Mock data for locations with correct types
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
    addedBy: { name: 'John Doe', avatar: 'photo-1472099645785-5658abf4ff4e', isFollowing: true },
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
    addedBy: { name: 'Sarah Wilson', avatar: 'photo-1494790108755-2616b5a5c75b', isFollowing: false },
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
    addedBy: { name: 'Mike Chen', avatar: 'photo-1507003211169-0a1dd7228f2d', isFollowing: true },
    addedDate: '2024-05-15',
    isFollowing: true,
    popularity: 94,
    distance: '1.2 km',
    totalSaves: 42
  }
];

// Mock data for users
const mockUsers: User[] = [
  {
    id: 'user1',
    name: 'Sarah Johnson',
    username: '@sarahj',
    avatar: 'photo-1494790108755-2616b5a5c75b',
    followers: 1250,
    following: 456,
    savedPlaces: 89,
    isFollowing: false
  },
  {
    id: 'user2',
    name: 'Mike Chen',
    username: '@mikec',
    avatar: 'photo-1507003211169-0a1dd7228f2d',
    followers: 890,
    following: 234,
    savedPlaces: 156,
    isFollowing: true
  }
];

type SearchMode = 'locations' | 'users';
type SortBy = 'proximity' | 'likes' | 'followers';

const ExplorePage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('locations');
  const [sortBy, setSortBy] = useState<SortBy>('proximity');
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredLocations, setFilteredLocations] = useState<Place[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [likedPlaces, setLikedPlaces] = useState<Set<string>>(new Set());
  
  // Modals
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  
  const { 
    searchHistory, 
    locationRecommendations, 
    userRecommendations, 
    loading, 
    saveSearch, 
    getSearchSuggestions 
  } = useSearch();

  // Filter and sort locations based on search query and filters
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredLocations([]);
      setFilteredUsers([]);
      return;
    }

    setIsSearching(true);
    
    // Simulate API call delay
    const timer = setTimeout(() => {
      if (searchMode === 'locations') {
        let filtered = mockLocations.filter(place =>
          place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          place.category.toLowerCase().includes(searchQuery.toLowerCase())
        );

        // Sort based on selected filter
        if (sortBy === 'proximity') {
          filtered.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
        } else if (sortBy === 'likes') {
          filtered.sort((a, b) => b.likes - a.likes);
        } else if (sortBy === 'followers') {
          filtered.sort((a, b) => (b.friendsWhoSaved?.length || 0) - (a.friendsWhoSaved?.length || 0));
        }

        setFilteredLocations(filtered);
      } else {
        let filtered = mockUsers.filter(user =>
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.username.toLowerCase().includes(searchQuery.toLowerCase())
        );

        setFilteredUsers(filtered);
      }
      
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchMode, sortBy]);

  // Handle search with history saving
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    // Save to search history
    await saveSearch(searchQuery, searchMode);
    setShowSuggestions(false);
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    // Trigger search automatically
    setTimeout(() => {
      saveSearch(suggestion, searchMode);
    }, 100);
  };

  // Handle place interactions
  const handleCardClick = (place: Place) => {
    setSelectedPlace(place);
    console.log('Place clicked:', place);
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

  // Handle recommendation clicks
  const handleLocationRecommendationClick = (location: any) => {
    console.log('Location recommendation clicked:', location);
    const place: Place = {
      id: location.id,
      name: location.name,
      category: location.category,
      likes: location.likes,
      friendsWhoSaved: location.friendsWhoSaved || [],
      visitors: location.visitors || [],
      isNew: location.isNew,
      coordinates: location.coordinates,
      image: location.image || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
      addedBy: location.addedBy || { name: 'Explorer', avatar: 'photo-1472099645785-5658abf4ff4e', isFollowing: false },
      addedDate: location.addedDate,
      isFollowing: location.isFollowing,
      popularity: location.popularity,
      distance: typeof location.distance === 'number' ? `${location.distance} km` : location.distance || '0 km',
      totalSaves: location.likes || 23
    };
    handleCardClick(place);
  };

  const handleLocationRecommendationShare = (location: any) => {
    const place: Place = {
      id: location.id,
      name: location.name,
      category: location.category,
      likes: location.likes,
      friendsWhoSaved: location.friendsWhoSaved || [],
      visitors: location.visitors || [],
      isNew: location.isNew,
      coordinates: location.coordinates,
      image: location.image || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
      addedBy: location.addedBy || { name: 'Explorer', avatar: 'photo-1472099645785-5658abf4ff4e', isFollowing: false },
      addedDate: location.addedDate,
      isFollowing: location.isFollowing,
      popularity: location.popularity,
      distance: typeof location.distance === 'number' ? `${location.distance} km` : location.distance || '0 km',
      totalSaves: location.likes || 23
    };
    handleShare(place);
  };

  const handleLocationRecommendationComment = (location: any) => {
    const place: Place = {
      id: location.id,
      name: location.name,
      category: location.category,
      likes: location.likes,
      friendsWhoSaved: location.friendsWhoSaved || [],
      visitors: location.visitors || [],
      isNew: location.isNew,
      coordinates: location.coordinates,
      image: location.image || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
      addedBy: location.addedBy || { name: 'Explorer', avatar: 'photo-1472099645785-5658abf4ff4e', isFollowing: false },
      addedDate: location.addedDate,
      isFollowing: location.isFollowing,
      popularity: location.popularity,
      distance: typeof location.distance === 'number' ? `${location.distance} km` : location.distance || '0 km',
      totalSaves: location.likes || 23
    };
    handleComment(place);
  };

  const handleUserRecommendationClick = (user: any) => {
    console.log('User recommendation clicked:', user);
  };

  const handleFollowUser = (userId: string) => {
    console.log('Follow user:', userId);
  };

  // Get current search suggestions
  const currentSuggestions = getSearchSuggestions(searchQuery, searchMode);
  const recentSearches = searchHistory
    .filter(item => item.search_type === searchMode)
    .map(item => item.search_query)
    .slice(0, 3);

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-blue-50/30 via-white to-purple-50/20 pt-16">
      {/* Header with Search */}
      <SearchHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchMode={searchMode}
        setSearchMode={setSearchMode}
        sortBy={sortBy}
        setSortBy={setSortBy}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        showSuggestions={showSuggestions}
        setShowSuggestions={setShowSuggestions}
        onSearch={handleSearch}
        suggestions={currentSuggestions}
        recentSearches={recentSearches}
        onSuggestionClick={handleSuggestionClick}
      />

      {/* Results */}
      <div className="flex-1 overflow-y-auto pb-20">
        {!searchQuery.trim() ? (
          // Recommendations when not searching
          <RecommendationsSection
            searchMode={searchMode}
            loading={loading}
            locationRecommendations={locationRecommendations}
            userRecommendations={userRecommendations}
            onLocationClick={handleLocationRecommendationClick}
            onUserClick={handleUserRecommendationClick}
            onFollowUser={handleFollowUser}
            onLocationShare={handleLocationRecommendationShare}
            onLocationComment={handleLocationRecommendationComment}
            onLocationLike={handleLikeToggle}
            likedPlaces={likedPlaces}
          />
        ) : (
          // Search results
          <SearchResults
            searchMode={searchMode}
            sortBy={sortBy}
            filteredLocations={filteredLocations}
            filteredUsers={filteredUsers}
            isSearching={isSearching}
            likedPlaces={likedPlaces}
            onCardClick={handleCardClick}
            onLikeToggle={handleLikeToggle}
            onShare={handleShare}
            onComment={handleComment}
          />
        )}
      </div>

      {/* Modals */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        item={selectedPlace}
        itemType="place"
        onShare={handleShareModalShare}
      />

      <CommentModal
        isOpen={commentModalOpen}
        onClose={() => setCommentModalOpen(false)}
        place={selectedPlace}
        onCommentSubmit={(comment) => console.log('Comment added:', comment)}
      />
    </div>
  );
};

export default ExplorePage;
