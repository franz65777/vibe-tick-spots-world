
import { useState, useRef } from 'react';
import { Search, MapPin, Users, X, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import SmartAutocomplete from './SmartAutocomplete';
import SearchFilters from './SearchFilters';

type SearchMode = 'locations' | 'users';
type SortBy = 'proximity' | 'likes' | 'saves' | 'following' | 'recent';

interface EnhancedSearchHeaderProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  searchMode: SearchMode;
  onSearchModeChange: (mode: SearchMode) => void;
  onClearSearch: () => void;
  sortBy: SortBy;
  onSortChange: (sortBy: SortBy) => void;
  filters: string[];
  onFiltersChange: (filters: string[]) => void;
}

const EnhancedSearchHeader = ({
  searchQuery,
  onSearchQueryChange,
  searchMode,
  onSearchModeChange,
  onClearSearch,
  sortBy,
  onSortChange,
  filters,
  onFiltersChange
}: EnhancedSearchHeaderProps) => {
  const [showFilters, setShowFilters] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleInputFocus = () => {
    setShowAutocomplete(true);
  };

  const handleInputBlur = () => {
    // Delay hiding to allow clicking on suggestions
    setTimeout(() => setShowAutocomplete(false), 200);
  };

  const handleAutocompleteSelect = (result: any) => {
    onSearchQueryChange(result.title);
    setShowAutocomplete(false);
    searchInputRef.current?.blur();
  };

  const handleRecentSelect = (search: string) => {
    onSearchQueryChange(search);
    setShowAutocomplete(false);
  };

  const clearSearch = () => {
    onSearchQueryChange('');
    onClearSearch();
    searchInputRef.current?.focus();
  };

  return (
    <div className="bg-white/95 backdrop-blur-lg px-4 py-4 shadow-sm border-b border-gray-100 sticky top-16 z-20">
      <div className="max-w-2xl mx-auto">
        {/* Search Mode Toggle */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
          <button 
            onClick={() => onSearchModeChange('locations')} 
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all min-h-[44px] ${
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
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all min-h-[44px] ${
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
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              className="pl-10 pr-20 h-12 bg-white border-gray-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-xl text-base"
            />
            
            {/* Clear button */}
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="absolute right-12 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            
            {/* Settings button for locations (more intuitive than sliders) */}
            {searchMode === 'locations' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
                aria-label="Search settings and filters"
              >
                <Settings className="w-4 h-4" />
              </Button>
            )}
            
            {/* Smart Autocomplete */}
            <SmartAutocomplete
              query={searchQuery}
              searchMode={searchMode}
              onResultSelect={handleAutocompleteSelect}
              onRecentSelect={handleRecentSelect}
              visible={showAutocomplete}
            />
          </div>
        </form>

        {/* Filters - Only for locations */}
        {searchMode === 'locations' && (
          <SearchFilters
            sortBy={sortBy}
            onSortChange={onSortChange}
            filters={filters}
            onFiltersChange={onFiltersChange}
            showFilters={showFilters}
          />
        )}
      </div>
    </div>
  );
};

export default EnhancedSearchHeader;
