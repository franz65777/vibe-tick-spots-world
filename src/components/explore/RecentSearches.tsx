
import React, { useState, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Clock, X, Users } from 'lucide-react';

interface RecentSearch {
  id: string;
  type: 'user' | 'location';
  query: string;
  user?: {
    id: string;
    username: string;
    avatar_url: string;
  };
  timestamp: string;
}

interface RecentSearchesProps {
  searchMode: 'locations' | 'users';
  onSearchClick: (query: string) => void;
  onUserClick?: (user: any) => void;
}

const RecentSearches = ({ searchMode, onSearchClick, onUserClick }: RecentSearchesProps) => {
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  useEffect(() => {
    loadRecentSearches();
  }, [searchMode]);

  const loadRecentSearches = () => {
    const stored = localStorage.getItem(`recentSearches_${searchMode}`);
    if (stored) {
      try {
        const searches = JSON.parse(stored);
        setRecentSearches(searches.slice(0, 10)); // Limit to 10 recent searches
      } catch (error) {
        console.error('Error loading recent searches:', error);
      }
    }
  };

  const addRecentSearch = (search: Omit<RecentSearch, 'id' | 'timestamp'>) => {
    const newSearch: RecentSearch = {
      ...search,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };

    const existing = recentSearches.filter(s => s.query !== search.query);
    const updated = [newSearch, ...existing].slice(0, 10);
    
    setRecentSearches(updated);
    localStorage.setItem(`recentSearches_${searchMode}`, JSON.stringify(updated));
  };

  const removeRecentSearch = (searchId: string) => {
    const updated = recentSearches.filter(s => s.id !== searchId);
    setRecentSearches(updated);
    localStorage.setItem(`recentSearches_${searchMode}`, JSON.stringify(updated));
  };

  const clearAllSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(`recentSearches_${searchMode}`);
  };

  const handleSearchClick = (search: RecentSearch) => {
    if (search.type === 'user' && search.user && onUserClick) {
      onUserClick(search.user);
    } else {
      onSearchClick(search.query);
    }
  };

  // Expose the addRecentSearch function to parent components
  React.useImperativeHandle(React.createRef(), () => ({
    addRecentSearch
  }));

  if (recentSearches.length === 0) {
    return null;
  }

  const filteredSearches = recentSearches.filter(s => s.type === searchMode.slice(0, -1));

  if (filteredSearches.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <h3 className="font-medium text-gray-900">Recent Searches</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAllSearches}
          className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
        >
          Clear all
        </Button>
      </div>

      <div className="space-y-2">
        {filteredSearches.map((search) => (
          <div
            key={search.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer group"
            onClick={() => handleSearchClick(search)}
          >
            {search.type === 'user' && search.user ? (
              <>
                <Avatar className="w-8 h-8">
                  <AvatarImage src={search.user.avatar_url} />
                  <AvatarFallback>{search.user.username.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">
                    {search.user.username}
                  </p>
                  <p className="text-xs text-gray-500">@{search.user.username}</p>
                </div>
                <Users className="w-4 h-4 text-gray-400" />
              </>
            ) : (
              <>
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <Clock className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{search.query}</p>
                  <p className="text-xs text-gray-500">Location search</p>
                </div>
              </>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                removeRecentSearch(search.id);
              }}
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentSearches;
