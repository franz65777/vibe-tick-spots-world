
import { Heart, Users, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterButtonsProps {
  activeFilter: 'following' | 'popular' | 'new';
  onFilterChange: (filter: 'following' | 'popular' | 'new') => void;
  onCityChange: (city: string) => void;
  hasFollowedUsers: boolean;
}

const FilterButtons = ({ activeFilter, onFilterChange, onCityChange, hasFollowedUsers }: FilterButtonsProps) => {
  // Calculate new count (this would be dynamic in a real app)
  const newCount = activeFilter === 'new' ? 0 : 3;

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
          onClick={() => onFilterChange('new')}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-300 shadow-lg relative min-h-[36px] flex-1",
            activeFilter === 'new'
              ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-purple-500/30 scale-105"
              : "bg-white/90 text-gray-600 hover:bg-white hover:shadow-xl hover:scale-105"
          )}
        >
          <Sparkles className="w-4 h-4" />
          New
          {newCount > 0 && activeFilter !== 'new' && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-orange-400 to-red-500 rounded-full animate-pulse"></div>
          )}
        </button>
      </div>
    </div>
  );
};

export default FilterButtons;
