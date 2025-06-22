
import React from 'react';
import { Button } from '@/components/ui/button';
import { Utensils, Coffee, Building, ShoppingBag, GraduationCap, Music, MapPin, TreePine, Dumbbell, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

type CategoryType = 'all' | 'restaurant' | 'bar' | 'cafe' | 'shop' | 'museum' | 'hotel' | 'park' | 'gym' | 'attraction';

interface CategoryFiltersProps {
  selectedCategory: CategoryType;
  onCategoryChange: (category: CategoryType) => void;
}

const categories = [
  { id: 'all' as CategoryType, label: 'All', icon: MapPin },
  { id: 'restaurant' as CategoryType, label: 'Restaurant', icon: Utensils },
  { id: 'bar' as CategoryType, label: 'Bar', icon: Music },
  { id: 'cafe' as CategoryType, label: 'Café', icon: Coffee },
  { id: 'shop' as CategoryType, label: 'Shop', icon: ShoppingBag },
  { id: 'hotel' as CategoryType, label: 'Hotel', icon: Building },
  { id: 'museum' as CategoryType, label: 'Museum', icon: GraduationCap },
  { id: 'park' as CategoryType, label: 'Park', icon: TreePine },
  { id: 'gym' as CategoryType, label: 'Gym', icon: Dumbbell },
  { id: 'attraction' as CategoryType, label: 'Attraction', icon: Camera },
];

const CategoryFilters = ({ selectedCategory, onCategoryChange }: CategoryFiltersProps) => {
  return (
    <div className="px-4 py-3 bg-white border-b border-gray-100">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {categories.map((category) => {
          const Icon = category.icon;
          const isSelected = selectedCategory === category.id;
          
          return (
            <Button
              key={category.id}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => onCategoryChange(category.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap min-w-fit",
                isSelected
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 hover:border-gray-300"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{category.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryFilters;
export type { CategoryType };
