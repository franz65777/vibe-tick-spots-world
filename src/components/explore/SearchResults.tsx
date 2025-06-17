
import { users, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Place } from '@/types/place';
import PlaceCard from '@/components/home/PlaceCard';
import { useNavigate } from 'react-router-dom';

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
  onMessageUser?: (userId: string) => void;
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
  onFollowUser,
  onMessageUser
}: SearchResultsProps) => {
  const navigate = useNavigate();

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
        <div className="text-center py-12 px-4">
          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">No locations found</p>
        </div>
      );
    }

    return (
      <div className="px-4 py-4 space-y-4">
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
              onSaveToggle={() => {}}
              onShare={() => onShare(place)}
              onComment={() => onComment(place)}
              isLiked={likedPlaces.has(place.id)}
              isSaved={false}
              cityName="Unknown"
            />
          ))}
        </div>
      </div>
    );
  }

  // Users search results
  if (filteredUsers.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
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
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Users</h3>
        <span className="text-sm text-gray-500">{filteredUsers.length} results</span>
      </div>
      
      <div className="space-y-3">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="border border-gray-200 hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div 
                  className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
                  onClick={() => navigate(`/profile/${user.id}`)}
                >
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-gray-100">
                    {user.avatar_url ? (
                      <img 
                        src={user.avatar_url} 
                        alt={user.username || 'User'} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <span className="text-lg font-bold text-gray-600">
                        {getInitials(user)}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="mb-3">
                      <h4 className="text-lg font-bold text-gray-900 mb-1">
                        {user.full_name || user.username || 'Unknown User'}
                      </h4>
                      {user.username && (
                        <p className="text-blue-600 text-sm font-medium">@{user.username}</p>
                      )}
                    </div>
                    
                    {user.bio && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{user.bio}</p>
                    )}
                    
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <div className="text-center">
                        <div className="font-semibold text-gray-900">{user.followers_count || 0}</div>
                        <div>followers</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-gray-900">{user.posts_count || 0}</div>
                        <div>posts</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 ml-4">
                  <Button
                    size="sm"
                    variant={user.is_following ? "outline" : "default"}
                    className={`px-4 py-2 rounded-full font-semibold ${
                      user.is_following 
                        ? 'border-gray-300 text-gray-700 hover:bg-gray-50' 
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onFollowUser(user.id);
                    }}
                  >
                    {user.is_following ? 'Following' : 'Follow'}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    className="px-4 py-2 rounded-full font-semibold border-blue-300 text-blue-700 hover:bg-blue-50"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (onMessageUser) {
                        onMessageUser(user.id);
                      }
                    }}
                  >
                    Message
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SearchResults;
