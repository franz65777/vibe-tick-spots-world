
import { MapPin, Users } from 'lucide-react';
import PlaceCard from '@/components/home/PlaceCard';
import { Button } from '@/components/ui/button';
import { Place } from '@/types/place';

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

interface SearchResultsProps {
  searchMode: 'locations' | 'users';
  sortBy: 'proximity' | 'likes' | 'followers';
  filteredLocations: Place[];
  filteredUsers: User[];
  isSearching: boolean;
  likedPlaces: Set<string>;
  onCardClick: (place: Place) => void;
  onLikeToggle: (placeId: string) => void;
  onShare: (place: Place) => void;
  onComment: (place: Place) => void;
}

const SearchResults = ({
  searchMode,
  sortBy,
  filteredLocations,
  filteredUsers,
  isSearching,
  likedPlaces,
  onCardClick,
  onLikeToggle,
  onShare,
  onComment
}: SearchResultsProps) => {
  if (isSearching) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Searching...</span>
        </div>
      </div>
    );
  }

  if (searchMode === 'locations') {
    if (filteredLocations.length > 0) {
      return (
        <div className="px-4 py-6">
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
              <PlaceCard
                key={place.id}
                place={place}
                isLiked={likedPlaces.has(place.id)}
                onCardClick={() => onCardClick(place)}
                onLikeToggle={() => onLikeToggle(place.id)}
                onShare={() => onShare(place)}
                onComment={() => onComment(place)}
                cityName="Current City"
              />
            ))}
          </div>
        </div>
      );
    } else {
      return (
        <div className="text-center py-12">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3 mx-auto">
            <MapPin className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No locations found</h3>
          <p className="text-gray-600 text-sm">
            Try searching for something else or check your spelling
          </p>
        </div>
      );
    }
  } else {
    if (filteredUsers.length > 0) {
      return (
        <div className="px-4 py-6">
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
        </div>
      );
    } else {
      return (
        <div className="text-center py-12">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3 mx-auto">
            <Users className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No users found</h3>
          <p className="text-gray-600 text-sm">
            Try searching for something else or check your spelling
          </p>
        </div>
      );
    }
  }
};

export default SearchResults;
