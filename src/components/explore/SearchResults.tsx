
import { Users, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Place } from '@/types/place';
import PlaceCard from '@/components/home/PlaceCard';

interface User {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  followers_count: number;
  following_count: number;
  posts_count: number;
  is_following?: boolean;
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
  onUserClick: (user: User) => void;
  onFollowUser: (userId: string) => void;
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
  onComment,
  onUserClick,
  onFollowUser
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
    if (filteredLocations.length === 0) {
      return (
        <div className="text-center py-12">
          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">No locations found</p>
        </div>
      );
    }

    return (
      <div className="px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Locations</h3>
          <span className="text-sm text-gray-500">{filteredLocations.length} results</span>
        </div>
        
        <div className="space-y-4">
          {filteredLocations.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              onCardClick={() => onCardClick(place)}
              onLikeToggle={() => onLikeToggle(place.id)}
              onSaveToggle={() => {}} // Add empty handler for now
              onShare={() => onShare(place)}
              onComment={() => onComment(place)}
              isLiked={likedPlaces.has(place.id)}
              isSaved={false} // Add default value
              cityName="Unknown" // Add default city name
            />
          ))}
        </div>
      </div>
    );
  }

  // Users search results
  if (filteredUsers.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600">No users found</p>
      </div>
    );
  }

  const getInitials = (user: User) => {
    if (user.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    if (user.full_name) {
      return user.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return 'U';
  };

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Users</h3>
        <span className="text-sm text-gray-500">{filteredUsers.length} results</span>
      </div>
      
      <div className="space-y-3">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div 
                  className="flex items-center gap-3 flex-1 cursor-pointer"
                  onClick={() => onUserClick(user)}
                >
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    {user.avatar_url ? (
                      <img 
                        src={user.avatar_url} 
                        alt={user.username || 'User'} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <span className="text-sm font-semibold text-gray-600">
                        {getInitials(user)}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">
                      {user.username || 'Unknown User'}
                    </h4>
                    {user.full_name && (
                      <p className="text-sm text-gray-600 truncate">{user.full_name}</p>
                    )}
                    {user.bio && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{user.bio}</p>
                    )}
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>{user.followers_count || 0} followers</span>
                      <span>{user.posts_count || 0} posts</span>
                    </div>
                  </div>
                </div>
                
                <Button
                  size="sm"
                  variant={user.is_following ? "outline" : "default"}
                  className="ml-3"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFollowUser(user.id);
                  }}
                >
                  {user.is_following ? 'Following' : 'Follow'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SearchResults;
