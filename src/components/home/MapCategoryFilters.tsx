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
      {/* Transparent Compact Filter */}
      <div className="bg-black/20 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden">
        {/* Map Mode Pills - Horizontal Scroll */}
        <div className="flex overflow-x-auto scrollbar-hide border-b border-white/10">
          {mapFilters.map((filter, index) => {
            const IconComponent = filter.icon;
            const isActive = activeMapFilter === filter.id;
            
            return (
              <button
                key={filter.id}
                onClick={() => onMapFilterChange(filter.id)}
                className={cn(
                  "flex-shrink-0 flex items-center justify-center gap-2 px-4 py-3 transition-all duration-200 font-medium text-sm border-r border-white/10 last:border-r-0 min-w-[80px]",
                  isActive
                    ? "bg-white/20 text-white"
                    : "text-white/80 hover:bg-white/10"
                )}
                title={filter.description}
              >
                <IconComponent className="w-4 h-4" />
                <span className="hidden sm:inline whitespace-nowrap">{filter.name}</span>
              </button>
            );
          })}
        </div>

        {/* Category Chips - Horizontal Scroll */}
        <div className="p-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {categoryFilters.map((category) => {
              const IconComponent = category.icon;
              const isSelected = selectedCategories.includes(category.id);
              
              return (
                <button
                  key={category.id}
                  onClick={() => onCategoryToggle(category.id)}
                  className={cn(
                    "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200 text-xs font-medium border whitespace-nowrap",
                    isSelected
                      ? "bg-white text-black border-white/20 shadow-sm"
                      : "bg-white/10 text-white/90 border-white/20 hover:bg-white/20"
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
                className="flex-shrink-0 px-3 py-1.5 text-xs text-white/70 hover:text-white font-medium whitespace-nowrap"
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