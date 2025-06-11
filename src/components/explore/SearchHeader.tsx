
import React from 'react';
import { ArrowLeft, Filter, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SearchFilters from './SearchFilters';
import SearchSuggestions from './SearchSuggestions';

interface SearchHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchMode: 'locations' | 'users';
  setSearchMode: (mode: 'locations' | 'users') => void;
  sortBy: 'proximity' | 'likes' | 'followers';
  setSortBy: (sortBy: 'proximity' | 'likes' | 'followers') => void;
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
  // Instagram-style message icon
  const MessageIcon = () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
    </svg>
  );

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-b border-gray-200">
      <div className="px-4 py-3">
        {/* Header Row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
            <h1 className="text-xl font-semibold text-gray-900">Search</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
              <MessageIcon />
            </button>
            <MoreHorizontal className="w-6 h-6 text-gray-600" />
          </div>
        </div>

        {/* Search Mode Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
          <button
            onClick={() => setSearchMode('locations')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              searchMode === 'locations'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Places
          </button>
          <button
            onClick={() => setSearchMode('users')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              searchMode === 'users'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            People
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <form onSubmit={onSearch} className="relative">
            <Input
              type="text"
              placeholder={`Search for ${searchMode === 'locations' ? 'places' : 'people'}...`}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="w-full pl-4 pr-12 py-3 bg-gray-50 border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <Button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                variant="ghost"
                size="sm"
                className="p-1 h-auto"
              >
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </form>

          {/* Search Suggestions */}
          {showSuggestions && (
            <SearchSuggestions
              suggestions={suggestions}
              onSuggestionClick={onSuggestionClick}
              searchHistory={recentSearches}
            />
          )}
        </div>

        {/* Filters */}
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
