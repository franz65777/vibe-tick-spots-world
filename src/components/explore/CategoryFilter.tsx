
import React from 'react';
import { Utensils, Coffee, Building, ShoppingBag, GraduationCap, Music, MapPin, TreePine, Dumbbell, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

type CategoryType = 'all' | 'restaurant' | 'bar' | 'cafe' | 'shop' | 'museum' | 'hotel' | 'park' | 'gym' | 'attraction';

interface CategoryFilterProps {
  selectedCategories: CategoryType[];
  onCategoryChange: (categories: CategoryType[]) => void;
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

const CategoryFilter = ({ selectedCategories, onCategoryChange }: CategoryFilterProps) => {
  const handleCategoryToggle = (categoryId: CategoryType) => {
    if (categoryId === 'all') {
      onCategoryChange(['all']);
      return;
    }

    const newSelected = selectedCategories.includes('all') 
      ? [categoryId]
      : selectedCategories.includes(categoryId)
        ? selectedCategories.filter(c => c !== categoryId)
        : [...selectedCategories.filter(c => c !== 'all'), categoryId];

    onCategoryChange(newSelected.length === 0 ? ['all'] : newSelected);
  };

  return (
    <div className="bg-white/95 backdrop-blur-sm px-4 py-4 border-b border-gray-100 sticky top-16 z-10">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {categories.map((category) => {
          const Icon = category.icon;
          const isSelected = selectedCategories.includes(category.id);
          
          return (
            <button
              key={category.id}
              onClick={() => handleCategoryToggle(category.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap min-h-[44px]",
                isSelected
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 hover:border-gray-300 shadow-sm"
              )}
            >
              <Icon className="w-4 h-4" />
              {category.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryFilter;
export type { CategoryType };
