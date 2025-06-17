
import { useState, useEffect } from 'react';
import { useSearch } from '@/hooks/useSearch';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useMapPins } from '@/hooks/useMapPins';
import SearchHeader from '@/components/explore/SearchHeader';
import SearchResults from '@/components/explore/SearchResults';
import RecommendationsSection from '@/components/explore/RecommendationsSection';
import ShareModal from '@/components/home/ShareModal';
import CommentModal from '@/components/home/CommentModal';
import LocationDetailSheet from '@/components/LocationDetailSheet';
import Header from '@/components/home/Header';
import StoriesSection from '@/components/home/StoriesSection';
import LocationOfTheWeek from '@/components/home/LocationOfTheWeek';
import MapSection from '@/components/home/MapSection';
import FilterButtons from '@/components/home/FilterButtons';
import PlaceCard from '@/components/home/PlaceCard';
import { Place } from '@/types/place';
import { demoStories } from '@/data/demoData';

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

// Mock data for users (for search functionality)
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
type FilterType = 'following' | 'popular' | 'new';

const ExplorePage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('locations');
  const [sortBy, setSortBy] = useState<SortBy>('proximity');
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [likedPlaces, setLikedPlaces] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<FilterType>('following');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [showLocationDetail, setShowLocationDetail] = useState(false);
  
  // Modals
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  
  const { location, city } = useGeolocation();
  const { pins, loading: pinsLoading, refreshPins } = useMapPins(activeFilter);
  
  const { 
    searchHistory, 
    locationRecommendations, 
    userRecommendations, 
    loading, 
    saveSearch, 
    getSearchSuggestions 
  } = useSearch();

  // Convert pins to Places format for compatibility
  const convertedPins: Place[] = pins.map(pin => ({
    id: pin.id,
    name: pin.name,
    category: pin.category,
    likes: pin.likes || 0,
    friendsWhoSaved: pin.friendsWhoSaved || [],
    visitors: pin.visitors || [],
    isNew: pin.isNew || false,
    coordinates: pin.coordinates,
    image: pin.image,
    addedBy: pin.addedBy,
    addedDate: pin.addedDate,
    isFollowing: pin.isFollowing,
    popularity: pin.popularity,
    distance: pin.distance,
    totalSaves: pin.totalSaves || pin.likes || 0
  }));

  // Get top location for Location of the Week
  const topLocation = convertedPins.length > 0 ? convertedPins.reduce((prev, current) => 
    ((current.popularity || 0) > (prev.popularity || 0)) ? current : prev
  ) : null;

  // Convert map center based on location
  const mapCenter = location ? { lat: location.latitude, lng: location.longitude } : undefined;

  // Handle city change
  const handleCitySelect = (newCity: string) => {
    console.log('City selected:', newCity);
    refreshPins(newCity);
  };

  // Handle search input
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(e as any);
    }
  };

  // Filter users based on search query
  useEffect(() => {
    if (!searchQuery.trim() || searchMode !== 'users') {
      setFilteredUsers([]);
      return;
    }

    setIsSearching(true);
    
    // Simulate API call delay
    const timer = setTimeout(() => {
      let filtered = mockUsers.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
      );

      setFilteredUsers(filtered);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchMode]);

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
    setShowLocationDetail(true);
  };

  const handlePinClick = (place: any) => {
    // Convert map pin to Place format if needed
    const convertedPlace: Place = {
      id: place.id,
      name: place.name,
      category: place.category,
      likes: place.likes || 0,
      friendsWhoSaved: place.friendsWhoSaved || [],
      visitors: place.visitors || [],
      isNew: place.isNew || false,
      coordinates: place.coordinates,
      image: place.image,
      addedBy: place.addedBy,
      addedDate: place.addedDate,
      isFollowing: place.isFollowing,
      popularity: place.popularity,
      distance: place.distance,
      totalSaves: place.totalSaves || place.likes || 0
    };
    setSelectedPlace(convertedPlace);
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

  // Handle recommendation clicks for search mode
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

  // Check if we're in search mode
  const isInSearchMode = searchQuery.trim().length > 0;

  // Count new places for the filter button
  const newPlacesCount = convertedPins.filter(place => place.isNew).length;

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-blue-50/30 via-white to-purple-50/20">
      {!isInSearchMode ? (
        // Home page layout when not searching
        <div className="flex flex-col h-full">
          {/* Header with City Search */}
          <Header
            searchQuery={searchQuery}
            currentCity={city || 'Current Location'}
            onSearchChange={handleSearchChange}
            onSearchKeyPress={handleSearchKeyPress}
            onNotificationsClick={() => console.log('Notifications clicked')}
            onMessagesClick={() => console.log('Messages clicked')}
            onCitySelect={handleCitySelect}
          />

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto pb-20">
            {/* Stories Section */}
            <StoriesSection stories={demoStories} />

            {/* Location of the Week */}
            {topLocation && (
              <LocationOfTheWeek
                topLocation={topLocation}
                onLocationClick={handleCardClick}
              />
            )}

            {/* Filter Buttons */}
            <FilterButtons
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              newCount={newPlacesCount}
            />

            {/* Map Section */}
            <MapSection
              places={convertedPins}
              onPinClick={handlePinClick}
              mapCenter={mapCenter}
              selectedPlace={selectedPlace}
              onCloseSelectedPlace={() => setSelectedPlace(null)}
            />

            {/* Selected Place Card */}
            {selectedPlace && (
              <div className="px-4 mt-4">
                <PlaceCard
                  place={selectedPlace}
                  isLiked={likedPlaces.has(selectedPlace.id)}
                  onCardClick={() => handleCardClick(selectedPlace)}
                  onLikeToggle={() => handleLikeToggle(selectedPlace.id)}
                  onShare={() => handleShare(selectedPlace)}
                  onComment={() => handleComment(selectedPlace)}
                  cityName={city || 'Current City'}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        // Search mode layout
        <div className="flex flex-col h-full pt-16">
          {/* Search Header */}
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

          {/* Search Results */}
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
                filteredLocations={locationRecommendations}
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
        </div>
      )}

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

      {selectedPlace && (
        <LocationDetailSheet
          isOpen={showLocationDetail}
          onClose={() => setShowLocationDetail(false)}
          location={selectedPlace}
        />
      )}
    </div>
  );
};

export default ExplorePage;
