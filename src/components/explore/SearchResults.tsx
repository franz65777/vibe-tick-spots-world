
import React from 'react';
import UserCard from './UserCard';
import { Place } from '@/types/place';
import { MapPin, Users, Search, Heart, MessageCircle, Share2, Navigation, Star, Clock, Bookmark } from 'lucide-react';

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
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-center">
            <div className="font-medium text-gray-900 mb-1">Searching...</div>
            <div className="text-sm text-gray-500">Finding the best {searchMode} for you</div>
          </div>
        </div>
      </div>
    );
  }

  const hasResults = searchMode === 'locations' ? filteredLocations.length > 0 : filteredUsers.length > 0;

  if (!hasResults) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl flex items-center justify-center mb-6">
          {searchMode === 'locations' ? (
            <MapPin className="w-10 h-10 text-blue-600" />
          ) : (
            <Users className="w-10 h-10 text-blue-600" />
          )}
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-3">No results found</h3>
        <p className="text-gray-500 text-center leading-relaxed max-w-sm">
          {searchMode === 'locations' 
            ? "We couldn't find any places matching your search. Try different keywords or explore popular locations nearby."
            : "No users found with that name. Try searching with different terms or browse recommended users."
          }
        </p>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Results Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 px-4 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Search className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">
                {searchMode === 'locations' ? filteredLocations.length : filteredUsers.length} results
              </div>
              <div className="text-xs text-gray-500 capitalize">
                Sorted by {sortBy === 'proximity' ? 'distance' : sortBy}
              </div>
            </div>
          </div>
          <div className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full font-medium">
            {searchMode === 'locations' ? 'Places' : 'People'}
          </div>
        </div>
      </div>

      {searchMode === 'locations' ? (
        <div className="px-4 pt-4 pb-4">
          <div className="space-y-6">
            {filteredLocations.map((place) => (
              <div 
                key={place.id} 
                className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300"
              >
                {/* Image section */}
                <div className="relative">
                  <div 
                    className="aspect-[16/10] bg-gradient-to-br from-blue-100 to-indigo-100 cursor-pointer"
                    onClick={() => onCardClick(place)}
                  >
                    {place.image ? (
                      <img 
                        src={place.image} 
                        alt={place.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-16 h-16 bg-white/90 rounded-2xl flex items-center justify-center shadow-lg">
                          <MapPin className="w-8 h-8 text-blue-600" />
                        </div>
                      </div>
                    )}
                    
                    {/* Category badge */}
                    <div className="absolute top-4 left-4">
                      <div className="bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium text-gray-700 capitalize shadow-sm">
                        {place.category}
                      </div>
                    </div>

                    {/* Save button */}
                    <div className="absolute top-4 right-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle save functionality
                        }}
                        className="w-10 h-10 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-colors"
                      >
                        <Bookmark className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Content section */}
                <div className="p-6">
                  <div className="mb-4">
                    <h3 className="font-bold text-xl text-gray-900 mb-2 leading-tight">
                      {place.name}
                    </h3>
                    
                    {/* Quick stats row */}
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Heart className="w-4 h-4 text-red-400" />
                        <span className="font-medium">{place.likes}</span>
                      </div>
                      
                      {place.distance && (
                        <div className="flex items-center gap-1">
                          <Navigation className="w-4 h-4 text-blue-400" />
                          <span className="font-medium">{place.distance}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-purple-400" />
                        <span className="font-medium">
                          {Array.isArray(place.visitors) ? place.visitors.length : place.visitors || 0}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-amber-400" />
                        <span className="font-medium">4.{Math.floor(Math.random() * 9) + 1}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLikeToggle(place.id);
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                        likedPlaces.has(place.id)
                          ? 'bg-red-500 text-white shadow-lg shadow-red-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${likedPlaces.has(place.id) ? 'fill-current' : ''}`} />
                      {likedPlaces.has(place.id) ? 'Liked' : 'Like'}
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onComment(place);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-200"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Comment
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onShare(place);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-200"
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-4 pt-4 pb-4 space-y-3">
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
