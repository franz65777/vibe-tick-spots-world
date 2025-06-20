
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
  onSearchQueryChange: (query: string) => void;
  searchMode: SearchMode;
  onSearchModeChange: (mode: SearchMode) => void;
  onClearSearch: () => void;
}

const SearchHeader = ({
  searchQuery,
  onSearchQueryChange,
  searchMode,
  onSearchModeChange,
  onClearSearch
}: SearchHeaderProps) => {
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className="bg-white/95 backdrop-blur-lg px-4 py-4 shadow-sm border-b border-gray-100">
      <div className="max-w-2xl mx-auto">
        {/* Search Mode Toggle */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
          <button
            onClick={() => onSearchModeChange('locations')}
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
            onClick={() => onSearchModeChange('users')}
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
        <form onSubmit={handleSearch} className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder={searchMode === 'locations' ? 'Search for places, food, cafes...' : 'Search for users...'}
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
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
                suggestions={[]}
                searchHistory={[]}
                onSuggestionClick={() => {}}
              />
            )}
          </div>
        </form>

        {/* Filters - Only for locations */}
        {searchMode === 'locations' && (
          <SearchFilters
            sortBy="proximity"
            onSortChange={() => {}}
            showFilters={showFilters}
          />
        )}
      </div>
    </div>
  );
};

export default SearchHeader;
