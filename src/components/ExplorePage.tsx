import { useState, useEffect } from 'react';
import { useSearch } from '@/hooks/useSearch';
import SearchHeader from './explore/SearchHeader';
import SearchSuggestions from './explore/SearchSuggestions';
import RecommendationsSection from './explore/RecommendationsSection';
import SearchResults from './explore/SearchResults';
import BottomNavigation from './BottomNavigation';

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

// Mock data for demonstration
const mockPlaces: Place[] = [
  {
    id: '1',
    name: 'Tartine Bakery',
    category: 'restaurant',
    likes: 342,
    friendsWhoSaved: [
      { name: 'Sarah', avatar: 'photo-1494790108755-2616b5a5c75b' },
      { name: 'Mike', avatar: 'photo-1507003211169-0a1dd7228f2d' }
    ],
    visitors: ['user1', 'user2', 'user3'],
    isNew: true,
    coordinates: { lat: 37.7849, lng: -122.4094 },
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop',
    addedBy: 'user1',
    addedDate: '2024-06-01',
    isFollowing: true,
    popularity: 95,
    distance: '0.2 km',
    totalSaves: 67
  },
  {
    id: '2',
    name: 'Mission Dolores Park',
    category: 'park',
    likes: 156,
    friendsWhoSaved: [
      { name: 'Emma', avatar: 'photo-1438761681033-6461ffad8d80' }
    ],
    visitors: ['user4', 'user5'],
    isNew: false,
    coordinates: { lat: 37.7594, lng: -122.4269 },
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop',
    addedBy: 'user2',
    addedDate: '2024-05-28',
    isFollowing: false,
    popularity: 88,
    distance: '0.8 km',
    totalSaves: 34
  }
];

const mockUsers: User[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    username: 'sarah_travels',
    avatar: 'photo-1494790108755-2616b5a5c75b',
    followers: 1234,
    following: 567,
    savedPlaces: 89,
    isFollowing: false
  },
  {
    id: '2',
    name: 'Mike Chen',
    username: 'mike_foodie',
    avatar: 'photo-1507003211169-0a1dd7228f2d',
    followers: 2341,
    following: 432,
    savedPlaces: 156,
    isFollowing: true
  }
];

const ExplorePage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'locations' | 'users'>('locations');
  const [sortBy, setSortBy] = useState<'proximity' | 'likes' | 'followers'>('proximity');
  const [isSearching, setIsSearching] = useState(false);
  const [likedPlaces, setLikedPlaces] = useState<Set<string>>(new Set());

  const {
    searchHistory,
    locationRecommendations,
    userRecommendations,
    saveSearch,
    getSearchSuggestions
  } = useSearch();

  // Filter and sort results
  const filteredLocations = mockPlaces.filter(place =>
    place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    place.category.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    switch (sortBy) {
      case 'proximity':
        // Convert distance strings to numbers for comparison
        const aDistance = parseFloat(a.distance?.replace(' km', '') || '0');
        const bDistance = parseFloat(b.distance?.replace(' km', '') || '0');
        return aDistance - bDistance;
      case 'likes':
        return b.likes - a.likes;
      default:
        return 0;
    }
  });

  const filteredUsers = mockUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    switch (sortBy) {
      case 'followers':
        return b.followers - a.followers;
      default:
        return 0;
    }
  });

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    
    // Simulate search delay
    setTimeout(() => {
      setIsSearching(false);
    }, 800);
    
    await saveSearch(query, searchMode);
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
    console.log('Sharing place:', place);
    // Implement share logic
  };

  const handleComment = (place: Place) => {
    console.log('Comment on place:', place);
    // Implement comment logic
  };

  const handleCardClick = (place: Place) => {
    console.log('Place clicked:', place);
    // Implement navigation to place detail
  };

  const handleUserClick = (user: User) => {
    console.log('User clicked:', user);
    // Implement navigation to user profile
  };

  const handleFollowUser = (userId: string) => {
    console.log('Follow user:', userId);
    // Implement follow logic
  };

  const handleLocationClick = (location: any) => {
    console.log('Location clicked:', location);
    // Implement location click logic
  };

  // Get suggestions based on current query
  const suggestions = getSearchSuggestions(searchQuery, searchMode);
  const searchHistoryStrings = searchHistory.map(item => item.query);

  return (
    <div className="flex flex-col h-screen bg-white">
      <SearchHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchMode={searchMode}
        setSearchMode={setSearchMode}
        sortBy={sortBy}
        setSortBy={setSortBy}
        onSearch={() => handleSearch(searchQuery)}
      />
      
      <div className="flex-1 overflow-y-auto pb-20">
        {!searchQuery ? (
          <>
            <SearchSuggestions
              suggestions={suggestions}
              searchHistory={searchHistoryStrings}
              onSuggestionClick={(suggestion) => {
                setSearchQuery(suggestion);
                handleSearch(suggestion);
              }}
            />
            <RecommendationsSection
              locationRecommendations={locationRecommendations}
              userRecommendations={userRecommendations}
              searchMode={searchMode}
              loading={false}
              onLocationClick={handleLocationClick}
              onUserClick={handleUserClick}
              onFollowUser={handleFollowUser}
              onLikeLocation={handleLikeToggle}
              onShareLocation={handleShare}
              onCommentLocation={handleComment}
              likedPlaces={likedPlaces}
            />
          </>
        ) : (
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

      <BottomNavigation />
    </div>
  );
};

export default ExplorePage;
