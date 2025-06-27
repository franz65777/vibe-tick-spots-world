
import React from 'react';
import { Button } from '@/components/ui/button';

export type CategoryType = 'all' | 'restaurant' | 'bar' | 'cafe' | 'hotel' | 'attraction' | 'shop' | 'park' | 'gym' | 'museum';

interface CategoryIconsFilterProps {
  selectedCategories: CategoryType[];
  onCategoriesChange: (categories: CategoryType[]) => void;
}

const CategoryIconsFilter = ({ selectedCategories, onCategoriesChange }: CategoryIconsFilterProps) => {
  const categories = [
    { id: 'all' as CategoryType, icon: '🌟', label: 'All' },
    { id: 'restaurant' as CategoryType, icon: '🍽️', label: 'Food' },
    { id: 'bar' as CategoryType, icon: '🍸', label: 'Drinks' },
    { id: 'cafe' as CategoryType, icon: '☕', label: 'Coffee' },
    { id: 'hotel' as CategoryType, icon: '🏨', label: 'Hotels' },
    { id: 'attraction' as CategoryType, icon: '🎭', label: 'Shows' },
    { id: 'shop' as CategoryType, icon: '🛍️', label: 'Shopping' },
    { id: 'park' as CategoryType, icon: '🌳', label: 'Parks' },
    { id: 'gym' as CategoryType, icon: '💪', label: 'Fitness' },
    { id: 'museum' as CategoryType, icon: '🏛️', label: 'Culture' },
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
    <div className="bg-white px-4 py-3 border-b border-gray-100">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {categories.map((category) => {
          const selected = isSelected(category.id);
          return (
            <Button
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              variant="ghost"
              size="sm"
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 h-auto rounded-full transition-all ${
                selected
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="text-base">{category.icon}</span>
              <span className="text-sm font-medium whitespace-nowrap">{category.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryIconsFilter;
