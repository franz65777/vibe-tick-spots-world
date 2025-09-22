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
  Heart,
  Star,
  Bookmark
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
  { id: 'bar', name: 'Bars', icon: Wine, color: 'bg-purple-500' },
  { id: 'cafe', name: 'Cafes', icon: Coffee, color: 'bg-amber-500' },
  { id: 'museum', name: 'Museums', icon: Museum, color: 'bg-blue-500' },
  { id: 'shopping', name: 'Shopping', icon: ShoppingBag, color: 'bg-pink-500' },
  { id: 'hotel', name: 'Hotels', icon: Building, color: 'bg-indigo-500' },
  { id: 'park', name: 'Parks', icon: TreePine, color: 'bg-green-500' },
  { id: 'transport', name: 'Transport', icon: Car, color: 'bg-gray-500' }
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
    { id: 'following' as MapFilter, name: 'Following', icon: Heart, description: 'Places from people you follow' },
    { id: 'popular' as MapFilter, name: 'Popular', icon: Star, description: 'Trending locations nearby' },
    { id: 'saved' as MapFilter, name: 'Saved', icon: Bookmark, description: 'Your saved places' }
  ];

  return (
    <div className="absolute top-4 left-4 right-4 z-50 space-y-3">
      {/* Map Mode Filters */}
      <div className="flex gap-2 bg-white/95 backdrop-blur-sm rounded-2xl p-2 shadow-lg border border-gray-100">
        {mapFilters.map((filter) => {
          const IconComponent = filter.icon;
          const isActive = activeMapFilter === filter.id;
          
          return (
            <button
              key={filter.id}
              onClick={() => onMapFilterChange(filter.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 font-medium text-sm",
                isActive
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100"
              )}
              title={filter.description}
            >
              <IconComponent className="w-4 h-4" />
              <span>{filter.name}</span>
            </button>
          );
        })}
      </div>

      {/* Category Filters */}
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-3 shadow-lg border border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-gray-700">Categories:</span>
          {selectedCategories.length > 0 && (
            <button
              onClick={() => selectedCategories.forEach(cat => onCategoryToggle(cat))}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear all
            </button>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2">
          {categoryFilters.map((category) => {
            const IconComponent = category.icon;
            const isSelected = selectedCategories.includes(category.id);
            
            return (
              <button
                key={category.id}
                onClick={() => onCategoryToggle(category.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 text-sm font-medium border",
                  isSelected
                    ? `${category.color} text-white border-transparent shadow-md`
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                )}
              >
                <IconComponent className="w-3.5 h-3.5" />
                <span>{category.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MapCategoryFilters;