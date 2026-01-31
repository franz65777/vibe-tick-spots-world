import React from 'react';
import { useTranslation } from 'react-i18next';
import { AllowedCategory, allowedCategories } from '@/utils/allowedCategories';
import { CategoryIcon } from '../common/CategoryIcon';

interface SimpleCategoryFilterProps {
  selectedCategory: AllowedCategory | null;
  onCategorySelect: (category: AllowedCategory | null) => void;
  inline?: boolean;
}

const SimpleCategoryFilter = ({ selectedCategory, onCategorySelect, inline = false }: SimpleCategoryFilterProps) => {
  const { t } = useTranslation('categories');
  
  return (
    <div className={inline ? "flex gap-1.5" : "grid grid-cols-5 gap-2 px-[10px] py-2"}>
      {allowedCategories.map((category) => {
        const isSelected = selectedCategory === category;
        const categoryKey = category.toLowerCase();
        return (
          <button
            key={category}
            onClick={() => onCategorySelect(isSelected ? null : category)}
            className={`flex items-center justify-center rounded-full transition-all shrink-0 ${
              inline 
                ? `p-1.5 ${isSelected ? 'ring-2 ring-primary bg-primary/10' : 'bg-white/60 dark:bg-zinc-800/60'}`
                : `rounded-md p-1 ${isSelected ? 'ring-2 ring-primary bg-primary/10' : ''}`
            }`}
            aria-label={t(categoryKey)}
          >
            <CategoryIcon
              category={category}
              className={`${inline ? 'w-7 h-7' : category.toLowerCase() === 'hotel' || category.toLowerCase() === 'restaurant' ? 'w-12 h-12' : 'w-10 h-10'} ${isSelected ? 'opacity-100' : 'opacity-80'}`}
              sizeMultiplier={inline ? 0.6 : category.toLowerCase() === 'restaurant' ? 0.8 : 1}
            />
          </button>
        );
      })}
    </div>
  );
};

export default SimpleCategoryFilter;
