
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export type CategoryType = 'all' | 'restaurant' | 'bar' | 'cafe' | 'hotel' | 'attraction' | 'shop' | 'park' | 'gym' | 'museum';

interface CategoryIconsFilterProps {
  selectedCategories: CategoryType[];
  onCategoriesChange: (categories: CategoryType[]) => void;
}

const CategoryIconsFilter = ({ selectedCategories, onCategoriesChange }: CategoryIconsFilterProps) => {
  const categories = [
    { id: 'all' as CategoryType, icon: '🌟', label: 'All', color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
    { id: 'restaurant' as CategoryType, icon: '🍽️', label: 'Food', color: 'bg-gradient-to-r from-orange-500 to-red-500' },
    { id: 'bar' as CategoryType, icon: '🍸', label: 'Drinks', color: 'bg-gradient-to-r from-pink-500 to-purple-500' },
    { id: 'cafe' as CategoryType, icon: '☕', label: 'Coffee', color: 'bg-gradient-to-r from-amber-500 to-orange-500' },
    { id: 'hotel' as CategoryType, icon: '🏨', label: 'Hotels', color: 'bg-gradient-to-r from-blue-500 to-cyan-500' },
    { id: 'attraction' as CategoryType, icon: '🎭', label: 'Shows', color: 'bg-gradient-to-r from-red-500 to-pink-500' },
    { id: 'shop' as CategoryType, icon: '🛍️', label: 'Shopping', color: 'bg-gradient-to-r from-green-500 to-emerald-500' },
    { id: 'park' as CategoryType, icon: '🌳', label: 'Parks', color: 'bg-gradient-to-r from-green-400 to-green-600' },
    { id: 'gym' as CategoryType, icon: '💪', label: 'Fitness', color: 'bg-gradient-to-r from-red-400 to-orange-500' },
    { id: 'museum' as CategoryType, icon: '🏛️', label: 'Culture', color: 'bg-gradient-to-r from-indigo-500 to-purple-500' },
  ];

  const handleCategoryClick = (categoryId: CategoryType) => {
    if (categoryId === 'all') {
      onCategoriesChange(['all']);
    } else if (selectedCategories.includes('all')) {
      onCategoriesChange([categoryId]);
    } else if (selectedCategories.includes(categoryId)) {
      const newCategories = selectedCategories.filter(cat => cat !== categoryId);
      onCategoriesChange(newCategories.length === 0 ? ['all'] : newCategories);
    } else {
      onCategoriesChange([...selectedCategories.filter(cat => cat !== 'all'), categoryId]);
    }
  };

  const isSelected = (categoryId: CategoryType) => {
    return selectedCategories.includes(categoryId) || (categoryId !== 'all' && selectedCategories.includes('all'));
  };

  return (
    <div className="px-4 py-4 bg-white border-b border-gray-100">
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {categories.map((category) => {
          const selected = isSelected(category.id);
          return (
            <Button
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              variant="ghost"
              className={`flex-shrink-0 flex flex-col items-center gap-2 p-4 h-auto rounded-2xl transition-all duration-300 hover:scale-105 ${
                selected
                  ? 'bg-gray-900 text-white shadow-lg transform scale-105'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${
                selected ? 'bg-white/20' : category.color
              }`}>
                {category.icon}
              </div>
              <span className="text-xs font-medium whitespace-nowrap">{category.label}</span>
              {selected && category.id !== 'all' && (
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryIconsFilter;
