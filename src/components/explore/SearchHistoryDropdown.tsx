
import React from 'react';
import { Clock, MapPin, User, X } from 'lucide-react';
import { useSearchHistory } from '@/hooks/useSearchHistory';

interface SearchHistoryDropdownProps {
  isOpen: boolean;
  onSelect: (query: string) => void;
  searchType: 'location' | 'user';
}

const SearchHistoryDropdown: React.FC<SearchHistoryDropdownProps> = ({
  isOpen,
  onSelect,
  searchType
}) => {
  const { searchHistory, clearSearchHistory } = useSearchHistory();

  if (!isOpen) return null;

  const filteredHistory = searchHistory.filter(item => item.search_type === searchType);

  if (filteredHistory.length === 0) {
    return (
      <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 p-4 text-center text-gray-500 text-sm z-50">
        No search history yet
      </div>
    );
  }

  return (
    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto z-50">
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Clock className="w-4 h-4" />
          Recent searches
        </div>
        <button
          onClick={() => clearSearchHistory(searchType)}
          className="text-xs text-gray-500 hover:text-red-600 transition-colors"
        >
          Clear all
        </button>
      </div>
      
      {filteredHistory.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item.search_query)}
          className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
        >
          {searchType === 'location' ? (
            <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
          ) : (
            <User className="w-4 h-4 text-gray-400 shrink-0" />
          )}
          <span className="text-sm text-gray-700 truncate">{item.search_query}</span>
          <span className="text-xs text-gray-400 ml-auto">
            {new Date(item.searched_at).toLocaleDateString()}
          </span>
        </button>
      ))}
    </div>
  );
};

export default SearchHistoryDropdown;
