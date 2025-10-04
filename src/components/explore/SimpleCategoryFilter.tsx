import React from 'react';
import { AllowedCategory, allowedCategories, categoryDisplayNames } from '@/utils/allowedCategories';
import { CategoryIcon } from '../common/CategoryIcon';

interface SimpleCategoryFilterProps {
  selectedCategory: AllowedCategory | null;
  onCategorySelect: (category: AllowedCategory | null) => void;
}

const SimpleCategoryFilter = ({ selectedCategory, onCategorySelect }: SimpleCategoryFilterProps) => {
  return (
    <div className="grid grid-cols-7 gap-2">
      {allowedCategories.map((category) => {
        const isSelected = selectedCategory === category;
        return (
          <button
            key={category}
            onClick={() => onCategorySelect(isSelected ? null : category)}
            className={`flex items-center justify-center rounded-md transition-transform ${isSelected ? 'ring-2 ring-primary' : ''}`}
            aria-label={categoryDisplayNames[category]}
          >
            <CategoryIcon
              category={category}
              className={`w-7 h-7 ${isSelected ? 'opacity-100' : 'opacity-80'}`}
            />
          </button>
        );
      })}
    </div>
  );
};

export default SimpleCategoryFilter;
