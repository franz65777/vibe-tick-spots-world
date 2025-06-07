
import { useState, useEffect } from 'react';
import { Search, MapPin, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import LocationDetailModal from './LocationDetailModal';

interface Place {
  id: string;
  name: string;
  category: string;
  image: string;
  rating: number;
  reviewCount: number;
  tags: string[];
  openingHours: string;
  coordinates: { lat: number; lng: number };
  description?: string;
  address?: string;
}

interface User {
  id: string;
  name: string;
  avatar: string;
  followersCount: number;
  isFollowing: boolean;
}

const demoPlaces: Place[] = [
  {
    id: '1',
    name: 'The Cozy Corner Café',
    category: 'restaurant',
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=300&fit=crop',
    rating: 4.5,
    reviewCount: 124,
    tags: ['coffee', 'breakfast', 'cozy'],
    openingHours: '7:00 AM - 10:00 PM',
    coordinates: { lat: 37.7749, lng: -122.4194 },
    description: 'A cozy spot perfect for morning coffee and light bites.',
    address: '123 Main St, San Francisco, CA'
  },
  {
    id: '2',
    name: 'Sunset Pizza Palace',
    category: 'restaurant',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop',
    rating: 4.3,
    reviewCount: 89,
    tags: ['pizza', 'italian', 'casual'],
    openingHours: '11:00 AM - 11:00 PM',
    coordinates: { lat: 37.7849, lng: -122.4094 },
    description: 'Authentic Italian pizza with amazing sunset views.',
    address: '456 Sunset Blvd, San Francisco, CA'
  }
];

const demoUsers: User[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    avatar: 'photo-1494790108755-2616b5a5c75b',
    followersCount: 1234,
    isFollowing: false
  },
  {
    id: '2',
    name: 'Mike Chen',
    avatar: 'photo-1507003211169-0a1dd7228f2d',
    followersCount: 567,
    isFollowing: true
  }
];

const ExplorePage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'location' | 'user'>('location');
  const [results, setResults] = useState<Place[] | User[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { searchHistory, addToSearchHistory } = useSearchHistory();
  const { preferences, updatePreference } = useUserPreferences();

  const categories = ['All', 'Restaurants', 'Bars', ...preferences.map(p => p.category)];

  useEffect(() => {
    if (searchQuery.trim()) {
      handleSearch();
    } else {
      setResults([]);
    }
  }, [searchQuery, searchType]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    // Add to search history
    addToSearchHistory(searchQuery, searchType === 'location' ? 'category' : 'user');

    if (searchType === 'location') {
      // Smart search for locations
      const filtered = demoPlaces.filter(place => 
        place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setResults(filtered);
      
      // Update user preferences
      if (searchQuery.toLowerCase().includes('pizza')) {
        updatePreference('pizza');
      } else if (searchQuery.toLowerCase().includes('coffee')) {
        updatePreference('coffee');
      }
    } else {
      // Search for users
      const filtered = demoUsers.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setResults(filtered);
    }
  };

  const handleSearchHistoryClick = (query: string, type: string) => {
    setSearchQuery(query);
    setSearchType(type as 'location' | 'user');
  };

  const handleCategoryClick = (category: string) => {
    if (category === 'All') {
      setResults(demoPlaces);
    } else {
      const filtered = demoPlaces.filter(place => 
        place.category.toLowerCase() === category.toLowerCase() ||
        place.tags.some(tag => tag.toLowerCase() === category.toLowerCase())
      );
      setResults(filtered);
    }
  };

  const handlePlaceClick = (place: Place) => {
    setSelectedPlace(place);
    setIsModalOpen(true);
  };

  const handleUserClick = (user: User) => {
    console.log('User clicked:', user.name);
  };

  const renderPlaceCard = (place: Place) => (
    <div 
      key={place.id}
      className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => handlePlaceClick(place)}
    >
      <img 
        src={place.image} 
        alt={place.name}
        className="w-full h-48 object-cover"
      />
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg text-gray-900">{place.name}</h3>
          <div className="flex items-center gap-1">
            <span className="text-yellow-500">⭐</span>
            <span className="text-sm text-gray-600">{place.rating}</span>
          </div>
        </div>
        <p className="text-gray-600 text-sm mb-2">{place.description}</p>
        <div className="flex flex-wrap gap-1 mb-3">
          {place.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{place.openingHours}</span>
          <span>{place.reviewCount} reviews</span>
        </div>
      </div>
    </div>
  );

  const renderUserCard = (user: User) => (
    <div 
      key={user.id}
      className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => handleUserClick(user)}
    >
      <div className="flex items-center gap-3">
        <img 
          src={`https://images.unsplash.com/${user.avatar}?w=60&h=60&fit=crop&crop=face`}
          alt={user.name}
          className="w-12 h-12 rounded-full object-cover"
        />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{user.name}</h3>
          <p className="text-sm text-gray-600">{user.followersCount} followers</p>
        </div>
        <Button 
          size="sm" 
          variant={user.isFollowing ? "outline" : "default"}
        >
          {user.isFollowing ? 'Following' : 'Follow'}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Explore</h1>
        
        {/* Search Type Toggle */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={searchType === 'location' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSearchType('location')}
            className="flex items-center gap-2"
          >
            <MapPin className="w-4 h-4" />
            Locations
          </Button>
          <Button
            variant={searchType === 'user' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSearchType('user')}
            className="flex items-center gap-2"
          >
            <User className="w-4 h-4" />
            Users
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder={searchType === 'location' ? "Search for places, pizza, coffee..." : "Search for users..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          
          {/* Search History Dropdown */}
          {searchHistory.length > 0 && searchQuery === '' && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
              <div className="p-2 border-b border-gray-100">
                <p className="text-xs text-gray-500 font-medium">Recent searches</p>
              </div>
              {searchHistory.slice(0, 5).map((item, index) => (
                <div
                  key={index}
                  className="p-2 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
                  onClick={() => handleSearchHistoryClick(item.search_query, item.search_type)}
                >
                  {item.search_type === 'user' ? <User className="w-4 h-4 text-gray-400" /> : <MapPin className="w-4 h-4 text-gray-400" />}
                  <span className="text-sm">{item.search_query}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category Filters (only for location search) */}
        {searchType === 'location' && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map(category => (
              <Button
                key={category}
                variant="outline"
                size="sm"
                onClick={() => handleCategoryClick(category)}
                className="whitespace-nowrap"
              >
                {category}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {results.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {searchType === 'location' 
              ? (results as Place[]).map(renderPlaceCard)
              : (results as User[]).map(renderUserCard)
            }
          </div>
        ) : searchQuery ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No results found for "{searchQuery}"</p>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">Start searching to discover amazing places and people!</p>
          </div>
        )}
      </div>

      {/* Location Detail Modal */}
      {selectedPlace && (
        <LocationDetailModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          location={selectedPlace}
        />
      )}
    </div>
  );
};

export default ExplorePage;
