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
    { id: 'following' as MapFilter, name: 'Following', icon: Heart, description: 'Places from people you follow' },
    { id: 'popular' as MapFilter, name: 'Popular', icon: Star, description: 'Trending locations nearby' },
    { id: 'saved' as MapFilter, name: 'Saved', icon: Bookmark, description: 'Your saved places' }
  ];

  return (
    <div className="absolute top-4 left-4 right-4 z-50">
      {/* Compact Single Row Filter */}
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Map Mode Pills */}
        <div className="flex border-b border-gray-100">
          {mapFilters.map((filter, index) => {
            const IconComponent = filter.icon;
            const isActive = activeMapFilter === filter.id;
            
            return (
              <button
                key={filter.id}
                onClick={() => onMapFilterChange(filter.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-3 transition-all duration-200 font-medium text-sm border-r border-gray-100 last:border-r-0",
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                )}
                title={filter.description}
              >
                <IconComponent className="w-4 h-4" />
                <span className="hidden sm:inline">{filter.name}</span>
              </button>
            );
          })}
        </div>

        {/* Category Chips */}
        <div className="p-3">
          <div className="flex flex-wrap gap-2">
            {categoryFilters.map((category) => {
              const IconComponent = category.icon;
              const isSelected = selectedCategories.includes(category.id);
              
              return (
                <button
                  key={category.id}
                  onClick={() => onCategoryToggle(category.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200 text-xs font-medium border",
                    isSelected
                      ? `${category.color} text-white border-transparent shadow-sm scale-105`
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-100"
                  )}
                >
                  <IconComponent className="w-3 h-3" />
                  <span>{category.name}</span>
                </button>
              );
            })}
            {selectedCategories.length > 0 && (
              <button
                onClick={() => selectedCategories.forEach(cat => onCategoryToggle(cat))}
                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapCategoryFilters;