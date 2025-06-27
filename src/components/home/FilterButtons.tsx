
import { Heart, Users, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterButtonsProps {
  activeFilter: 'following' | 'popular' | 'saved';
  onFilterChange: (filter: 'following' | 'popular' | 'saved') => void;
  onCityChange: (city: string) => void;
  hasFollowedUsers: boolean;
}

const FilterButtons = ({ activeFilter, onFilterChange, onCityChange, hasFollowedUsers }: FilterButtonsProps) => {
  // Calculate saved count (this would be dynamic in a real app)
  const savedCount = activeFilter === 'saved' ? 0 : 12;

  return (
    <div className="bg-white/60 backdrop-blur-sm px-2 py-2">
      <div className="flex gap-2">
        <button
          onClick={() => onFilterChange('following')}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-300 shadow-lg min-h-[36px] flex-1",
            activeFilter === 'following'
              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue-500/30 scale-105"
              : "bg-white/90 text-gray-600 hover:bg-white hover:shadow-xl hover:scale-105"
          )}
        >
          <Users className="w-4 h-4" />
          Following
        </button>
        <button
          onClick={() => onFilterChange('popular')}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-300 shadow-lg min-h-[36px] flex-1",
            activeFilter === 'popular'
              ? "bg-gradient-to-r from-pink-500 to-red-500 text-white shadow-pink-500/30 scale-105"
              : "bg-white/90 text-gray-600 hover:bg-white hover:shadow-xl hover:scale-105"
          )}
        >
          <Heart className="w-4 h-4" />
          Popular
        </button>
        <button
          onClick={() => onFilterChange('saved')}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-300 shadow-lg relative min-h-[36px] flex-1",
            activeFilter === 'saved'
              ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-green-500/30 scale-105"
              : "bg-white/90 text-gray-600 hover:bg-white hover:shadow-xl hover:scale-105"
          )}
        >
          <Bookmark className="w-4 h-4" />
          Saved
          {savedCount > 0 && activeFilter !== 'saved' && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-orange-400 to-red-500 rounded-full animate-pulse"></div>
          )}
        </button>
      </div>
    </div>
  );
};

export default FilterButtons;
