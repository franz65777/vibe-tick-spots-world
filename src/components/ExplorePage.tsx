import { useState, useEffect, useRef } from 'react';
import { useSearch } from '@/hooks/useSearch';
import { useUserSearch } from '@/hooks/useUserSearch';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import SearchHeader from '@/components/explore/SearchHeader';
import SearchResults from '@/components/explore/SearchResults';
import RecommendationsSection from '@/components/explore/RecommendationsSection';
import ShareModal from '@/components/home/ShareModal';
import CommentModal from '@/components/home/CommentModal';
import { Place } from '@/types/place';

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
    distance: '0.3km',
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
    distance: '0.8km',
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
    distance: '1.2km',
    totalSaves: 42
  }
];

type SearchMode = 'locations' | 'users';
type SortBy = 'proximity' | 'likes' | 'followers';

const ExplorePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('locations');
  const [sortBy, setSortBy] = useState<SortBy>('proximity');
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredLocations, setFilteredLocations] = useState<Place[]>([]);
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

  const { users: searchedUsers, loading: userSearchLoading, searchUsers, getAllUsers } = useUserSearch();

  // Load all users when component mounts or when switching to users mode
  useEffect(() => {
    if (searchMode === 'users' && !searchQuery.trim()) {
      getAllUsers();
    }
  }, [searchMode, getAllUsers]);

  // Filter and sort locations based on search query and filters
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredLocations([]);
      return;
    }

    if (searchMode === 'users') {
      // Search users using the hook
      searchUsers(searchQuery);
      return;
    }

    setIsSearching(true);
    
    // Simulate API call delay for locations
    const timer = setTimeout(() => {
      let filtered = mockLocations.filter(place =>
        place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.category.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // Sort based on selected filter
      if (sortBy === 'proximity') {
        filtered.sort((a, b) => {
          const aDistance = typeof a.distance === 'string' ? parseFloat(a.distance) : (a.distance || 0);
          const bDistance = typeof b.distance === 'string' ? parseFloat(b.distance) : (b.distance || 0);
          return aDistance - bDistance;
        });
      } else if (sortBy === 'likes') {
        filtered.sort((a, b) => b.likes - a.likes);
      }

      setFilteredLocations(filtered);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchMode, sortBy, searchUsers]);

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
  };

  // Handle recommendation clicks
  const handleLocationRecommendationClick = (location: any) => {
    console.log('Location recommendation clicked:', location);
    const place: Place = {
      id: location.id,
      name: location.name,
      category: location.category,
      likes: location.likes,
      friendsWhoSaved: location.friendsWhoSaved,
      visitors: location.visitors,
      isNew: location.isNew,
      coordinates: location.coordinates,
      image: location.image,
      addedBy: location.addedBy,
      addedDate: location.addedDate,
      isFollowing: location.isFollowing,
      popularity: location.popularity,
      distance: location.distance,
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
      friendsWhoSaved: location.friendsWhoSaved,
      visitors: location.visitors,
      isNew: location.isNew,
      coordinates: location.coordinates,
      image: location.image,
      addedBy: location.addedBy,
      addedDate: location.addedDate,
      isFollowing: location.isFollowing,
      popularity: location.popularity,
      distance: location.distance,
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
      friendsWhoSaved: location.friendsWhoSaved,
      visitors: location.visitors,
      isNew: location.isNew,
      coordinates: location.coordinates,
      image: location.image,
      addedBy: location.addedBy,
      addedDate: location.addedDate,
      isFollowing: location.isFollowing,
      popularity: location.popularity,
      distance: location.distance,
      totalSaves: location.likes || 23
    };
    handleComment(place);
  };

  const handleUserRecommendationClick = (user: any) => {
    navigate(`/profile/${user.id}`);
  };

  const handleFollowUser = async (userId: string) => {
    if (!user) return;
    
    // Here you would implement the follow logic
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
            filteredUsers={searchedUsers}
            isSearching={searchMode === 'locations' ? isSearching : userSearchLoading}
            likedPlaces={likedPlaces}
            onCardClick={handleCardClick}
            onLikeToggle={handleLikeToggle}
            onShare={handleShare}
            onComment={handleComment}
            onUserClick={(user) => navigate(`/profile/${user.id}`)}
            onFollowUser={handleFollowUser}
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
