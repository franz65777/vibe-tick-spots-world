
import { useState } from 'react';
import { Search, MapPin, User, ArrowLeft, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ExplorePage = () => {
  console.log('ExplorePage component rendering...');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'locations' | 'users'>('locations');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Sample data for locations
  const locations = [
    {
      id: 1,
      name: "Golden Gate Cafe",
      location: "San Francisco, CA",
      description: "Best coffee in the city!",
      likes: 128,
      category: "restaurant",
      distance: 0.8,
      image: "/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png"
    },
    {
      id: 2,
      name: "Ocean View Hotel",
      location: "Monterey, CA",
      description: "Stunning ocean views",
      likes: 89,
      category: "hotel",
      distance: 1.2,
      image: "/lovable-uploads/5bb15f7b-b3ba-4eae-88b1-7fa789eb67c4.png"
    },
    {
      id: 3,
      name: "The Rooftop Bar",
      location: "Los Angeles, CA",
      description: "Amazing cocktails with city view",
      likes: 156,
      category: "bar",
      distance: 0.5,
      image: "/lovable-uploads/5df0be70-7240-4958-ba55-5921ab3785e9.png"
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
    { name: "Restaurants", image: "/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png", category: "restaurant" },
    { name: "Hotels", image: "/lovable-uploads/5bb15f7b-b3ba-4eae-88b1-7fa789eb67c4.png", category: "hotel" },
    { name: "Bars", image: "/lovable-uploads/5df0be70-7240-4958-ba55-5921ab3785e9.png", category: "bar" },
    { name: "Museums", image: "/lovable-uploads/8a9fd2cf-e687-48ee-a40f-3dd4b19ba4ff.png", category: "museum" },
    { name: "Shops", image: "/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png", category: "shop" },
    { name: "Experiences", image: "/lovable-uploads/5bb15f7b-b3ba-4eae-88b1-7fa789eb67c4.png", category: "experience" }
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
    setSelectedCategory('');
  };

  const goBack = () => {
    if (selectedCategory) {
      setSelectedCategory('');
      setIsSearching(false);
      setSearchResults([]);
    } else {
      clearSearch();
    }
  };

  const renderSearchResults = () => {
    if (searchResults.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <Search className="w-16 h-16 text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg">No results found</p>
        </div>
      );
    }

    if (searchType === 'locations') {
      return (
        <div className="space-y-4 p-4">
          {searchResults.map((location) => (
            <div key={location.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <img
                src={location.image}
                alt={location.name}
                className="w-full h-48 object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder.svg';
                }}
              />
              <div className="p-4">
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">{location.name}</p>
                    <p className="text-sm text-gray-600">{location.location}</p>
                  </div>
                </div>
                <p className="text-gray-700 mb-3">{location.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-blue-500 font-semibold">{location.likes} likes</span>
                  </div>
                  <span className="text-sm text-gray-500">{location.distance} mi away</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    } else {
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
    }
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
    if (selectedCategory || isSearching) {
      return renderSearchResults();
    }
    
    if (searchType === 'users' && !isSearching) {
      return renderUserSearchHistory();
    }
    
    return renderCategoryGrid();
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Search Header */}
      <div className="bg-white p-4 border-b">
        <div className="flex items-center gap-3">
          {/* Back button */}
          {(isSearching || selectedCategory || (searchType === 'users' && !isSearching)) && (
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
          {!isSearching && !selectedCategory && (
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

      {/* Category Title */}
      {selectedCategory && (
        <div className="bg-white px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold capitalize">{selectedCategory} Results</h1>
            <span className="text-gray-500">{searchResults.length} found</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {renderMainContent()}
      </div>
    </div>
  );
};

export default ExplorePage;
