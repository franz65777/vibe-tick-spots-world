
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import BottomNavigation from './BottomNavigation';
import SearchHeader from './explore/SearchHeader';
import SearchResults from './explore/SearchResults';
import LocationRecommendations from './explore/LocationRecommendations';
import UserRecommendations from './explore/UserRecommendations';
import RecommendationsSection from './explore/RecommendationsSection';

// Define unified Place interface
interface Place {
  id: string;
  name: string;
  category: string;
  likes: number;
  friendsWhoSaved: { name: string; avatar: string; }[];
  visitors: string[];
  isNew: boolean;
  coordinates: { lat: number; lng: number };
  rating: number;
  reviews: number;
  distance: string;
  addedBy: { name: string; avatar: string; isFollowing: boolean };
  addedDate: string;
  image: string;
  description?: string;
  totalSaves: number;
}

const ExplorePage = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recommendations, setRecommendations] = useState<Place[]>([]);
  const [searchMode, setSearchMode] = useState<'locations' | 'users'>('locations');
  const [sortBy, setSortBy] = useState<'proximity' | 'likes' | 'followers'>('proximity');
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions] = useState<string[]>(['Central Park', 'Brooklyn Bridge', 'Times Square']);
  const [recentSearches] = useState<string[]>(['Museums', 'Parks']);
  const [likedPlaces, setLikedPlaces] = useState<Set<string>>(new Set());

  // Demo data
  useEffect(() => {
    const demoRecommendations: Place[] = [
      {
        id: '1',
        name: 'Central Park',
        category: 'Park',
        likes: 342,
        friendsWhoSaved: [
          { name: 'Emma', avatar: '/api/placeholder/32/32' },
          { name: 'Alex', avatar: '/api/placeholder/32/32' }
        ],
        visitors: ['Emma', 'Alex', 'Sara'],
        isNew: false,
        coordinates: { lat: 40.7829, lng: -73.9654 },
        rating: 4.9,
        reviews: 1200,
        distance: '2.1 km',
        addedBy: { name: 'Emma', avatar: '/api/placeholder/32/32', isFollowing: true },
        addedDate: '2024-01-10',
        image: '/api/placeholder/400/300',
        description: 'Beautiful urban park in Manhattan',
        totalSaves: 342
      },
      {
        id: '2',
        name: 'Brooklyn Bridge',
        category: 'Historic',
        likes: 523,
        friendsWhoSaved: [
          { name: 'John', avatar: '/api/placeholder/32/32' }
        ],
        visitors: ['John', 'Lisa', 'Mike'],
        isNew: true,
        coordinates: { lat: 40.7061, lng: -73.9969 },
        rating: 4.8,
        reviews: 890,
        distance: '3.5 km',
        addedBy: { name: 'John', avatar: '/api/placeholder/32/32', isFollowing: false },
        addedDate: '2024-01-20',
        image: '/api/placeholder/400/300',
        description: 'Iconic suspension bridge connecting Manhattan and Brooklyn',
        totalSaves: 523
      }
    ];
    setRecommendations(demoRecommendations);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    
    // Simulate search
    setTimeout(() => {
      const results = recommendations.filter(place => 
        place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(results);
      setIsSearching(false);
    }, 1000);
  };

  const handlePlaceClick = (place: Place) => {
    console.log('Place clicked:', place.name);
  };

  const handleSavePlace = (placeId: string) => {
    console.log('Saving place:', placeId);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
  };

  const handleUserClick = (user: any) => {
    console.log('User clicked:', user.name);
  };

  const handleFollowUser = (userId: string) => {
    console.log('Following user:', userId);
  };

  const handleLocationShare = (location: any) => {
    console.log('Sharing location:', location.name);
  };

  const handleLocationComment = (location: any) => {
    console.log('Commenting on location:', location.name);
  };

  const handleLocationLike = (locationId: string) => {
    setLikedPlaces(prev => {
      const newSet = new Set(prev);
      if (newSet.has(locationId)) {
        newSet.delete(locationId);
      } else {
        newSet.add(locationId);
      }
      return newSet;
    });
  };

  const hasSearchQuery = searchQuery.trim().length > 0;
  const showResults = hasSearchQuery && searchResults.length > 0;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
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
        suggestions={suggestions}
        recentSearches={recentSearches}
        onSuggestionClick={handleSuggestionClick}
      />
      
      <div className="flex-1 overflow-auto pb-20">
        {showResults ? (
          <SearchResults 
            results={searchResults}
            isLoading={isSearching}
            onPlaceClick={handlePlaceClick}
            onSavePlace={handleSavePlace}
          />
        ) : (
          <div className="px-4 py-6">
            {searchMode === 'locations' ? (
              <LocationRecommendations
                recommendations={recommendations}
                onLocationClick={handlePlaceClick}
                onLocationShare={handleLocationShare}
                onLocationComment={handleLocationComment}
                onLocationLike={handleLocationLike}
                likedPlaces={likedPlaces}
              />
            ) : (
              <UserRecommendations
                recommendations={[]}
                onUserClick={handleUserClick}
                onFollowUser={handleFollowUser}
              />
            )}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};

export default ExplorePage;
