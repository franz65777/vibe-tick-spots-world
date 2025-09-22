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
}

const MapCategoryFilters = ({ 
  activeMapFilter, 
  onMapFilterChange, 
  selectedCategories,
  onCategoryToggle 
}: MapCategoryFiltersProps) => {
  
  const mapFilters = [
    { id: 'following' as MapFilter, name: 'Following', icon: Users, description: 'Places from people you follow' },
    { id: 'popular' as MapFilter, name: 'Popular', icon: TrendingUp, description: 'Trending locations nearby' },
    { id: 'saved' as MapFilter, name: 'Saved', icon: Bookmark, description: 'Your saved places' }
  ];

  return (
    <div className="absolute top-4 left-4 right-4 z-50">
      {/* Google Maps Style Filters */}
      <div className="flex flex-col gap-2">
        {/* Map Mode Pills - Google Maps Style */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {mapFilters.map((filter) => {
            const IconComponent = filter.icon;
            const isActive = activeMapFilter === filter.id;
            
            return (
              <button
                key={filter.id}
                onClick={() => onMapFilterChange(filter.id)}
                className={cn(
                  "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 shadow-sm",
                  isActive
                    ? "bg-black text-white"
                    : "bg-white/95 text-gray-700 hover:bg-white hover:shadow-md"
                )}
                title={filter.description}
              >
                <IconComponent className="w-4 h-4" />
                <span className="text-sm">{filter.name}</span>
              </button>
            );
          })}
        </div>

        {/* Category Pills - Google Maps Style */}
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
                    "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 shadow-sm",
                    isSelected 
                      ? "bg-black text-white" 
                      : "bg-white/95 text-gray-700 hover:bg-white hover:shadow-md"
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
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium bg-white/95 text-gray-500 hover:bg-white hover:shadow-md transition-all duration-200 shadow-sm"
              >
                Clear All
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default MapCategoryFilters;