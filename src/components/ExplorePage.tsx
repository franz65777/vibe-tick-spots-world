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
  posts?: { content: string; tags: string[] }[];
  comments?: { content: string; author: string }[];
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

  // User's current location (San Francisco as default)
  const userLocation = { lat: 37.7749, lng: -122.4194 };

  // Sample data for locations with posts and comments containing keywords
  const locations = [
    {
      id: '1',
      name: "The Cozy Corner Café",
      location: "San Francisco, CA",
      description: "Best coffee in the city!",
      likes: 24,
      category: "cafe",
      distance: 0.8,
      image: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop",
      friendsWhoSaved: [
        { name: 'Sarah', avatar: '1649972904349-6e44c42644a7' },
        { name: 'Mike', avatar: '1581091226825-a6a2a5aee158' }
      ],
      visitors: ['user1', 'user2'],
      isNew: true,
      coordinates: { lat: 37.7849, lng: -122.4094 },
      posts: [
        { content: "Amazing pizza here! The margherita is to die for", tags: ["pizza", "italian", "delicious"] },
        { content: "Great coffee and pastries", tags: ["coffee", "pastries", "breakfast"] }
      ],
      comments: [
        { content: "Love their pepperoni pizza!", author: "foodie123" },
        { content: "Best espresso in town", author: "coffee_lover" }
      ]
    },
    {
      id: '2',
      name: "Sunset View Restaurant",
      location: "Monterey, CA",
      description: "Stunning ocean views",
      likes: 18,
      category: "restaurant",
      distance: 1.2,
      image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop",
      friendsWhoSaved: [
        { name: 'Emma', avatar: '1581092795360-fd1ca04f0952' }
      ],
      visitors: ['user4', 'user5'],
      isNew: false,
      coordinates: { lat: 37.7749, lng: -122.4094 },
      posts: [
        { content: "Incredible seafood pasta and the sunset view is breathtaking", tags: ["seafood", "pasta", "sunset", "romantic"] },
        { content: "Their wine selection is outstanding", tags: ["wine", "dinner", "date"] }
      ],
      comments: [
        { content: "The lobster was amazing!", author: "seafood_fan" },
        { content: "Perfect place for a romantic dinner", author: "couple_goals" }
      ]
    },
    {
      id: '3',
      name: "Grand Plaza Hotel",
      location: "Los Angeles, CA",
      description: "Amazing cocktails with city view",
      likes: 45,
      category: "hotel",
      distance: 0.5,
      image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop",
      visitors: ['user6'],
      isNew: false,
      coordinates: { lat: 37.7649, lng: -122.4194 },
      posts: [
        { content: "The rooftop bar serves incredible cocktails and has city views", tags: ["cocktails", "rooftop", "city", "drinks"] },
        { content: "Room service has great burgers", tags: ["burgers", "room service", "comfort food"] }
      ],
      comments: [
        { content: "Their signature martini is perfect", author: "cocktail_expert" },
        { content: "Best hotel burger I've ever had", author: "burger_king" }
      ]
    },
    {
      id: '4',
      name: "Neon Nights Bar",
      location: "New York, NY",
      description: "Contemporary art collection",
      likes: 32,
      category: "bar",
      distance: 2.1,
      image: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=300&fit=crop",
      visitors: ['user7'],
      isNew: true,
      coordinates: { lat: 37.7549, lng: -122.4294 },
      posts: [
        { content: "Great craft beer selection and they serve pizza until late", tags: ["craft beer", "pizza", "late night"] },
        { content: "The DJ plays amazing electronic music", tags: ["music", "electronic", "dancing"] }
      ],
      comments: [
        { content: "Pizza here is surprisingly good for a bar!", author: "night_owl" },
        { content: "Love the atmosphere and beer selection", author: "beer_enthusiast" }
      ]
    },
    {
      id: '5',
      name: "Ocean Breeze Restaurant",
      location: "Portland, OR",
      description: "Unique fashion finds",
      likes: 28,
      category: "restaurant",
      distance: 1.5,
      image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=300&fit=crop",
      friendsWhoSaved: [
        { name: 'Alex', avatar: '1535268647677-300dbf3d78d1' },
        { name: 'Jordan', avatar: '1649972904349-6e44c42644a7' },
        { name: 'Casey', avatar: '1581091226825-a6a2a5aee158' }
      ],
      visitors: ['user8'],
      isNew: false,
      coordinates: { lat: 37.7949, lng: -122.4294 },
      posts: [
        { content: "Their sushi is fresh and the ramen is authentic", tags: ["sushi", "ramen", "japanese", "authentic"] },
        { content: "Amazing vegetarian options and organic ingredients", tags: ["vegetarian", "organic", "healthy"] }
      ],
      comments: [
        { content: "Best sushi in the area!", author: "sushi_master" },
        { content: "Love their vegan ramen", author: "plant_based" }
      ]
    },
    {
      id: '6',
      name: "Artisan Coffee House",
      location: "Denver, CO",
      description: "Unforgettable hiking experience",
      likes: 22,
      category: "cafe",
      distance: 3.2,
      image: "https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=400&h=300&fit=crop",
      visitors: ['user9'],
      isNew: false,
      coordinates: { lat: 37.7849, lng: -122.4294 },
      posts: [
        { content: "They serve artisan donuts and the best latte art", tags: ["donuts", "latte", "artisan", "coffee"] },
        { content: "Great study spot with free wifi", tags: ["study", "wifi", "quiet"] }
      ],
      comments: [
        { content: "Their glazed donuts are heavenly", author: "sweet_tooth" },
        { content: "Perfect place to work remotely", author: "digital_nomad" }
      ]
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

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    return distance;
  };

  // Filter locations within 3km radius
  const getNearbyLocations = (allLocations: any[]) => {
    return allLocations.filter(location => {
      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        location.coordinates.lat,
        location.coordinates.lng
      );
      return distance <= 3;
    });
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (query.trim() === '') {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    if (searchType === 'locations') {
      const nearbyLocations = getNearbyLocations(locations);
      const results = nearbyLocations.filter(location => {
        const queryLower = query.toLowerCase();
        
        // Search in basic location info
        const basicMatch = location.name.toLowerCase().includes(queryLower) ||
          location.location.toLowerCase().includes(queryLower) ||
          location.description.toLowerCase().includes(queryLower);
        
        // Search in posts content and tags
        const postMatch = location.posts?.some(post => 
          post.content.toLowerCase().includes(queryLower) ||
          post.tags.some(tag => tag.toLowerCase().includes(queryLower))
        );
        
        // Search in comments
        const commentMatch = location.comments?.some(comment =>
          comment.content.toLowerCase().includes(queryLower)
        );
        
        return basicMatch || postMatch || commentMatch;
      });
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
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    setSearchResults([]);
  };

  const goBack = () => {
    clearSearch();
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

  // Get filtered locations within 3km and by category
  const getFilteredLocations = () => {
    const nearbyLocations = getNearbyLocations(locations);
    if (selectedCategory === 'all') {
      return nearbyLocations;
    }
    return nearbyLocations.filter(location => location.category === selectedCategory);
  };

  const renderLocationSearchResults = () => {
    const resultsToShow = isSearching ? searchResults : getFilteredLocations();
    
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

  const renderMainContent = () => {
    if (searchType === 'locations') {
      return (
        <div>
          {/* Category Filter Buttons - Always visible for locations */}
          <div className="bg-white px-4 py-3 border-b border-gray-200">
            <div className="flex space-x-2 overflow-x-auto">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                onClick={() => handleCategoryFilter('all')}
                className="whitespace-nowrap"
              >
                All
              </Button>
              <Button
                variant={selectedCategory === 'restaurant' ? 'default' : 'outline'}
                onClick={() => handleCategoryFilter('restaurant')}
                className="whitespace-nowrap"
              >
                Restaurants
              </Button>
              <Button
                variant={selectedCategory === 'hotel' ? 'default' : 'outline'}
                onClick={() => handleCategoryFilter('hotel')}
                className="whitespace-nowrap"
              >
                Hotels
              </Button>
              <Button
                variant={selectedCategory === 'cafe' ? 'default' : 'outline'}
                onClick={() => handleCategoryFilter('cafe')}
                className="whitespace-nowrap"
              >
                Cafes
              </Button>
              <Button
                variant={selectedCategory === 'bar' ? 'default' : 'outline'}
                onClick={() => handleCategoryFilter('bar')}
                className="whitespace-nowrap"
              >
                Bars
              </Button>
            </div>
          </div>

          {/* Nearby Places Section */}
          <div className="bg-white px-4 py-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Nearby Places {!isSearching && `(${getFilteredLocations().length})`}
            </h2>
            {renderLocationSearchResults()}
          </div>
        </div>
      );
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
          {/* Back button - only show when searching */}
          {isSearching && (
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
              placeholder={searchType === 'locations' ? 'Search for places (e.g., pizza, sushi, coffee)' : 'Search for users'}
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
          {!isSearching && (
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
