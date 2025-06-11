
import { MapPin, Users } from 'lucide-react';
import PlaceCard from '@/components/home/PlaceCard';
import UserCard from './UserCard';

interface Place {
  id: string;
  name: string;
  category: string;
  likes: number;
  friendsWhoSaved?: number | { name: string; avatar: string; }[];
  visitors: number | string[];
  isNew: boolean;
  coordinates: { lat: number; lng: number };
  image: string;
  addedBy?: string;
  addedDate: string;
  isFollowing?: boolean;
  popularity?: number;
  distance?: number;
  totalSaves: number;
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
    if (filteredLocations.length === 0) {
      return (
        <div className="text-center py-8">
          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">No places found</p>
        </div>
      );
    }

    return (
      <div className="px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Places</h3>
          <span className="text-sm text-gray-500">{filteredLocations.length} results</span>
        </div>
        
        <div className="space-y-4">
          {filteredLocations.map((place) => {
            // Convert place to the expected format
            const convertedPlace = {
              ...place,
              addedBy: {
                name: typeof place.addedBy === 'string' ? place.addedBy : 'Explorer',
                avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
                isFollowing: place.isFollowing || false
              },
              friendsWhoSaved: Array.isArray(place.friendsWhoSaved) ? place.friendsWhoSaved : [],
              visitors: Array.isArray(place.visitors) ? place.visitors : []
            };

            return (
              <PlaceCard
                key={place.id}
                place={convertedPlace}
                isLiked={likedPlaces.has(place.id)}
                onCardClick={() => onCardClick(place)}
                onLikeToggle={() => onLikeToggle(place.id)}
                onShare={() => onShare(place)}
                onComment={() => onComment(place)}
                cityName="Current City"
              />
            );
          })}
        </div>
      </div>
    );
  }

  // Users results
  if (filteredUsers.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600">No users found</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">People</h3>
        <span className="text-sm text-gray-500">{filteredUsers.length} results</span>
      </div>
      
      <div className="space-y-3">
        {filteredUsers.map((user) => (
          <UserCard key={user.id} user={user} />
        ))}
      </div>
    </div>
  );
};

export default SearchResults;
