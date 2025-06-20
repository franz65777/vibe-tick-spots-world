
import React, { useState, useEffect } from 'react';
import { Search, MapPin, Users, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import SearchHeader from './explore/SearchHeader';
import SearchResults from './explore/SearchResults';
import ExploreMap from './explore/ExploreMap';
import CategoryFilter from './explore/CategoryFilter';
import LocationRecommendations from './explore/LocationRecommendations';
import UserRecommendations from './explore/UserRecommendations';
import RecommendationsSection from './explore/RecommendationsSection';
import { Place } from '@/types/place';
import { CategoryType } from './explore/CategoryFilter';

type SortBy = 'proximity' | 'likes' | 'saves' | 'following' | 'recent';

const ExplorePage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'locations' | 'users'>('locations');
  const [isSearching, setIsSearching] = useState(false);
  const [likedPlaces, setLikedPlaces] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortBy>('proximity');
  const [filters, setFilters] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all');
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Get user's current location on component mount
  useEffect(() => {
    const getCurrentLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const location = { lat: latitude, lng: longitude };
            setUserLocation(location);
            setMapCenter(location);
            console.log('User location set:', location);
          },
          (error) => {
            console.error('Error getting location:', error);
            // Fallback to default location (San Francisco)
            const fallbackLocation = { lat: 37.7749, lng: -122.4194 };
            setUserLocation(fallbackLocation);
            setMapCenter(fallbackLocation);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
          }
        );
      } else {
        // Fallback if geolocation is not supported
        const fallbackLocation = { lat: 37.7749, lng: -122.4194 };
        setUserLocation(fallbackLocation);
        setMapCenter(fallbackLocation);
      }
    };

    getCurrentLocation();
  }, []);

  // Mock data for demo
  const mockLocations: Place[] = [
    {
      id: '1',
      name: 'Blue Bottle Coffee',
      category: 'cafe',
      coordinates: { lat: 37.7983, lng: -122.4020 },
      likes: 245,
      visitors: ['user1', 'user2', 'user3'],
      isNew: true,
      image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop',
      friendsWhoSaved: [
        { name: 'Emma', avatar: 'photo-1438761681033-6461ffad8d80' },
        { name: 'James', avatar: 'photo-1507003211169-0a1dd7228f2d' }
      ],
      totalSaves: 89,
      distance: '0.3km'
    },
    {
      id: '2',
      name: 'Golden Gate Park',
      category: 'park',
      coordinates: { lat: 37.7694, lng: -122.4862 },
      likes: 892,
      visitors: ['user1', 'user2', 'user3', 'user4', 'user5'],
      isNew: false,
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
      friendsWhoSaved: [
        { name: 'Sarah', avatar: 'photo-1494790108755-2616b612d1d' }
      ],
      totalSaves: 234,
      distance: '1.2km'
    }
  ];

  const mockUsers = [
    {
      id: 'user1',
      name: 'Sarah Johnson',
      username: 'sarah_j',
      avatar: 'photo-1494790108755-2616b612d1d',
      is_following: false
    },
    {
      id: 'user2',
      name: 'Mike Chen',
      username: 'mike_explorer',
      avatar: 'photo-1507003211169-0a1dd7228f2d',
      is_following: true
    }
  ];

  // Mock recommendations data
  const mockLocationRecommendations = [
    {
      id: '3',
      name: 'Tartine Bakery',
      category: 'bakery',
      coordinates: { lat: 37.7611, lng: -122.4086 },
      likes: 156,
      visitors: 4,
      isNew: false,
      image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop',
      addedBy: 'Local Explorer',
      isFollowing: false,
      popularity: 85,
      distance: 0.8,
      recommendationReason: 'Popular nearby'
    }
  ];

  const mockUserRecommendations = [
    {
      id: 'user3',
      name: 'Alex Kim',
      username: 'alex_foodie',
      avatar: 'photo-1472099645785-5658abf4ff4e',
      is_following: false,
      mutual_friends: 3
    }
  ];

  const filteredLocations = mockLocations.filter(location => {
    if (!searchQuery) return true;
    return location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           location.category.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredUsers = mockUsers.filter(user => {
    if (!searchQuery) return true;
    return user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           user.username.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setIsSearching(true);
      setTimeout(() => setIsSearching(false), 500);
    }
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

  const handleCardClick = (place: Place) => {
    console.log('Card clicked:', place.name);
  };

  const handleShare = (place: Place) => {
    console.log('Share place:', place.name);
  };

  const handleComment = (place: Place) => {
    console.log('Comment on place:', place.name);
  };

  const handleUserClick = (user: any) => {
    console.log('User clicked:', user.name);
  };

  const handleFollowUser = (userId: string) => {
    console.log('Follow user:', userId);
  };

  const handleMessageUser = (userId: string) => {
    console.log('Message user:', userId);
  };

  const handlePinClick = (pin: any) => {
    console.log('Pin clicked:', pin);
    // Find the corresponding place and handle click
    const place = mockLocations.find(loc => loc.id === pin.id);
    if (place) {
      handleCardClick(place);
    }
  };

  const mapPins = mockLocations.map(location => ({
    id: location.id,
    name: location.name,
    category: location.category,
    coordinates: location.coordinates,
    likes: location.likes,
    image: location.image,
    isFollowing: false
  }));

  const clearSearch = () => {
    setSearchQuery('');
  };

  const isSearchActive = searchQuery.trim().length > 0;

  return (
    <div className="flex flex-col h-full bg-gray-50 pt-16">
      {/* Search Header */}
      <SearchHeader
        searchQuery={searchQuery}
        onSearchQueryChange={handleSearch}
        searchMode={searchMode}
        onSearchModeChange={setSearchMode}
        onClearSearch={clearSearch}
        sortBy={sortBy}
        onSortChange={setSortBy}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {isSearchActive ? (
        /* Search Results View */
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
          onUserClick={handleUserClick}
          onFollowUser={handleFollowUser}
          onMessageUser={handleMessageUser}
        />
      ) : (
        /* Explore View */
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="map" className="h-full flex flex-col">
            <div className="px-4 py-2 bg-white border-b border-gray-100">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="map">Map View</TabsTrigger>
                <TabsTrigger value="recommendations">Discover</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="map" className="flex-1 m-0 p-0">
              <div className="h-full flex flex-col">
                {/* Category Filter */}
                <div className="px-4 py-3 bg-white border-b border-gray-100">
                  <CategoryFilter
                    selectedCategory={selectedCategory}
                    onCategoryChange={setSelectedCategory}
                  />
                </div>

                {/* Map */}
                <div className="flex-1">
                  {mapCenter && (
                    <ExploreMap
                      pins={mapPins}
                      activeFilter="popular"
                      selectedCategory={selectedCategory}
                      onPinClick={handlePinClick}
                      mapCenter={mapCenter}
                    />
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="recommendations" className="flex-1 m-0 p-0 overflow-y-auto">
              <RecommendationsSection
                searchMode={searchMode}
                loading={false}
                locationRecommendations={mockLocationRecommendations}
                userRecommendations={mockUserRecommendations}
                onLocationClick={handleCardClick}
                onUserClick={handleUserClick}
                onFollowUser={handleFollowUser}
                onLocationShare={handleShare}
                onLocationComment={handleComment}
                onLocationLike={handleLikeToggle}
                likedPlaces={likedPlaces}
                onMessageUser={handleMessageUser}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default ExplorePage;
