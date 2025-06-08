
import { useState, useEffect } from 'react';
import { Search, MapPin, Users, SlidersHorizontal, Heart, UserCheck, Navigation } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useGeolocation } from '@/hooks/useGeolocation';
import PlaceCard from '@/components/home/PlaceCard';

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
  distance?: number;
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
    distance: 0.3
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
    distance: 0.8
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
    distance: 1.2
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
  const [filteredLocations, setFilteredLocations] = useState<Place[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const { location } = useGeolocation();

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
          filtered.sort((a, b) => (a.distance || 0) - (b.distance || 0));
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

        if (sortBy === 'followers') {
          filtered.sort((a, b) => b.followers - a.followers);
        }

        setFilteredUsers(filtered);
      }
      
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchMode, sortBy]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is handled by useEffect
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-blue-50/30 via-white to-purple-50/20 pt-16">
      {/* Header with Search */}
      <div className="bg-white/95 backdrop-blur-lg px-4 py-4 shadow-sm border-b border-gray-100">
        <div className="max-w-2xl mx-auto">
          {/* Search Mode Toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
            <button
              onClick={() => setSearchMode('locations')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                searchMode === 'locations'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <MapPin className="w-4 h-4" />
              Locations
            </button>
            <button
              onClick={() => setSearchMode('users')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                searchMode === 'users'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Users className="w-4 h-4" />
              Users
            </button>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder={searchMode === 'locations' ? 'Search for places, food, cafes...' : 'Search for users...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-12 h-12 bg-white border-gray-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-xl text-base"
              />
              <Button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </form>

          {/* Filters */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-700">Sort by:</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSortBy('proximity')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    sortBy === 'proximity'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Navigation className="w-4 h-4" />
                  Proximity
                </button>
                <button
                  onClick={() => setSortBy('likes')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    sortBy === 'likes'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Heart className="w-4 h-4" />
                  Likes
                </button>
                <button
                  onClick={() => setSortBy('followers')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    sortBy === 'followers'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  {searchMode === 'locations' ? 'Friends Saved' : 'Followers'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto pb-20">
        {!searchQuery.trim() ? (
          // Empty state
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Explore {searchMode === 'locations' ? 'Locations' : 'Users'}
            </h3>
            <p className="text-gray-600 text-sm max-w-sm">
              {searchMode === 'locations' 
                ? 'Search for restaurants, cafes, bars, and more. Discover new places based on what your friends have saved.'
                : 'Find and follow other users to see their favorite places and recommendations.'
              }
            </p>
          </div>
        ) : isSearching ? (
          // Loading state
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-600">Searching...</span>
            </div>
          </div>
        ) : searchMode === 'locations' ? (
          // Location results
          <div className="px-4 py-6">
            {filteredLocations.length > 0 ? (
              <>
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    Found {filteredLocations.length} {filteredLocations.length === 1 ? 'location' : 'locations'} 
                    {sortBy === 'proximity' && ' sorted by proximity'}
                    {sortBy === 'likes' && ' sorted by likes'}
                    {sortBy === 'followers' && ' sorted by friends who saved'}
                  </p>
                </div>
                <div className="space-y-4">
                  {filteredLocations.map((place) => (
                    <div key={place.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      <PlaceCard
                        place={place}
                        isLiked={false}
                        onCardClick={() => {}}
                        onLikeToggle={() => {}}
                        onShare={() => {}}
                        onComment={() => {}}
                        cityName="Current City"
                      />
                      {place.distance !== undefined && (
                        <div className="px-4 pb-3">
                          <span className="text-sm text-gray-500">
                            {place.distance} km away
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3 mx-auto">
                  <MapPin className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No locations found</h3>
                <p className="text-gray-600 text-sm">
                  Try searching for something else or check your spelling
                </p>
              </div>
            )}
          </div>
        ) : (
          // User results
          <div className="px-4 py-6">
            {filteredUsers.length > 0 ? (
              <>
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    Found {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
                  </p>
                </div>
                <div className="space-y-3">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={`https://images.unsplash.com/${user.avatar}?w=48&h=48&fit=crop&crop=face`}
                            alt={user.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <div>
                            <h3 className="font-semibold text-gray-900">{user.name}</h3>
                            <p className="text-sm text-gray-600">{user.username}</p>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-xs text-gray-500">
                                {user.followers} followers
                              </span>
                              <span className="text-xs text-gray-500">
                                {user.savedPlaces} saved places
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={user.isFollowing ? "outline" : "default"}
                          className="px-4"
                        >
                          {user.isFollowing ? 'Following' : 'Follow'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3 mx-auto">
                  <Users className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No users found</h3>
                <p className="text-gray-600 text-sm">
                  Try searching for something else or check your spelling
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExplorePage;
