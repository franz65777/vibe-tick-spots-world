
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SearchSuggestionsProps {
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
  searchHistory: string[];
}

const SearchSuggestions = ({ suggestions, onSuggestionClick, searchHistory }: SearchSuggestionsProps) => {
  if (suggestions.length === 0 && searchHistory.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
      {searchHistory.length > 0 && (
        <div className="p-2 border-b border-gray-100">
          <div className="text-xs font-medium text-gray-500 mb-2">Recent searches</div>
          {searchHistory.map((item, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              className="w-full justify-start text-left h-8 px-2 text-gray-600 hover:text-gray-900"
              onClick={() => onSuggestionClick(item)}
            >
              <Search className="w-3 h-3 mr-2 text-gray-400" />
              {item}
            </Button>
          ))}
        </div>
      )}
      
      {suggestions.length > 0 && (
        <div className="p-2">
          <div className="text-xs font-medium text-gray-500 mb-2">Suggestions</div>
          {suggestions.map((suggestion, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              className="w-full justify-start text-left h-8 px-2 text-gray-600 hover:text-gray-900"
              onClick={() => onSuggestionClick(suggestion)}
            >
              <Search className="w-3 h-3 mr-2 text-gray-400" />
              {suggestion}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchSuggestions;
