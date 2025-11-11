
import { useState, useRef } from 'react';
import { Search, MapPin, Users, X, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import SmartAutocomplete from './SmartAutocomplete';
import SearchFilters from './SearchFilters';
import { useTranslation } from 'react-i18next';

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
  const { user } = useAuth();
  const { t } = useTranslation();
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

  const handleAutocompleteSelect = async (result: any) => {
    // Track search in history (only for users mode with result select)
    if (user && searchQuery.trim() && searchMode === 'users' && result.type === 'user') {
      supabase.from('search_history').insert({
        user_id: user.id,
        search_query: result.title, // Save username, not keystrokes
        search_type: searchMode,
        target_user_id: result.id
      });
    }
    
    // Navigate to detail or profile
    if (result.type === 'place') {
      // For places, we need to trigger the location detail modal
      // This will be handled by the parent component through the search query
      onSearchQueryChange(result.title);
    } else if (result.type === 'user') {
      // Navigate to user profile
      window.location.href = `/profile/${result.id}`;
    }
    
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      searchInputRef.current?.blur();
      setShowAutocomplete(false);
    }
  };

  return (
    <div className="bg-background/95 backdrop-blur-lg px-4 py-4 shadow-sm border-b border-border sticky top-16 z-20">
      <div className="max-w-2xl mx-auto">
        {/* Search Mode Toggle */}
        <div className="flex bg-muted rounded-xl p-1 mb-4">
          <button 
            onClick={() => onSearchModeChange('locations')} 
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all min-h-[44px] ${
              searchMode === 'locations' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-pressed={searchMode === 'locations'}
            aria-label="Search for locations"
          >
            <MapPin className="w-4 h-4" aria-hidden="true" />
            Locations
          </button>
          <button 
            onClick={() => onSearchModeChange('users')} 
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all min-h-[44px] ${
              searchMode === 'users' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-pressed={searchMode === 'users'}
            aria-label="Search for users"
          >
            <Users className="w-4 h-4" aria-hidden="true" />
            Users
          </button>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative" role="search">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" aria-hidden="true" />
            <Input 
              ref={searchInputRef} 
              type="text" 
              placeholder={searchMode === 'locations' ? 'Search for places, food, cafes...' : 'Search for users...'} 
              value={searchQuery} 
              onChange={e => onSearchQueryChange(e.target.value)} 
              onFocus={handleInputFocus} 
              onBlur={handleInputBlur}
              onKeyDown={handleKeyDown}
              className="pl-10 pr-32 h-12 bg-muted/50 border-border focus:border-primary focus:ring-primary/20 rounded-xl text-base text-foreground placeholder:text-muted-foreground" 
              aria-label={`Search for ${searchMode}`}
            />
            
            {/* Cancel button */}
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  onSearchQueryChange('');
                  searchInputRef.current?.blur();
                }}
                className="absolute right-12 top-1/2 transform -translate-y-1/2 text-sm font-medium text-primary hover:text-primary/80 transition-colors px-2"
              >
                {user ? t('cancel', { ns: 'common' }) : 'Cancel'}
              </button>
            )}
            
            {/* Clear button */}
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="absolute right-24 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-accent rounded-full"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            
            {/* Settings button for locations */}
            {searchMode === 'locations' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
                aria-label={`${showFilters ? 'Hide' : 'Show'} search filters`}
                aria-expanded={showFilters}
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
