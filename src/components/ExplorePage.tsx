import { useState, useMemo } from 'react';
import { Search, Filter, MapPin, Star, Users, Clock, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PlaceCard from '@/components/home/PlaceCard';
import ShareModal from '@/components/home/ShareModal';
import CommentModal from '@/components/home/CommentModal';
import LocationDetailSheet from '@/components/LocationDetailSheet';

interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
}

// Updated Place interface to match the one in PlaceCard
interface Place {
  id: string;
  name: string;
  category: string;
  image: string;
  likes: number;
  visitors: string[];
  isNew: boolean;
  coordinates: { lat: number; lng: number };
  rating: number;
  reviewCount: number;
  tags: string[];
  openingHours: string;
  friendsWhoSaved?: { name: string; avatar: string }[];
  addedBy?: string;
  addedDate?: string;
  isFollowing?: boolean;
  popularity?: number;
}

const categories: Category[] = [
  { id: 'all', name: 'All', icon: <MapPin /> },
  { id: 'restaurants', name: 'Restaurants', icon: <Star /> },
  { id: 'cafes', name: 'Cafes', icon: <Clock /> },
  { id: 'bars', name: 'Bars', icon: <Users /> },
];

const sortOptions = [
  { label: 'Popularity', value: 'popularity' },
  { label: 'Rating', value: 'rating' },
  { label: 'Newest', value: 'newest' },
];

const filterOptions = [
  { id: 'open_now', label: 'Open Now', icon: <Clock className="w-4 h-4" /> },
  { id: 'top_rated', label: 'Top Rated', icon: <Star className="w-4 h-4" /> },
  { id: 'has_deals', label: 'Has Deals', icon: <Star className="w-4 h-4" /> },
];

const demoPlaces: Place[] = [
  {
    id: '1',
    name: 'The Cozy Corner Café',
    category: 'restaurants',
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=300&fit=crop',
    rating: 4.5,
    reviewCount: 123,
    tags: ['cozy', 'coffee', 'pastries'],
    openingHours: '8:00 AM - 8:00 PM',
    coordinates: { lat: 37.7749, lng: -122.4194 },
    likes: 24,
    visitors: ['user1', 'user2'],
    isNew: false,
    friendsWhoSaved: [
      { name: 'Sarah', avatar: 'photo-1494790108755-2616b5a5c75b' },
      { name: 'Mike', avatar: 'photo-1507003211169-0a1dd7228f2d' }
    ],
    addedBy: 'user1',
    addedDate: '2024-05-25',
    isFollowing: true,
    popularity: 85
  },
  {
    id: '2',
    name: 'Sunset View Restaurant',
    category: 'restaurants',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
    rating: 4.2,
    reviewCount: 87,
    tags: ['seafood', 'sunset', 'romantic'],
    openingHours: '5:00 PM - 10:00 PM',
    coordinates: { lat: 37.7849, lng: -122.4094 },
    likes: 18,
    visitors: ['user3'],
    isNew: true,
    addedBy: 'user2',
    addedDate: '2024-06-01',
    isFollowing: true,
    popularity: 92
  },
  {
    id: '3',
    name: 'Grand Plaza Hotel',
    category: 'cafes',
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=300&fit=crop',
    rating: 4.8,
    reviewCount: 234,
    tags: ['luxury', 'views', 'cocktails'],
    openingHours: 'Open 24 hours',
    coordinates: { lat: 37.7949, lng: -122.4294 },
    likes: 45,
    visitors: ['user4', 'user5'],
    isNew: false,
    friendsWhoSaved: [
      { name: 'Emma', avatar: 'photo-1438761681033-6461ffad8d80' }
    ],
    addedBy: 'user5',
    addedDate: '2024-05-15',
    isFollowing: false,
    popularity: 96
  },
  {
    id: '4',
    name: 'The Local Bar',
    category: 'bars',
    image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=300&fit=crop',
    rating: 4.0,
    reviewCount: 56,
    tags: ['local', 'drinks', 'live music'],
    openingHours: '6:00 PM - 2:00 AM',
    coordinates: { lat: 37.8049, lng: -122.4394 },
    likes: 28,
    visitors: ['user6'],
    isNew: false,
    addedBy: 'user3',
    addedDate: '2024-05-20',
    isFollowing: true,
    popularity: 82
  },
];

