import { Users, Globe, Bookmark, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface FilterButtonsProps {
  activeFilter: 'following' | 'popular' | 'saved' | 'shared';
  onFilterChange: (filter: 'following' | 'popular' | 'saved' | 'shared') => void;
  onCityChange: (city: string) => void;
  hasFollowedUsers: boolean;
}

const FilterButtons = ({ activeFilter, onFilterChange, onCityChange, hasFollowedUsers }: FilterButtonsProps) => {
  const { t } = useTranslation();
  // Calculate saved count (this would be dynamic in a real app)
  const savedCount = activeFilter === 'saved' ? 0 : 12;

  return (
    <div className="bg-white/60 backdrop-blur-sm px-2 py-2">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => onFilterChange('following')}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-300 shadow-lg min-h-[36px] flex-shrink-0",
            activeFilter === 'following'
              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue-500/30 scale-105"
              : "bg-white/90 text-gray-600 hover:bg-white hover:shadow-xl hover:scale-105"
          )}
        >
          <Users className="w-4 h-4" />
          {t('mapFilters.friends')}
        </button>
        <button
          onClick={() => onFilterChange('popular')}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-300 shadow-lg min-h-[36px] flex-shrink-0",
            activeFilter === 'popular'
              ? "bg-gradient-to-r from-pink-500 to-red-500 text-white shadow-pink-500/30 scale-105"
              : "bg-white/90 text-gray-600 hover:bg-white hover:shadow-xl hover:scale-105"
          )}
        >
          <Globe className="w-4 h-4" />
          {t('mapFilters.everyone')}
        </button>
        <button
          onClick={() => onFilterChange('saved')}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-300 shadow-lg relative min-h-[36px] flex-shrink-0",
            activeFilter === 'saved'
              ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-green-500/30 scale-105"
              : "bg-white/90 text-gray-600 hover:bg-white hover:shadow-xl hover:scale-105"
          )}
        >
          <Bookmark className="w-4 h-4" />
          {t('mapFilters.saved')}
          {savedCount > 0 && activeFilter !== 'saved' && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-orange-400 to-red-500 rounded-full animate-pulse"></div>
          )}
        </button>
        <button
          onClick={() => onFilterChange('shared')}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-300 shadow-lg min-h-[36px] flex-shrink-0",
            activeFilter === 'shared'
              ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-purple-500/30 scale-105"
              : "bg-white/90 text-gray-600 hover:bg-white hover:shadow-xl hover:scale-105"
          )}
        >
          <Share2 className="w-4 h-4" />
          {t('mapFilters.shared')}
        </button>
      </div>
    </div>
  );
};

export default FilterButtons;
