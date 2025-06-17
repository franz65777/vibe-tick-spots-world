import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserSearch } from '@/hooks/useUserSearch';
import { searchService, LocationRecommendation, UserRecommendation } from '@/services/searchService';
import SearchHeader from './explore/SearchHeader';
import SearchFilters from './explore/SearchFilters';
import SearchResults from './explore/SearchResults';
import SearchSuggestions from './explore/SearchSuggestions';
import RecommendationsSection from './explore/RecommendationsSection';
import LocationDetailSheet from './LocationDetailSheet';
import ShareModal from './home/ShareModal';
import CommentModal from './home/CommentModal';
import MessagesModal from './MessagesModal';
import { Place } from '@/types/place';

const ExplorePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { users: searchUsers, loading: searchLoading, searchUsers: performUserSearch } = useUserSearch();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'locations' | 'users'>('locations');
  const [sortBy, setSortBy] = useState<'proximity' | 'likes' | 'followers'>('proximity');
  const [isSearching, setIsSearching] = useState(false);
  const [filteredLocations, setFilteredLocations] = useState<Place[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [locationRecommendations, setLocationRecommendations] = useState<LocationRecommendation[]>([]);
  const [userRecommendations, setUserRecommendations] = useState<UserRecommendation[]>([]);
  const [likedPlaces, setLikedPlaces] = useState<Set<string>>(new Set());
  const [selectedLocation, setSelectedLocation] = useState<Place | null>(null);
  const [shareLocation, setShareLocation] = useState<Place | null>(null);
  const [commentLocation, setCommentLocation] = useState<Place | null>(null);
  const [isMessagesModalOpen, setIsMessagesModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadRecommendations();
    }
  }, [user]);

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      handleSearch();
    } else {
      setFilteredLocations([]);
      setFilteredUsers([]);
    }
  }, [searchQuery, searchMode]);

  const loadRecommendations = async () => {
    setRecommendationsLoading(true);
    try {
      if (user) {
        const locationRecs = await searchService.getLocationRecommendations(user.id);
        const userRecs = await searchService.getUserRecommendations(user.id);
        
        setLocationRecommendations(locationRecs);
        setUserRecommendations(userRecs);
      }
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setRecommendationsLoading(false);
    }
  };

  const handleSearch = async () => {
    setIsSearching(true);
    
    try {
      if (searchMode === 'locations') {
        // Mock location search for now - convert to Place format
        const mockLocations = [
          {
            id: '1',
            name: 'Coffee Shop Milano',
            category: 'cafe',
            likes: 120,
            visitors: ['user1', 'user2'],
            isNew: false,
            coordinates: { lat: 45.4642, lng: 9.1900 },
            image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop'
          },
          {
            id: '2',
            name: 'Trattoria Bella Napoli',
            category: 'restaurant',
            likes: 210,
            visitors: ['user3', 'user4'],
            isNew: false,
            coordinates: { lat: 40.8518, lng: 14.2681 },
            image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop'
          }
        ];
        
        setFilteredLocations(mockLocations.filter(loc => 
          loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          loc.category.toLowerCase().includes(searchQuery.toLowerCase())
        ));
        setFilteredUsers([]);
      } else {
        // Search users
        await performUserSearch(searchQuery);
        setFilteredLocations([]);
      }
      
      // Save search to history
      if (user) {
        await searchService.saveSearchHistory(user.id, searchQuery, searchMode);
      }
    } catch (error) {
      console.error('Error during search:', error);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (searchMode === 'users') {
      setFilteredUsers(searchUsers);
    }
  }, [searchUsers, searchMode]);

  const handleCardClick = (place: Place) => {
    setSelectedLocation(place);
  };

  const handleLocationClick = (location: LocationRecommendation) => {
    const placeData: Place = {
      id: location.id,
      name: location.name,
      category: location.category,
      likes: location.likes,
      visitors: [],
      isNew: false,
      coordinates: location.coordinates,
      image: location.image
    };
    setSelectedLocation(placeData);
  };

  const handleLikeToggle = (placeId: string) => {
    setLikedPlaces(prev => {
      const newSet = new Set(prev);
      if (newSet.has(placeId)) {
        newSet.delete(placeId);
      } else {
        newSet.add(placeId);
      }
      return newSet;
    });
  };

  const handleLocationLike = (locationId: string) => {
    handleLikeToggle(locationId);
  };

  const handleShare = (place: Place) => {
    setShareLocation(place);
  };

  const handleLocationShare = (location: LocationRecommendation) => {
    const placeData: Place = {
      id: location.id,
      name: location.name,
      category: location.category,
      likes: location.likes,
      visitors: [],
      isNew: false,
      coordinates: location.coordinates,
      image: location.image
    };
    setShareLocation(placeData);
  };

  const handleComment = (place: Place) => {
    setCommentLocation(place);
  };

  const handleLocationComment = (location: LocationRecommendation) => {
    const placeData: Place = {
      id: location.id,
      name: location.name,
      category: location.category,
      likes: location.likes,
      visitors: [],
      isNew: false,
      coordinates: location.coordinates,
      image: location.image
    };
    setCommentLocation(placeData);
  };

  const handleFollowUser = async (userId: string) => {
    try {
      // Toggle following status in the UI immediately for better UX
      if (searchMode === 'users') {
        setFilteredUsers(prev => 
          prev.map(user => 
            user.id === userId 
              ? { ...user, is_following: !user.is_following }
              : user
          )
        );
      } else {
        setUserRecommendations(prev => 
          prev.map(user => 
            user.id === userId 
              ? { ...user, isFollowing: !user.isFollowing }
              : user
          )
        );
      }
      
      // Make API call to follow/unfollow
      // This would be implemented in a real app
      console.log('Following/unfollowing user:', userId);
    } catch (error) {
      console.error('Error following user:', error);
      // Revert UI change if API call fails
    }
  };

  const handleMessageUser = (userId: string) => {
    setSelectedUserId(userId);
    setIsMessagesModalOpen(true);
  };

  const handleUserClick = (user: UserRecommendation | any) => {
    navigate(`/profile/${user.id}`);
  };

  const handleCommentSubmit = (comment: string) => {
    console.log('Comment submitted:', comment);
    setCommentLocation(null);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <SearchHeader
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        searchMode={searchMode}
        onSearchModeChange={setSearchMode}
        onClearSearch={() => {
          setSearchQuery('');
          setFilteredLocations([]);
          setFilteredUsers([]);
        }}
      />

      <SearchFilters
        sortBy={sortBy}
        onSortChange={setSortBy}
        showFilters={true}
      />

      <div className="flex-1 overflow-y-auto">
        {searchQuery ? (
          <SearchResults
            searchMode={searchMode}
            sortBy={sortBy}
            filteredLocations={filteredLocations}
            filteredUsers={filteredUsers}
            isSearching={isSearching || searchLoading}
            likedPlaces={likedPlaces}
            onCardClick={handleCardClick}
            onLikeToggle={handleLikeToggle}
            onShare={handleShare}
            onComment={handleComment}
            onUserClick={handleUserClick}
            onFollowUser={handleFollowUser}
            onMessageUser={handleMessageUser}
          />
        ) : (
          <div className="space-y-6">
            <SearchSuggestions 
              suggestions={[]}
              onSuggestionClick={() => {}}
              searchHistory={[]}
            />
            <RecommendationsSection
              searchMode={searchMode}
              loading={recommendationsLoading}
              locationRecommendations={locationRecommendations}
              userRecommendations={userRecommendations}
              onLocationClick={handleLocationClick}
              onUserClick={handleUserClick}
              onFollowUser={handleFollowUser}
              onLocationShare={handleLocationShare}
              onLocationComment={handleLocationComment}
              onLocationLike={handleLocationLike}
              likedPlaces={likedPlaces}
              onMessageUser={handleMessageUser}
            />
          </div>
        )}
      </div>

      <MessagesModal 
        isOpen={isMessagesModalOpen}
        onClose={() => {
          setIsMessagesModalOpen(false);
          setSelectedUserId(null);
        }}
        initialUserId={selectedUserId}
      />

      <LocationDetailSheet
        location={selectedLocation}
        isOpen={!!selectedLocation}
        onClose={() => setSelectedLocation(null)}
        onLike={() => selectedLocation && handleLikeToggle(selectedLocation.id)}
        isLiked={selectedLocation ? likedPlaces.has(selectedLocation.id) : false}
        onSave={() => {}}
        isSaved={false}
      />

      <ShareModal
        isOpen={!!shareLocation}
        onClose={() => setShareLocation(null)}
        item={shareLocation}
        itemType="place"
        onShare={() => setShareLocation(null)}
      />

      <CommentModal
        isOpen={!!commentLocation}
        onClose={() => setCommentLocation(null)}
        place={commentLocation}
        onCommentSubmit={handleCommentSubmit}
      />
    </div>
  );
};

export default ExplorePage;
