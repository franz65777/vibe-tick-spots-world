
import React from 'react';
import PlaceCard from '@/components/home/PlaceCard';
import UserCard from './UserCard';
import { Place } from '@/types/place';
import { MapPin, Users, Search } from 'lucide-react';

interface SearchResultsProps {
  searchMode: 'locations' | 'users';
  sortBy: 'proximity' | 'likes' | 'followers';
  filteredLocations: Place[];
  filteredUsers: any[];
  isSearching: boolean;
  likedPlaces: Set<string>;
  onCardClick: (place: Place) => void;
  onLikeToggle: (placeId: string) => void;
  onShare: (place: Place) => void;
  onComment: (place: Place) => void;
  onUserClick: (user: any) => void;
  onFollowUser: (userId: string) => void;
  onMessageUser: (userId: string) => void;
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
  if (isSearching) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Searching...</span>
        </div>
      </div>
    );
  }

  const hasResults = searchMode === 'locations' ? filteredLocations.length > 0 : filteredUsers.length > 0;

  if (!hasResults) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          {searchMode === 'locations' ? (
            <MapPin className="w-8 h-8 text-gray-400" />
          ) : (
            <Users className="w-8 h-8 text-gray-400" />
          )}
        </div>
        <h3 className="font-semibold text-gray-900 mb-2">No results found</h3>
        <p className="text-gray-500 text-center text-sm">
          {searchMode === 'locations' 
            ? "Try searching for cafes, restaurants, or specific place names"
            : "Try searching for usernames or full names"
          }
        </p>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Results Header */}
      <div className="flex items-center justify-between mb-4 px-4 pt-4">
        <h3 className="font-semibold text-gray-900">
          {searchMode === 'locations' ? filteredLocations.length : filteredUsers.length} results found
        </h3>
        <div className="text-xs text-gray-500 capitalize">
          Sorted by {sortBy}
        </div>
      </div>

      {searchMode === 'locations' ? (
        <div className="px-2 space-y-3">
          {filteredLocations.map((place) => (
            <div key={place.id} className="w-full">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Mobile-optimized place card */}
                <div className="flex p-3 gap-3">
                  {/* Image */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-gray-100">
                      {place.image ? (
                        <img 
                          src={place.image} 
                          alt={place.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MapPin className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div 
                      className="cursor-pointer"
                      onClick={() => onCardClick(place)}
                    >
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate mb-1">
                        {place.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-500 capitalize mb-2">
                        {place.category}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          ❤️ {place.likes || 0}
                        </span>
                        {place.distance && (
                          <span>{place.distance}</span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => onLikeToggle(place.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          likedPlaces.has(place.id)
                            ? 'bg-red-50 text-red-600 border border-red-200'
                            : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {likedPlaces.has(place.id) ? '❤️ Liked' : '🤍 Like'}
                      </button>
                      <button
                        onClick={() => onShare(place)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors"
                      >
                        Share
                      </button>
                      <button
                        onClick={() => onComment(place)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors"
                      >
                        Comment
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 space-y-3">
          {filteredUsers.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onUserClick={onUserClick}
              onFollowUser={onFollowUser}
              onMessageUser={onMessageUser}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchResults;
