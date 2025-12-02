import { useState } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMapFilter, MapFilter } from '@/contexts/MapFilterContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslation } from 'react-i18next';

// Custom icons imports
import filterFriendsIcon from '@/assets/icons/filter-friends.png';
import filterEveryoneIcon from '@/assets/icons/filter-everyone.png';
import filterSavedIcon from '@/assets/icons/filter-saved.png';

interface MapFilterDropdownProps {
  selectedUsers?: any[];
  onFollowingClick?: () => void;
}

const MapFilterDropdown = ({ selectedUsers = [], onFollowingClick }: MapFilterDropdownProps) => {
  const { t } = useTranslation('mapFilters');
  const { activeFilter, setActiveFilter } = useMapFilter();
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const mapFilters = [
    { id: 'following' as const, name: t('friends'), icon: filterFriendsIcon },
    { id: 'popular' as const, name: t('everyone'), icon: filterEveryoneIcon },
    { id: 'saved' as const, name: t('saved'), icon: filterSavedIcon }
  ];

  const activeFilterData = mapFilters.find(f => f.id === activeFilter) || mapFilters[1];

  const handleFilterSelect = (filterId: MapFilter) => {
    if (filterId === 'following') {
      setActiveFilter('following');
      onFollowingClick?.();
    } else {
      setActiveFilter(filterId);
    }
    setIsFilterExpanded(false);
  };

  return (
    <div className="relative flex items-center">
      {/* Active filter circle button */}
      <button
        onClick={() => setIsFilterExpanded(!isFilterExpanded)}
        className={cn(
          "flex items-center gap-1.5 rounded-full backdrop-blur-md border transition-all duration-300",
          "bg-background/80 border-border/30 shadow-lg",
          isFilterExpanded ? "pr-1.5" : "pr-2.5"
        )}
      >
        <div className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center overflow-hidden transition-all",
          "bg-primary/10 border border-primary/20"
        )}>
          {activeFilter === 'following' && selectedUsers.length > 0 ? (
            <Avatar className="w-6 h-6 border border-background">
              <AvatarImage src={selectedUsers[0]?.avatar_url || ''} />
              <AvatarFallback className="text-[8px]">
                {selectedUsers[0]?.username?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          ) : (
            <img 
              src={activeFilterData.icon} 
              alt={activeFilterData.name}
              className="w-6 h-6 object-contain"
            />
          )}
        </div>
        {!isFilterExpanded && (
          <span className="text-xs font-medium text-foreground whitespace-nowrap">
            {activeFilterData.name}
          </span>
        )}
        <ChevronRight className={cn(
          "w-4 h-4 text-muted-foreground transition-transform duration-300",
          isFilterExpanded && "rotate-180"
        )} />
      </button>

      {/* Expanded filter options */}
      <div className={cn(
        "flex items-center gap-1.5 ml-1.5 overflow-hidden transition-all duration-300",
        isFilterExpanded ? "max-w-[250px] opacity-100" : "max-w-0 opacity-0"
      )}>
        {mapFilters.filter(f => f.id !== activeFilter).map((filter) => (
          <button
            key={filter.id}
            onClick={() => handleFilterSelect(filter.id)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full backdrop-blur-md border transition-all duration-200",
              "bg-background/80 border-border/30 hover:bg-background/90 hover:border-primary/30 shadow-lg"
            )}
          >
            <img 
              src={filter.icon} 
              alt={filter.name}
              className="w-5 h-5 object-contain"
            />
            <span className="text-xs font-medium text-foreground whitespace-nowrap">
              {filter.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MapFilterDropdown;