const ExplorePage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('popularity');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [likedPlaces, setLikedPlaces] = useState(new Set());
  
  // Add modal states for share, comment, and location detail
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [isLocationDetailOpen, setIsLocationDetailOpen] = useState(false);
  const [sharePlace, setSharePlace] = useState<Place | null>(null);
  const [commentPlace, setCommentPlace] = useState<Place | null>(null);
  const [locationDetailPlace, setLocationDetailPlace] = useState<Place | null>(null);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  const handleCategoryFilter = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const toggleFilter = (filterId: string) => {
    setActiveFilters((prevFilters) =>
      prevFilters.includes(filterId)
        ? prevFilters.filter((id) => id !== filterId)
        : [...prevFilters, filterId]
    );
  };

  const clearFilters = () => {
    setActiveFilters([]);
  };

  const handleLikeToggle = (placeId: string) => {
    setLikedPlaces((prev) => {
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
    console.log('Share place:', place.name);
    setSharePlace(place);
    setIsShareModalOpen(true);
  };

  const handleComment = (place: Place) => {
    console.log('Comment on place:', place.name);
    setCommentPlace(place);
    setIsCommentModalOpen(true);
  };

  const handleShareSubmit = (friendIds: string[], place: Place) => {
    console.log('Sharing place:', place.name, 'with friends:', friendIds);
    setIsShareModalOpen(false);
    setSharePlace(null);
    // TODO: Implement actual sharing logic
  };

  const handleCommentSubmit = (text: string, place: Place) => {
    console.log('Adding comment:', text, 'to place:', place.name);
    setIsCommentModalOpen(false);
    setCommentPlace(null);
    // TODO: Implement actual comment submission logic
  };

  const handlePlaceClick = (place: Place) => {
    console.log('Place card clicked:', place.name, '- opening location detail');
    setLocationDetailPlace(place);
    setIsLocationDetailOpen(true);
  };

  const filteredPlaces = useMemo(() => {
    let filtered = demoPlaces;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((place) => place.category === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter((place) =>
        place.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (activeFilters.includes('open_now')) {
      filtered = filtered.filter((place) => place.openingHours !== 'Closed');
    }

    if (activeFilters.includes('top_rated')) {
      filtered = filtered.filter((place) => place.rating >= 4.5);
    }

    return filtered;
  }, [selectedCategory, searchQuery, activeFilters]);

  return (
    <div className="flex flex-col h-full bg-gray-50 pt-16">
      {/* Search Header */}
      <div className="bg-white p-5 sm:p-4 border-b border-gray-100 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-4 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 sm:w-4 sm:h-4" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search for places..."
              className="pl-12 sm:pl-10 pr-12 sm:pr-10 bg-gray-100 border-none rounded-full h-12 sm:h-10 text-base sm:text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearch('')}
                className="absolute right-4 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 w-5 h-5 sm:w-4 sm:h-4"
              >
                <X className="w-full h-full" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            size="default"
            onClick={() => setShowFilters(!showFilters)}
            className="w-12 h-12 sm:w-10 sm:h-10 rounded-full p-0 border-gray-200"
          >
            <Filter className="w-5 h-5 sm:w-4 sm:h-4" />
          </Button>
        </div>

        {/* Categories */}
        <div className="flex gap-3 sm:gap-2 mt-4 overflow-x-auto pb-2">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              onClick={() => handleCategoryFilter(category.id)}
              className="whitespace-nowrap rounded-full py-3 px-5 sm:py-2 sm:px-4 text-base sm:text-sm min-h-[48px] sm:min-h-[36px]"
              size="default"
            >
              <span className="mr-2">{category.icon}</span>
              {category.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border-b border-gray-100 p-5 sm:p-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg sm:text-base font-semibold mb-3 sm:mb-2">Sort by</h3>
              <div className="flex flex-wrap gap-3 sm:gap-2">
                {sortOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={sortBy === option.value ? 'default' : 'outline'}
                    onClick={() => setSortBy(option.value)}
                    size="default"
                    className="py-3 px-4 sm:py-2 sm:px-3 text-base sm:text-sm min-h-[48px] sm:min-h-[36px]"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg sm:text-base font-semibold mb-3 sm:mb-2">Filters</h3>
              <div className="flex flex-wrap gap-3 sm:gap-2">
                {filterOptions.map((filter) => (
                  <Button
                    key={filter.id}
                    variant={activeFilters.includes(filter.id) ? 'default' : 'outline'}
                    onClick={() => toggleFilter(filter.id)}
                    size="default"
                    className="flex items-center gap-2 py-3 px-4 sm:py-2 sm:px-3 text-base sm:text-sm min-h-[48px] sm:min-h-[36px]"
                  >
                    {filter.icon}
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="bg-white px-5 py-3 sm:px-4 sm:py-2 border-b border-gray-100">
          <div className="flex items-center gap-3 sm:gap-2 flex-wrap">
            <span className="text-base sm:text-sm font-medium text-gray-600">Active filters:</span>
            {activeFilters.map((filterId) => {
              const filter = filterOptions.find(f => f.id === filterId);
              return (
                <Badge 
                  key={filterId} 
                  variant="secondary" 
                  className="flex items-center gap-2 sm:gap-1 cursor-pointer hover:bg-gray-200 py-2 px-3 sm:py-1 sm:px-2 text-base sm:text-sm min-h-[36px] sm:min-h-[28px]"
                  onClick={() => toggleFilter(filterId)}
                >
                  {filter?.icon}
                  {filter?.label}
                  <X className="w-4 h-4 sm:w-3 sm:h-3" />
                </Badge>
              );
            })}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-blue-600 hover:text-blue-800 p-2 text-base sm:text-sm min-h-[36px] sm:min-h-[28px]"
            >
              Clear all
            </Button>
          </div>
        </div>
      )}

      {/* Results Header */}
      <div className="bg-white px-5 py-3 sm:px-4 sm:py-2 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <p className="text-base sm:text-sm text-gray-600">
            {filteredPlaces.length} places found
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-800 p-2 text-base sm:text-sm min-h-[36px] sm:min-h-[28px]"
          >
            View on map
          </Button>
        </div>
      </div>

      {/* Places Grid */}
      <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-4 sm:py-3 pb-20">
        {filteredPlaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-12 text-center">
            <div className="w-16 h-16 sm:w-12 sm:h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 sm:w-6 sm:h-6 text-gray-400" />
            </div>
            <h3 className="text-xl sm:text-lg font-semibold text-gray-900 mb-2">No places found</h3>
            <p className="text-gray-600 text-base sm:text-sm max-w-sm">
              Try adjusting your search terms or filters to find what you're looking for.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-4">
            {filteredPlaces.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                isLiked={likedPlaces.has(place.id)}
                onCardClick={handlePlaceClick}
                onLikeToggle={handleLikeToggle}
                onShare={handleShare}
                onComment={handleComment}
                cityName="Global"
              />
            ))}
          </div>
        )}
      </div>

      {/* Share Modal */}
      {isShareModalOpen && sharePlace && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => {
            setIsShareModalOpen(false);
            setSharePlace(null);
          }}
          item={sharePlace}
          itemType="place"
          onShare={(friendIds) => handleShareSubmit(friendIds, sharePlace)}
        />
      )}

      {/* Comment Modal */}
      {isCommentModalOpen && commentPlace && (
        <CommentModal
          isOpen={isCommentModalOpen}
          onClose={() => {
            setIsCommentModalOpen(false);
            setCommentPlace(null);
          }}
          place={commentPlace}
          onCommentSubmit={(text) => handleCommentSubmit(text, commentPlace)}
        />
      )}

      {/* Location Detail Modal */}
      {isLocationDetailOpen && locationDetailPlace && (
        <LocationDetailSheet
          isOpen={isLocationDetailOpen}
          onClose={() => {
            setIsLocationDetailOpen(false);
            setLocationDetailPlace(null);
          }}
          location={{
            id: locationDetailPlace.id,
            name: locationDetailPlace.name,
            category: locationDetailPlace.category,
            image: locationDetailPlace.image,
            rating: locationDetailPlace.rating || 4.5,
            reviewCount: locationDetailPlace.reviewCount || 0,
            coordinates: locationDetailPlace.coordinates,
            address: `Global Location`,
            openingHours: locationDetailPlace.openingHours || 'Hours not available',
            priceRange: '$$',
            description: `Experience ${locationDetailPlace.name}, a wonderful ${locationDetailPlace.category} with ${locationDetailPlace.likes} likes from the community.`,
            tags: locationDetailPlace.tags || []
          }}
        />
      )}
    </div>
  );
};

export default ExplorePage;
