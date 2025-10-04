import React from 'react';
import { AllowedCategory, allowedCategories, categoryDisplayNames } from '@/utils/allowedCategories';
import { CategoryIcon } from '../common/CategoryIcon';

interface SimpleCategoryFilterProps {
  selectedCategory: AllowedCategory | null;
  onCategorySelect: (category: AllowedCategory | null) => void;
}

const SimpleCategoryFilter = ({ selectedCategory, onCategorySelect }: SimpleCategoryFilterProps) => {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
      {allowedCategories.map((category) => {
        const isSelected = selectedCategory === category;
        return (
          <button
            key={category}
            onClick={() => onCategorySelect(isSelected ? null : category)}
            className={`flex-shrink-0 flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
              isSelected
                ? 'bg-gray-900'
                : 'bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <CategoryIcon
              category={category}
              className={`w-8 h-8 ${isSelected ? 'opacity-100' : 'opacity-70'}`}
            />
            <span className={`text-xs font-medium ${
              isSelected ? 'text-white' : 'text-gray-600'
            }`}>
              {categoryDisplayNames[category]}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default SimpleCategoryFilter;
