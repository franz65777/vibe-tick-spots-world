
import React from 'react';
import { MapPin, Star, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LocationFiltersProps {
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
}

const LocationFilters: React.FC<LocationFiltersProps> = ({
  selectedFilter,
  onFilterChange
}) => {
  const filters = [
    { id: 'all', label: 'All', icon: MapPin },
    { id: 'popular', label: 'Popular', icon: Star },
    { id: 'recent', label: 'Recent', icon: Clock },
    { id: 'trending', label: 'Trending', icon: TrendingUp },
  ];

  return (
    <div className="flex gap-2 px-4 py-2 overflow-x-auto">
      {filters.map((filter) => {
        const Icon = filter.icon;
        const isSelected = selectedFilter === filter.id;
        
        return (
          <Button
            key={filter.id}
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFilterChange(filter.id)}
            className={`flex items-center gap-1 whitespace-nowrap ${
              isSelected 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {filter.label}
          </Button>
        );
      })}
    </div>
  );
};

export default LocationFilters;
