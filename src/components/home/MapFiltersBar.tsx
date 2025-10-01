import React from 'react';
import { 
  Users,
  TrendingUp,
  Star,
  Bookmark,
  Coffee, 
  Utensils, 
  Wine, 
  Building2 as Museum, 
  Building,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMapFilter } from '@/contexts/MapFilterContext';
import { Button } from '@/components/ui/button';

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

const MapFiltersBar = () => {
  const { activeFilter, setActiveFilter, selectedCategories, toggleCategory, clearCategories } = useMapFilter();
  
  const mapFilters = [
    { id: 'following' as const, name: 'Following', icon: Users, description: 'Places from people you follow' },
    { id: 'popular' as const, name: 'Popular', icon: TrendingUp, description: 'Trending locations nearby' },
    { id: 'recommended' as const, name: 'For You', icon: Star, description: 'Personalized recommendations' },
    { id: 'saved' as const, name: 'Saved', icon: Bookmark, description: 'Your saved places' }
  ];

  return (
    <div className="w-full bg-white/95 backdrop-blur-lg border-b border-gray-200 shadow-sm">
      {/* Main Map Filters - 4 buttons */}
      <div className="px-4 py-2">
        <div className="grid grid-cols-4 gap-2 mb-2">
          {mapFilters.map((filter) => {
            const IconComponent = filter.icon;
            const isActive = activeFilter === filter.id;
            
            // Define colors for each filter
            const filterColors = {
              following: isActive 
                ? "bg-blue-600 text-white border-blue-600" 
                : "bg-white text-blue-600 border-blue-200 hover:bg-blue-50",
              popular: isActive 
                ? "bg-red-600 text-white border-red-600" 
                : "bg-white text-red-600 border-red-200 hover:bg-red-50",
              recommended: isActive 
                ? "bg-purple-600 text-white border-purple-600" 
                : "bg-white text-purple-600 border-purple-200 hover:bg-purple-50",
              saved: isActive 
                ? "bg-green-600 text-white border-green-600" 
                : "bg-white text-green-600 border-green-200 hover:bg-green-50"
            };
            
            return (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={cn(
                  "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border shadow-sm",
                  filterColors[filter.id as keyof typeof filterColors]
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
        {(selectedCategories.length > 0 || categoryFilters.length > 0) && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {categoryFilters.map((category) => {
              const IconComponent = category.icon;
              const isSelected = selectedCategories.includes(category.id);
              
              return (
                <button
                  key={category.id}
                  onClick={() => toggleCategory(category.id)}
                  className={cn(
                    "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 shadow-sm",
                    isSelected 
                      ? "bg-black text-white" 
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  <IconComponent className="w-3.5 h-3.5" />
                  <span>{category.name}</span>
                </button>
              );
            })}
            {selectedCategories.length > 0 && (
              <Button
                onClick={clearCategories}
                variant="ghost"
                size="sm"
                className="flex-shrink-0 h-auto px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Clear
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MapFiltersBar;
