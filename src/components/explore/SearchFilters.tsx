
import { Navigation, Heart, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SearchFiltersProps {
  sortBy: 'proximity' | 'likes' | 'followers';
  onSortChange: (sortBy: 'proximity' | 'likes' | 'followers') => void;
  showFilters: boolean;
}

const SearchFilters = ({ sortBy, onSortChange, showFilters }: SearchFiltersProps) => {
  if (!showFilters) return null;

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-xl">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-gray-700">Sort by:</span>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={() => onSortChange('proximity')}
          variant={sortBy === 'proximity' ? 'default' : 'outline'}
          size="sm"
          className="flex items-center gap-2"
        >
          <Navigation className="w-4 h-4" />
          Proximity
        </Button>
        <Button
          onClick={() => onSortChange('likes')}
          variant={sortBy === 'likes' ? 'default' : 'outline'}
          size="sm"
          className="flex items-center gap-2"
        >
          <Heart className="w-4 h-4" />
          Likes
        </Button>
        <Button
          onClick={() => onSortChange('followers')}
          variant={sortBy === 'followers' ? 'default' : 'outline'}
          size="sm"
          className="flex items-center gap-2"
        >
          <UserCheck className="w-4 h-4" />
          Friends Saved
        </Button>
      </div>
    </div>
  );
};

export default SearchFilters;
