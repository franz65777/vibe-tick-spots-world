
import { Heart, Users, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterButtonsProps {
  activeFilter: 'following' | 'popular' | 'new';
  onFilterChange: (filter: 'following' | 'popular' | 'new') => void;
  newCount: number;
}

const FilterButtons = ({ activeFilter, onFilterChange, newCount }: FilterButtonsProps) => {
  return (
    <div className="bg-white/60 backdrop-blur-sm px-4 py-4 sm:px-6 sm:py-3">
      <div className="flex gap-4 sm:gap-3">
        <button
          onClick={() => onFilterChange('following')}
          className={cn(
            "flex items-center gap-3 px-6 py-4 sm:px-5 sm:py-3 rounded-2xl text-base sm:text-sm font-semibold transition-all duration-300 shadow-lg min-h-[48px] sm:min-h-[44px]",
            activeFilter === 'following'
              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue-500/30 scale-105"
              : "bg-white/90 text-gray-600 hover:bg-white hover:shadow-xl hover:scale-105"
          )}
        >
          <Users className="w-5 h-5" />
          Following
        </button>
        <button
          onClick={() => onFilterChange('popular')}
          className={cn(
            "flex items-center gap-3 px-6 py-4 sm:px-5 sm:py-3 rounded-2xl text-base sm:text-sm font-semibold transition-all duration-300 shadow-lg min-h-[48px] sm:min-h-[44px]",
            activeFilter === 'popular'
              ? "bg-gradient-to-r from-pink-500 to-red-500 text-white shadow-pink-500/30 scale-105"
              : "bg-white/90 text-gray-600 hover:bg-white hover:shadow-xl hover:scale-105"
          )}
        >
          <Heart className="w-5 h-5" />
          Popular
        </button>
        <button
          onClick={() => onFilterChange('new')}
          className={cn(
            "flex items-center gap-3 px-6 py-4 sm:px-5 sm:py-3 rounded-2xl text-base sm:text-sm font-semibold transition-all duration-300 shadow-lg relative min-h-[48px] sm:min-h-[44px]",
            activeFilter === 'new'
              ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-purple-500/30 scale-105"
              : "bg-white/90 text-gray-600 hover:bg-white hover:shadow-xl hover:scale-105"
          )}
        >
          <Sparkles className="w-5 h-5" />
          New
          {newCount > 0 && activeFilter !== 'new' && (
            <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-4 sm:h-4 bg-gradient-to-r from-orange-400 to-red-500 rounded-full animate-pulse"></div>
          )}
        </button>
      </div>
    </div>
  );
};

export default FilterButtons;
