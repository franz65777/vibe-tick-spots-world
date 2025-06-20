
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserSearch } from '@/hooks/useUserSearch';
import { searchService, LocationRecommendation, UserRecommendation } from '@/services/searchService';
import SearchHeader from './explore/SearchHeader';
import SearchResults from './explore/SearchResults';
import RecommendationsSection from './explore/RecommendationsSection';
import LocationDetailSheet from './LocationDetailSheet';
import ShareModal from './home/ShareModal';
import CommentModal from './home/CommentModal';
import MessagesModal from './MessagesModal';
import RecentSearches from './explore/RecentSearches';
import LocationCard from './explore/LocationCard';
import { Place } from '@/types/place';
import { toast } from '@/hooks/use-toast';

type SortBy = 'proximity' | 'likes' | 'saves' | 'following' | 'recent';

const ExplorePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { users: searchUsers, loading: searchLoading, searchUsers: performUserSearch } = useUserSearch();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'locations' | 'users'>('locations');
  const [sortBy, setSortBy] = useState<SortBy>('proximity');
  const [filters, setFilters] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filteredLocations, setFilteredLocations] = useState<Place[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [locationRecommendations, setLocationRecommendations] = useState<LocationRecommendation[]>([]);
  const [userRecommendations, setUserRecommendations] = useState<UserRecommendation[]>([]);
  const [likedPlaces, setLikedPlaces] = useState<Set<string>>(new Set());
  const [savedPlaces, setSavedPlaces] = useState<Set<string>>(new Set());
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
  }, [searchQuery, searchMode, sortBy, filters]);

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
        // Enhanced mock location search with sorting and filtering
        let mockLocations = [
          {
            id: '1',
            name: 'Coffee Shop Milano',
            category: 'cafe',
            likes: 120,
            visitors: ['user1', 'user2'],
            isNew: false,
            coordinates: { lat: 45.4642, lng: 9.1900 },
            image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop',
            distance: '0.5km',
            totalSaves: 45,
            friendsWhoSaved: [
              { name: 'Emma', avatar: 'photo-1438761681033-6461ffad8d80' },
              { name: 'James', avatar: 'photo-1507003211169-0a1dd7228f2d' }
            ]
          },
          {
            id: '2',
            name: 'Trattoria Bella Napoli',
            category: 'restaurant',
            likes: 210,
            visitors: ['user3', 'user4'],
            isNew: true,
            coordinates: { lat: 40.8518, lng: 14.2681 },
            image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop',
            distance: '1.2km',
            totalSaves: 89,
            friendsWhoSaved: [
              { name: 'Sofia', avatar: 'photo-1494790108755-2616b612b789' }
            ]
          },
          {
            id: '3',
            name: 'Rooftop Bar Sunset',
            category: 'bar',
            likes: 156,
            visitors: ['user5', 'user6', 'user7'],
            isNew: false,
            coordinates: { lat: 41.9028, lng: 12.4964 },
            image: 'https://images.unsplash.com/photo-1569949381669-ecf31ae8e613?w=400&h=300&fit=crop',
            distance: '2.1km',
            totalSaves: 67
          }
        ];

        // Apply search filter
        mockLocations = mockLocations.filter(loc => 
          loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          loc.category.toLowerCase().includes(searchQuery.toLowerCase())
        );

        // Apply sorting
        switch (sortBy) {
          case 'likes':
            mockLocations.sort((a, b) => b.likes - a.likes);
            break;
          case 'saves':
            mockLocations.sort((a, b) => (b.totalSaves || 0) - (a.totalSaves || 0));
            break;
          case 'following':
            mockLocations.sort((a, b) => (b.friendsWhoSaved?.length || 0) - (a.friendsWhoSaved?.length || 0));
            break;
          case 'recent':
            mockLocations.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
            break;
          case 'proximity':
          default:
            mockLocations.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
            break;
        }

        // Apply filters
        if (filters.includes('new')) {
          mockLocations = mockLocations.filter(loc => loc.isNew);
        }
        if (filters.includes('photos')) {
          mockLocations = mockLocations.filter(loc => loc.image);
        }
        if (filters.includes('trending')) {
          mockLocations = mockLocations.filter(loc => loc.likes > 150);
        }
        
        setFilteredLocations(mockLocations);
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

  const handleSaveToggle = (place: Place) => {
    setSavedPlaces(prev => {
      const newSet = new Set(prev);
      if (newSet.has(place.id)) {
        newSet.delete(place.id);
      } else {
        newSet.add(place.id);
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
      console.log('Following/unfollowing user:', userId);
    } catch (error) {
      console.error('Error following user:', error);
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

  const handleSortChange = (newSortBy: SortBy) => {
    setSortBy(newSortBy);
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
        sortBy={sortBy}
        onSortChange={handleSortChange}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <div className="flex-1 overflow-y-auto">
        {searchQuery ? (
          searchMode === 'locations' ? (
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">
                  {filteredLocations.length} locations found
                </h3>
              </div>
              
              {isSearching ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-gray-600">Searching...</span>
                  </div>
                </div>
              ) : filteredLocations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">No locations found</h3>
                  <p className="text-gray-500 text-center text-sm">
                    Try searching for cafes, restaurants, or specific place names
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredLocations.map((place) => (
                    <LocationCard
                      key={place.id}
                      place={place}
                      isLiked={likedPlaces.has(place.id)}
                      isSaved={savedPlaces.has(place.id)}
                      onLike={handleLikeToggle}
                      onSave={handleSaveToggle}
                      onComment={handleComment}
                      onShare={handleShare}
                      onCardClick={handleCardClick}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
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
          )
        ) : (
          <div className="space-y-0">
            <RecentSearches
              searchMode={searchMode}
              onSearchClick={setSearchQuery}
              onUserClick={handleUserClick}
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
        onSave={() => selectedLocation && handleSaveToggle(selectedLocation)}
        isSaved={selectedLocation ? savedPlaces.has(selectedLocation.id) : false}
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
