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
      {/* Ultra Subtle Filter */}
      <div className="bg-black/20 backdrop-blur-lg rounded-xl border border-white/10 overflow-hidden shadow-sm">
        {/* Map Mode Pills - Minimal Design */}
        <div className="flex overflow-x-auto scrollbar-hide">
          {mapFilters.map((filter, index) => {
            const IconComponent = filter.icon;
            const isActive = activeMapFilter === filter.id;
            
            return (
              <button
                key={filter.id}
                onClick={() => onMapFilterChange(filter.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-2 py-2 transition-all duration-200 text-xs font-medium",
                  isActive
                    ? "bg-white/90 text-black shadow-sm"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                )}
                title={filter.description}
              >
                <IconComponent className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-xs">{filter.name}</span>
              </button>
            );
          })}
        </div>

        {/* Category Pills - Minimal */}
        {selectedCategories.length > 0 && (
          <div className="px-2 pb-2 border-t border-white/10">
            <div className="flex gap-1 overflow-x-auto scrollbar-hide pt-2">
              {categoryFilters.filter(cat => selectedCategories.includes(cat.id)).map((category) => {
                const IconComponent = category.icon;
                
                return (
                  <button
                    key={category.id}
                    onClick={() => onCategoryToggle(category.id)}
                    className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-md bg-white/20 text-white text-xs font-medium hover:bg-white/30 transition-colors"
                  >
                    <IconComponent className="w-3 h-3" />
                    <span>{category.name}</span>
                  </button>
                );
              })}
              <button
                onClick={() => selectedCategories.forEach(cat => onCategoryToggle(cat))}
                className="flex-shrink-0 px-2 py-1 text-xs text-white/60 hover:text-white/80 font-medium"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapCategoryFilters;