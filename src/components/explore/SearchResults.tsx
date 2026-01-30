import React from 'react';
import { Users, MapPin } from 'lucide-react';
import CompactLocationCard from './CompactLocationCard';
import UserCard from './UserCard';
import { Place } from '@/types/place';
import SearchResultsSkeleton from '@/components/common/skeletons/SearchResultsSkeleton';

type SortBy = 'proximity' | 'likes' | 'saves' | 'following' | 'recent';

interface SearchResultsProps {
  searchMode: 'locations' | 'users';
  sortBy: SortBy;
  filteredLocations: Place[];
  filteredUsers: any[];
  isSearching: boolean;
  onCardClick: (place: Place) => void;
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
  onCardClick,
  onUserClick,
  onFollowUser,
  onMessageUser
}: SearchResultsProps) => {
  if (isSearching) {
    return <SearchResultsSkeleton mode={searchMode} />;
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
    <div className="pb-4">
      <div className="flex items-center justify-between mb-3 px-4">
        <h3 className="font-semibold text-gray-900 text-sm">
          {searchMode === 'locations' ? filteredLocations.length : filteredUsers.length} results
        </h3>
        <div className="text-xs text-gray-500 capitalize">
          {sortBy}
        </div>
      </div>

      {searchMode === 'locations' ? (
        <div className="grid grid-cols-2 gap-2 px-2">
          {filteredLocations.map((place) => (
            <CompactLocationCard
              key={place.id}
              place={place}
              onCardClick={onCardClick}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3 px-4">
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
