
import React from 'react';
import { Utensils, Coffee, Building, GraduationCap, Music, MapPin, TreePine, Disc, Landmark, Croissant, Clapperboard } from 'lucide-react';
import { cn } from '@/lib/utils';

type CategoryType = 'all' | 'restaurant' | 'bar' | 'cafe' | 'bakery' | 'museum' | 'hotel' | 'park' | 'historical' | 'nightclub' | 'entertainment';

interface CategoryFilterProps {
  selectedCategory?: CategoryType;
  selectedCategories?: CategoryType[];
  onCategoryChange?: (category: CategoryType) => void;
  onCategoriesChange?: (categories: CategoryType[]) => void;
}

const categories = [
  { id: 'all' as CategoryType, label: 'All', icon: MapPin },
  { id: 'restaurant' as CategoryType, label: 'Restaurant', icon: Utensils },
  { id: 'bar' as CategoryType, label: 'Bar', icon: Music },
  { id: 'cafe' as CategoryType, label: 'Café', icon: Coffee },
  { id: 'bakery' as CategoryType, label: 'Bakery', icon: Croissant },
  { id: 'hotel' as CategoryType, label: 'Hotel', icon: Building },
  { id: 'museum' as CategoryType, label: 'Museum', icon: GraduationCap },
  { id: 'entertainment' as CategoryType, label: 'Fun', icon: Clapperboard },
  { id: 'park' as CategoryType, label: 'Park', icon: TreePine },
  { id: 'historical' as CategoryType, label: 'Historical', icon: Landmark },
  { id: 'nightclub' as CategoryType, label: 'Nightclub', icon: Disc },
];

const CategoryFilter = ({ 
  selectedCategory,
  selectedCategories = [], 
  onCategoryChange,
  onCategoriesChange 
}: CategoryFilterProps) => {
  const handleCategoryToggle = (categoryId: CategoryType) => {
    // Handle single category mode (for HomePage)
    if (onCategoryChange) {
      onCategoryChange(categoryId);
      return;
    }

    // Handle multiple categories mode (for ExplorePage)
    if (onCategoriesChange) {
      if (categoryId === 'all') {
        onCategoriesChange(['all']);
        return;
      }

      const newSelected = selectedCategories.includes('all') 
        ? [categoryId]
        : selectedCategories.includes(categoryId)
          ? selectedCategories.filter(c => c !== categoryId)
          : [...selectedCategories.filter(c => c !== 'all'), categoryId];

      onCategoriesChange(newSelected.length === 0 ? ['all'] : newSelected);
    }
  };

  // Determine if category is selected
  const isCategorySelected = (categoryId: CategoryType) => {
    if (selectedCategory !== undefined) {
      return selectedCategory === categoryId;
    }
    return selectedCategories.includes(categoryId);
  };

  return (
    <div className="bg-white/95 backdrop-blur-sm px-4 py-4 border-b border-gray-100 sticky top-16 z-10">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {categories.map((category) => {
          const Icon = category.icon;
          const isSelected = isCategorySelected(category.id);
          
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
