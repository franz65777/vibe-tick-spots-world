
import { useState, useEffect } from 'react';
import { Search, MapPin, User, ArrowLeft, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { searchPlaces, searchUsers, getNearbyPlaces, SearchPlace, SearchUser } from '@/services/searchService';
import PlaceCard from '@/components/home/PlaceCard';
import ShareModal from '@/components/home/ShareModal';
import CommentModal from '@/components/home/CommentModal';
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
  const [placeResults, setPlaceResults] = useState<SearchPlace[]>([]);
  const [userResults, setUserResults] = useState<SearchUser[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<SearchPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [likedPlaces, setLikedPlaces] = useState<Set<string>>(new Set());
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [selectedPlaceToShare, setSelectedPlaceToShare] = useState<Place | null>(null);
  const [selectedPlaceToComment, setSelectedPlaceToComment] = useState<Place | null>(null);
  const [isLocationDetailOpen, setIsLocationDetailOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Place | null>(null);

  // User's current location (San Francisco as default)
  const userLocation = { lat: 37.7749, lng: -122.4194 };

  // Load nearby places on component mount
  useEffect(() => {
    const loadNearbyPlaces = async () => {
      try {
        const places = await getNearbyPlaces(userLocation.lat, userLocation.lng);
        setNearbyPlaces(places);
      } catch (error) {
        console.error('Error loading nearby places:', error);
      }
    };
    
    loadNearbyPlaces();
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim() === '') {
      setIsSearching(false);
      setPlaceResults([]);
      setUserResults([]);
      return;
    }

    setIsSearching(true);
    setLoading(true);

    try {
      if (searchType === 'locations') {
        const results = await searchPlaces(query, selectedCategory);
        setPlaceResults(results);
      } else {
        const results = await searchUsers(query);
        setUserResults(results);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryFilter = async (category: string) => {
    setSelectedCategory(category);
    
    if (searchQuery.trim() !== '') {
      setLoading(true);
      try {
        const results = await searchPlaces(searchQuery, category);
        setPlaceResults(results);
      } catch (error) {
        console.error('Filter error:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    setPlaceResults([]);
    setUserResults([]);
  };

  const goBack = () => {
    clearSearch();
  };

  // Convert SearchPlace to Place format for compatibility
  const convertSearchPlaceToPlace = (searchPlace: SearchPlace): Place => ({
    id: searchPlace.id,
    name: searchPlace.name,
    category: searchPlace.category,
    likes: Math.floor(Math.random() * 50) + 10, // Mock likes
    coordinates: searchPlace.coordinates,
    visitors: [],
    isNew: Math.random() > 0.7, // 30% chance of being new
    image: searchPlace.image,
    friendsWhoSaved: Math.random() > 0.5 ? [
      { name: 'Alex', avatar: '1649972904349-6e44c42644a7' },
      { name: 'Emma', avatar: '1581091226825-a6a2a5aee158' }
    ] : undefined
  });

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
    setSelectedPlaceToComment(place);
    setIsCommentModalOpen(true);
  };

  const handleCommentSubmit = (text: string, place: Place) => {
    console.log('Adding comment:', text, 'to place:', place.name);
    // TODO: Implement actual comment submission logic
  };

  const renderPlaceResults = () => {
    const placesToShow = isSearching ? placeResults : nearbyPlaces;
    const filteredPlaces = selectedCategory === 'all' 
      ? placesToShow 
      : placesToShow.filter(place => place.category === selectedCategory);
    
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      );
    }

    if (filteredPlaces.length === 0 && isSearching) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <Search className="w-16 h-16 text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg">No places found</p>
          <p className="text-gray-500 text-sm">Try different keywords or categories</p>
        </div>
      );
    }

    return (
      <div className="space-y-3 px-4 pb-4">
        {filteredPlaces.map((searchPlace) => {
          const place = convertSearchPlaceToPlace(searchPlace);
          return (
            <PlaceCard
              key={place.id}
              place={place}
              isLiked={likedPlaces.has(place.id)}
              onCardClick={handleCardClick}
              onLikeToggle={handleLikeToggle}
              onShare={handleShare}
              onComment={handleComment}
            />
          );
        })}
      </div>
    );
  };

  const renderUserResults = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      );
    }

    if (userResults.length === 0 && isSearching) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <Search className="w-16 h-16 text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg">No users found</p>
          <p className="text-gray-500 text-sm">Try different usernames or names</p>
        </div>
      );
    }

    const usersToShow = isSearching ? userResults : [];

    return (
      <div className="space-y-3 p-4">
        {usersToShow.map((user) => (
          <div key={user.id} className="flex items-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center mr-4">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.fullName}
                  className="w-full h-full rounded-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-white font-semibold text-sm">
                  {user.fullName[0]?.toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">{user.fullName}</p>
                {user.isVerified && (
                  <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600">@{user.username}</p>
              {user.bio && (
                <p className="text-xs text-gray-500 mt-1">{user.bio}</p>
              )}
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900">{user.followersCount.toLocaleString()}</p>
              <p className="text-xs text-gray-500">followers</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Search Header - Fixed height */}
      <div className="bg-white p-4 border-b border-gray-100 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Back button */}
          {isSearching && (
            <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={searchType === 'locations' ? 'Search for places, restaurants, cafes...' : 'Search for users'}
              className="pl-10 pr-10 bg-gray-100 border-none rounded-full h-10"
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
            <div className="flex bg-gray-200 rounded-full p-1 shrink-0">
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

      {/* Category Filter Buttons - Fixed height for locations only */}
      {searchType === 'locations' && (
        <div className="bg-white px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex space-x-3 overflow-x-auto pb-1">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              onClick={() => handleCategoryFilter('all')}
              className="whitespace-nowrap rounded-full"
              size="sm"
            >
              All
            </Button>
            <Button
              variant={selectedCategory === 'restaurant' ? 'default' : 'outline'}
              onClick={() => handleCategoryFilter('restaurant')}
              className="whitespace-nowrap rounded-full"
              size="sm"
            >
              Restaurants
            </Button>
            <Button
              variant={selectedCategory === 'cafe' ? 'default' : 'outline'}
              onClick={() => handleCategoryFilter('cafe')}
              className="whitespace-nowrap rounded-full"
              size="sm"
            >
              Cafes
            </Button>
            <Button
              variant={selectedCategory === 'bar' ? 'default' : 'outline'}
              onClick={() => handleCategoryFilter('bar')}
              className="whitespace-nowrap rounded-full"
              size="sm"
            >
              Bars
            </Button>
            <Button
              variant={selectedCategory === 'landmark' ? 'default' : 'outline'}
              onClick={() => handleCategoryFilter('landmark')}
              className="whitespace-nowrap rounded-full"
              size="sm"
            >
              Landmarks
            </Button>
            <Button
              variant={selectedCategory === 'museum' ? 'default' : 'outline'}
              onClick={() => handleCategoryFilter('museum')}
              className="whitespace-nowrap rounded-full"
              size="sm"
            >
              Museums
            </Button>
          </div>
        </div>
      )}

      {/* Scrollable Content Area - Takes remaining space */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {searchType === 'locations' ? (
            <div className="space-y-4">
              {/* Places Section Header */}
              <div className="px-4 pt-4">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {isSearching ? 'Search Results' : 'Nearby Places'}
                </h2>
              </div>

              {/* Places List */}
              {renderPlaceResults()}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="px-4 pt-4">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {isSearching ? 'Users' : 'Search for users above'}
                </h2>
              </div>
              {renderUserResults()}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Modals */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        item={selectedPlaceToShare}
        itemType="place"
        onShare={handleShareComplete}
      />

      <CommentModal
        isOpen={isCommentModalOpen}
        onClose={() => setIsCommentModalOpen(false)}
        place={selectedPlaceToComment}
        onCommentSubmit={handleCommentSubmit}
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
