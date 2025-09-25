import React from 'react';
import { 
  Coffee, 
  Utensils, 
  Wine, 
  Building2 as Museum, 
  ShoppingBag, 
  Car,
  Building,
  TreePine,
  Users,
  TrendingUp,
  Bookmark,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CategoryFilter {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export const categoryFilters: CategoryFilter[] = [
  { id: 'restaurant', name: 'Restaurants', icon: Utensils, color: 'bg-orange-500' },
  { id: 'bar', name: 'Bars & Pubs', icon: Wine, color: 'bg-purple-500' },
  { id: 'cafe', name: 'Cafés', icon: Coffee, color: 'bg-amber-500' },
  { id: 'bakery', name: 'Bakeries', icon: Coffee, color: 'bg-yellow-500' },
  { id: 'hotel', name: 'Hotels', icon: Building, color: 'bg-indigo-500' },
  { id: 'museum', name: 'Museums', icon: Museum, color: 'bg-blue-500' },
  { id: 'entertainment', name: 'Entertainment', icon: Star, color: 'bg-pink-500' }
];

export type MapFilter = 'following' | 'popular' | 'saved';

interface MapCategoryFiltersProps {
  activeMapFilter: MapFilter;
  onMapFilterChange: (filter: MapFilter) => void;
  selectedCategories: string[];
  onCategoryToggle: (categoryId: string) => void;
  isHidden?: boolean;
}

const MapCategoryFilters = ({ 
  activeMapFilter, 
  onMapFilterChange, 
  selectedCategories,
  onCategoryToggle,
  isHidden = false 
}: MapCategoryFiltersProps) => {
  
  const handleMapFilterChange = (filter: MapFilter) => {
    // Reset category filters when changing main filter
    if (selectedCategories.length > 0) {
      selectedCategories.forEach(cat => onCategoryToggle(cat));
    }
    onMapFilterChange(filter);
  };
  
  const mapFilters = [
    { id: 'following' as MapFilter, name: 'Following', icon: Users, description: 'Places from people you follow' },
    { id: 'popular' as MapFilter, name: 'Popular', icon: TrendingUp, description: 'Trending locations nearby' },
    { id: 'saved' as MapFilter, name: 'Saved', icon: Bookmark, description: 'Your saved places' }
  ];

  return (
    <div className={cn(
      "absolute top-4 left-4 right-4 z-50 transition-all duration-300",
      isHidden ? "opacity-0 pointer-events-none" : "opacity-100"
    )}>
      {/* Main Map Filters - Fixed 3 buttons */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        {mapFilters.map((filter) => {
          const IconComponent = filter.icon;
            const isActive = activeMapFilter === filter.id;
          
          // Define colors for each filter
          const filterColors = {
            following: isActive 
              ? "bg-blue-600 text-white border-blue-600" 
              : "bg-white/90 text-blue-600 border-blue-200 hover:bg-blue-50",
            popular: isActive 
              ? "bg-red-600 text-white border-red-600" 
              : "bg-white/90 text-red-600 border-red-200 hover:bg-red-50",
            saved: isActive 
              ? "bg-green-600 text-white border-green-600" 
              : "bg-white/90 text-green-600 border-green-200 hover:bg-green-50"
          };
          
          return (
            <button
              key={filter.id}
              onClick={() => handleMapFilterChange(filter.id)}
              className={cn(
                "flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 backdrop-blur-sm border shadow-sm",
                filterColors[filter.id]
              )}
              title={filter.description}
            >
              <IconComponent className="w-4 h-4" />
              <span className="hidden sm:inline">{filter.name}</span>
            </button>
          );
        })}
      </div>

      {/* Category Filters */}
      {selectedCategories.length > 0 || categoryFilters.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {categoryFilters.map((category) => {
            const IconComponent = category.icon;
            const isSelected = selectedCategories.includes(category.id);
            
            return (
              <button
                key={category.id}
                onClick={() => onCategoryToggle(category.id)}
                className={cn(
                  "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 shadow-sm backdrop-blur-sm",
                  isSelected 
                    ? "bg-black/90 text-white" 
                    : "bg-white/80 text-gray-700 hover:bg-white/90"
                )}
              >
                <IconComponent className="w-4 h-4" />
                <span className="text-sm">{category.name}</span>
              </button>
            );
          })}
          {selectedCategories.length > 0 && (
            <button
              onClick={() => selectedCategories.forEach(cat => onCategoryToggle(cat))}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium bg-white/80 text-gray-500 hover:bg-white/90 transition-all duration-200 shadow-sm backdrop-blur-sm"
            >
              Clear All
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default MapCategoryFilters;