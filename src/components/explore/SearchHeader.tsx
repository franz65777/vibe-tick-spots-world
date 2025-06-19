
import { useState, useRef } from 'react';
import { Search, MapPin, Users, SlidersHorizontal, Clock, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import SearchSuggestions from './SearchSuggestions';
import SearchFilters from './SearchFilters';
import { useSearchHistory } from '@/hooks/useSearchHistory';

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
  const { searchHistory, addToSearchHistory, clearSearchHistory } = useSearchHistory();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      addToSearchHistory(searchQuery.trim(), searchMode);
      setShowSuggestions(false);
    }
  };

  const handleHistoryItemClick = (query: string) => {
    onSearchQueryChange(query);
    setShowSuggestions(false);
    addToSearchHistory(query, searchMode);
  };

  const filteredHistory = searchHistory.filter(item => item.search_type === searchMode);

  const suggestions = [
    ...(searchMode === 'locations' 
      ? ['coffee shops', 'restaurants', 'parks', 'museums', 'bars', 'cafes']
      : ['friends', 'photographers', 'travelers', 'locals']
    )
  ].filter(suggestion => 
    suggestion.toLowerCase().includes(searchQuery.toLowerCase()) && 
    suggestion.toLowerCase() !== searchQuery.toLowerCase()
  );

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
            
            {/* Search Suggestions and History */}
            {showSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 z-50 max-h-80 overflow-y-auto">
                {/* Search History */}
                {filteredHistory.length > 0 && (
                  <div className="p-3 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Clock className="w-4 h-4" />
                        Recent searches
                      </div>
                      <button
                        onClick={clearSearchHistory}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="space-y-1">
                      {filteredHistory.slice(0, 5).map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleHistoryItemClick(item.search_query)}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          {item.search_query}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {suggestions.length > 0 && (
                  <div className="p-3">
                    <div className="text-sm font-medium text-gray-700 mb-2">Suggestions</div>
                    <div className="space-y-1">
                      {suggestions.slice(0, 5).map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => handleHistoryItemClick(suggestion)}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {filteredHistory.length === 0 && suggestions.length === 0 && (
                  <div className="p-4 text-center text-sm text-gray-500">
                    Start typing to see suggestions
                  </div>
                )}
              </div>
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
