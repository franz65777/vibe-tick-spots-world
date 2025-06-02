
import { useState } from 'react';
import { Search, MapPin, User, ArrowLeft, X, Heart, Share, MessageCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import PlaceCard from '@/components/home/PlaceCard';
import ShareModal from '@/components/home/ShareModal';
import LocationDetailSheet from '@/components/LocationDetailSheet';

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
}

const ExplorePage = () => {
  console.log('ExplorePage component rendering...');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'locations' | 'users'>('locations');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [likedPlaces, setLikedPlaces] = useState<Set<string>>(new Set());
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedPlaceToShare, setSelectedPlaceToShare] = useState<Place | null>(null);
  const [isLocationDetailOpen, setIsLocationDetailOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Place | null>(null);

  // Sample data for locations with better images
  const locations = [
    {
      id: '1',
      name: "Golden Gate Cafe",
      location: "San Francisco, CA",
      description: "Best coffee in the city!",
      likes: 128,
      category: "cafe",
      distance: 0.8,
      image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=300&fit=crop",
      friendsWhoSaved: [
        { name: 'Sarah', avatar: '1649972904349-6e44c42644a7' },
        { name: 'Mike', avatar: '1581091226825-a6a2a5aee158' }
      ],
      visitors: ['user1', 'user2'],
      isNew: true,
      coordinates: { lat: 37.7849, lng: -122.4094 }
    },
    {
      id: '2',
      name: "Ocean View Hotel",
      location: "Monterey, CA",
      description: "Stunning ocean views",
      likes: 89,
      category: "hotel",
      distance: 1.2,
      image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop",
      friendsWhoSaved: [
        { name: 'Emma', avatar: '1581092795360-fd1ca04f0952' }
      ],
      visitors: ['user4', 'user5'],
      isNew: false,
      coordinates: { lat: 37.7749, lng: -122.4094 }
    },
    {
      id: '3',
      name: "The Rooftop Bar",
      location: "Los Angeles, CA",
      description: "Amazing cocktails with city view",
      likes: 156,
      category: "bar",
      distance: 0.5,
      image: "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=400&h=300&fit=crop",
      visitors: ['user6'],
      isNew: true,
      coordinates: { lat: 37.7649, lng: -122.4194 }
    },
    {
      id: '4',
      name: "Modern Art Gallery",
      location: "New York, NY",
      description: "Contemporary art collection",
      likes: 67,
      category: "museum",
      distance: 2.1,
      image: "https://images.unsplash.com/photo-1564399579883-451a5d5c4b6d?w=400&h=300&fit=crop",
      visitors: ['user7'],
      isNew: false,
      coordinates: { lat: 37.7549, lng: -122.4294 }
    },
    {
      id: '5',
      name: "Vintage Boutique",
      location: "Portland, OR",
      description: "Unique fashion finds",
      likes: 43,
      category: "shop",
      distance: 1.5,
      image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop",
      visitors: ['user8'],
      isNew: false,
      coordinates: { lat: 37.7949, lng: -122.4294 }
    },
    {
      id: '6',
      name: "Mountain Adventure Tours",
      location: "Denver, CO",
      description: "Unforgettable hiking experience",
      likes: 92,
      category: "experience",
      distance: 3.2,
      image: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=300&fit=crop",
      visitors: ['user9'],
      isNew: false,
      coordinates: { lat: 37.7849, lng: -122.4294 }
    }
  ];

  // Sample data for users
  const users = [
    {
      id: 1,
      username: "foodie_lover",
      fullName: "Alex Johnson",
      followers: 1250,
      avatar: "/lovable-uploads/8a9fd2cf-e687-48ee-a40f-3dd4b19ba4ff.png"
    },
    {
      id: 2,
      username: "travel_guru",
      fullName: "Emma Wilson",
      followers: 3400,
      avatar: "/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png"
    },
    {
      id: 3,
      username: "local_explorer",
      fullName: "Ryan Chen",
      followers: 890,
      avatar: "/lovable-uploads/5bb15f7b-b3ba-4eae-88b1-7fa789eb67c4.png"
    }
  ];

  // User search history
  const userSearchHistory = [
    {
      username: "foodie_lover",
      fullName: "Alex Johnson",
      lastSearched: "2 days ago",
      avatar: "/lovable-uploads/8a9fd2cf-e687-48ee-a40f-3dd4b19ba4ff.png"
    },
    {
      username: "travel_guru",
      fullName: "Emma Wilson",
      lastSearched: "1 week ago",
      avatar: "/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png"
    }
  ];

  const categories = [
    { 
      name: "Restaurants", 
      image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop", 
      category: "restaurant" 
    },
    { 
      name: "Hotels", 
      image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop", 
      category: "hotel" 
    },
    { 
      name: "Bars", 
      image: "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=400&h=300&fit=crop", 
      category: "bar" 
    },
    { 
      name: "Museums", 
      image: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=400&h=300&fit=crop", 
      category: "museum" 
    },
    { 
      name: "Shops", 
      image: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400&h=300&fit=crop", 
      category: "shop" 
    },
    { 
      name: "Experiences", 
      image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop", 
      category: "experience" 
    }
  ];

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (query.trim() === '') {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    if (searchType === 'locations') {
      const results = locations.filter(location =>
        location.name.toLowerCase().includes(query.toLowerCase()) ||
        location.location.toLowerCase().includes(query.toLowerCase()) ||
        location.description.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(results);
    } else {
      const results = users.filter(user =>
        user.username.toLowerCase().includes(query.toLowerCase()) ||
        user.fullName.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(results);
    }
  };

  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(category);
    setIsSearching(true);
    const results = locations.filter(location => location.category === category);
    setSearchResults(results);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    setSearchResults([]);
    setSelectedCategory('all');
  };

  const goBack = () => {
    if (selectedCategory !== 'all') {
      setSelectedCategory('all');
      setIsSearching(false);
      setSearchResults([]);
    } else {
      clearSearch();
    }
  };

  const handleLikeToggle = (placeId: string) => {
    setLikedPlaces(prev => {
      const newLikes = new Set(prev);
      if (newLikes.has(placeId)) {
        newLikes.delete(placeId);
      } else {
        newLikes.add(placeId);
      }
      return newLikes;
    });
  };

  const handleCardClick = (place: Place) => {
    console.log('Place card clicked:', place.name);
    setSelectedLocation(place);
    setIsLocationDetailOpen(true);
  };

  const handleShare = (place: Place) => {
    console.log('Share place:', place.name);
    setSelectedPlaceToShare(place);
    setIsShareModalOpen(true);
  };

  const handleShareComplete = (friendIds: string[], place: Place) => {
    console.log('Sharing place with friends:', friendIds, place.name);
    // TODO: Send location to selected friends' DMs
  };

  const handleComment = (place: Place) => {
    console.log('Comment on place:', place.name);
  };

  const filteredLocations = selectedCategory === 'all'
    ? locations
    : locations.filter(location => location.category === selectedCategory);

  const renderLocationSearchResults = () => {
    const resultsToShow = isSearching ? searchResults : filteredLocations;
    
    if (resultsToShow.length === 0 && isSearching) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <Search className="w-16 h-16 text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg">No results found</p>
        </div>
      );
    }

    return (
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4">
          {resultsToShow.map((location) => (
            <PlaceCard
              key={location.id}
              place={location as Place}
              isLiked={likedPlaces.has(location.id)}
              onCardClick={handleCardClick}
              onLikeToggle={handleLikeToggle}
              onShare={handleShare}
              onComment={handleComment}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderUserSearchResults = () => {
    if (searchResults.length === 0 && isSearching) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <Search className="w-16 h-16 text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg">No results found</p>
        </div>
      );
    }

    return (
      <div className="space-y-2 p-4">
        {searchResults.map((user) => (
          <div key={user.id} className="flex items-center p-3 bg-white rounded-lg">
            <img
              src={user.avatar}
              alt={user.fullName}
              className="w-12 h-12 rounded-full mr-3"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/placeholder.svg';
              }}
            />
            <div className="flex-1">
              <p className="font-semibold">{user.fullName}</p>
              <p className="text-sm text-gray-600">@{user.username}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">{user.followers}</p>
              <p className="text-xs text-gray-500">followers</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderUserSearchHistory = () => {
    return (
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Recent Searches</h2>
        <div className="space-y-2">
          {userSearchHistory.map((user, index) => (
            <div
              key={index}
              className="flex items-center p-3 bg-white rounded-lg cursor-pointer"
              onClick={() => handleSearch(user.username)}
            >
              <img
                src={user.avatar}
                alt={user.fullName}
                className="w-10 h-10 rounded-full mr-3"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder.svg';
                }}
              />
              <div className="flex-1">
                <p className="font-semibold">{user.fullName}</p>
                <p className="text-sm text-gray-600">@{user.username}</p>
              </div>
              <p className="text-xs text-gray-500">{user.lastSearched}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCategoryGrid = () => {
    return (
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4">
          {categories.map((category, index) => (
            <div
              key={index}
              className="relative h-32 rounded-lg overflow-hidden cursor-pointer shadow-md"
              onClick={() => handleCategoryFilter(category.category)}
            >
              <img
                src={category.image}
                alt={category.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder.svg';
                }}
              />
              <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                <span className="text-white font-semibold text-lg">{category.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMainContent = () => {
    if (searchType === 'locations') {
      if (selectedCategory !== 'all' || isSearching) {
        return renderLocationSearchResults();
      }
      return renderCategoryGrid();
    } else {
      if (isSearching) {
        return renderUserSearchResults();
      }
      return renderUserSearchHistory();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Search Header */}
      <div className="bg-white p-4 border-b">
        <div className="flex items-center gap-3">
          {/* Back button */}
          {(isSearching || selectedCategory !== 'all' || (searchType === 'users' && !isSearching)) && (
            <Button variant="ghost" size="icon" onClick={goBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={searchType === 'locations' ? 'Search for places' : 'Search for users'}
              className="pl-10 pr-10 bg-gray-100 border-none rounded-full"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
                onClick={clearSearch}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          {/* Search Type Toggle */}
          {!isSearching && selectedCategory === 'all' && (
            <div className="flex bg-gray-200 rounded-full p-1">
              <button
                onClick={() => setSearchType('locations')}
                className={cn(
                  "p-2 rounded-full transition-colors",
                  searchType === 'locations' ? "bg-blue-500 text-white" : "text-gray-600"
                )}
              >
                <MapPin className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSearchType('users')}
                className={cn(
                  "p-2 rounded-full transition-colors",
                  searchType === 'users' ? "bg-blue-500 text-white" : "text-gray-600"
                )}
              >
                <User className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Category Filter Buttons - only show for locations */}
      {searchType === 'locations' && (selectedCategory !== 'all' || isSearching) && (
        <div className="bg-white px-4 py-3 border-b border-gray-200">
          <div className="flex space-x-2 overflow-x-auto">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('all')}
            >
              All
            </Button>
            <Button
              variant={selectedCategory === 'restaurant' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('restaurant')}
            >
              Restaurants
            </Button>
            <Button
              variant={selectedCategory === 'hotel' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('hotel')}
            >
              Hotels
            </Button>
            <Button
              variant={selectedCategory === 'cafe' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('cafe')}
            >
              Cafes
            </Button>
            <Button
              variant={selectedCategory === 'bar' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('bar')}
            >
              Bars
            </Button>
            <Button
              variant={selectedCategory === 'museum' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('museum')}
            >
              Museums
            </Button>
            <Button
              variant={selectedCategory === 'shop' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('shop')}
            >
              Shops
            </Button>
            <Button
              variant={selectedCategory === 'experience' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('experience')}
            >
              Experiences
            </Button>
          </div>
        </div>
      )}

      {/* Category/Results Title */}
      {searchType === 'locations' && (selectedCategory !== 'all' || isSearching) && (
        <div className="bg-white px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold capitalize">
              {isSearching && searchQuery 
                ? `"${searchQuery}" Results` 
                : selectedCategory === 'all' 
                  ? 'All Places' 
                  : `${selectedCategory} Results`
              }
            </h1>
            <span className="text-gray-500">
              {(isSearching ? searchResults : filteredLocations).length} found
            </span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {renderMainContent()}
      </div>

      {/* Modals */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        place={selectedPlaceToShare}
        onShare={handleShareComplete}
      />

      <LocationDetailSheet
        isOpen={isLocationDetailOpen}
        onClose={() => setIsLocationDetailOpen(false)}
        location={selectedLocation}
      />
    </div>
  );
};

export default ExplorePage;
