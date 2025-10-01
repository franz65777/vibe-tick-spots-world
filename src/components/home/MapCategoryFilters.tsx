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
import { useMapFilter } from '@/contexts/MapFilterContext';

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

const MapCategoryFilters = () => {
  const { activeFilter, setActiveFilter, selectedCategories, toggleCategory, clearCategories } = useMapFilter();
  const mapFilters = [
    { id: 'following' as const, name: 'Following', icon: Users, description: 'Places from people you follow' },
    { id: 'popular' as const, name: 'Popular', icon: TrendingUp, description: 'Trending locations nearby' },
    { id: 'recommended' as const, name: 'For You', icon: Star, description: 'Personalized recommendations' },
    { id: 'saved' as const, name: 'Saved', icon: Bookmark, description: 'Your saved places' }
  ];

  return (
    <div className="absolute top-4 left-4 right-4 z-50">
      {/* Main Map Filters - 4 buttons */}
      <div className="grid grid-cols-4 gap-1.5 mb-2">
        {mapFilters.map((filter) => {
          const IconComponent = filter.icon;
          const isActive = activeFilter === filter.id;
          
          // Define colors for each filter
          const filterColors = {
            following: isActive 
              ? "bg-blue-600 text-white border-blue-600" 
              : "bg-white/90 text-blue-600 border-blue-200 hover:bg-blue-50",
            popular: isActive 
              ? "bg-red-600 text-white border-red-600" 
              : "bg-white/90 text-red-600 border-red-200 hover:bg-red-50",
            recommended: isActive 
              ? "bg-purple-600 text-white border-purple-600" 
              : "bg-white/90 text-purple-600 border-purple-200 hover:bg-purple-50",
            saved: isActive 
              ? "bg-green-600 text-white border-green-600" 
              : "bg-white/90 text-green-600 border-green-200 hover:bg-green-50"
          };
          
          return (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={cn(
                "flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 backdrop-blur-sm border shadow-sm",
                filterColors[filter.id as keyof typeof filterColors]
              )}
              title={filter.description}
            >
              <IconComponent className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs">{filter.name}</span>
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
                onClick={() => toggleCategory(category.id)}
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
              onClick={clearCategories}
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