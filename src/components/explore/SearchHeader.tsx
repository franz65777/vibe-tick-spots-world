
import { useState, useRef } from 'react';
import { Search, MapPin, Users, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import SearchSuggestions from './SearchSuggestions';
import SearchFilters from './SearchFilters';

type SearchMode = 'locations' | 'users';
type SortBy = 'proximity' | 'likes' | 'followers';

interface SearchHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchMode: SearchMode;
  setSearchMode: (mode: SearchMode) => void;
  sortBy: SortBy;
  setSortBy: (sort: SortBy) => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  onSearch: (e: React.FormEvent) => void;
  suggestions: string[];
  recentSearches: string[];
  onSuggestionClick: (suggestion: string) => void;
}

const SearchHeader = ({
  searchQuery,
  setSearchQuery,
  searchMode,
  setSearchMode,
  sortBy,
  setSortBy,
  showFilters,
  setShowFilters,
  showSuggestions,
  setShowSuggestions,
  onSearch,
  suggestions,
  recentSearches,
  onSuggestionClick
}: SearchHeaderProps) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-white/95 backdrop-blur-lg px-4 py-4 shadow-sm border-b border-gray-100">
      <div className="max-w-2xl mx-auto">
        {/* Search Mode Toggle */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
          <button
            onClick={() => setSearchMode('locations')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              searchMode === 'locations'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Locations
          </button>
          <button
            onClick={() => setSearchMode('users')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              searchMode === 'users'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Users className="w-4 h-4" />
            Users
          </button>
        </div>

        {/* Search Bar */}
        <form onSubmit={onSearch} className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder={searchMode === 'locations' ? 'Search for places, food, cafes...' : 'Search for users...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="pl-10 pr-12 h-12 bg-white border-gray-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-xl text-base"
            />
            {/* Only show filters button for locations */}
            {searchMode === 'locations' && (
              <Button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
            )}
            
            {/* Search Suggestions */}
            {showSuggestions && (
              <SearchSuggestions
                suggestions={suggestions}
                searchHistory={recentSearches}
                onSuggestionClick={onSuggestionClick}
              />
            )}
          </div>
        </form>

        {/* Filters - Only for locations */}
        {searchMode === 'locations' && (
          <SearchFilters
            sortBy={sortBy}
            onSortChange={setSortBy}
            showFilters={showFilters}
          />
        )}
      </div>
    </div>
  );
};

export default SearchHeader;
