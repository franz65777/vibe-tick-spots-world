import React from 'react';
import { allowedCategories, AllowedCategory, categoryDisplayNames } from '@/utils/allowedCategories';
import { CategoryIcon } from '@/components/common/CategoryIcon';

interface SwipeCategoryFilterProps {
  selected: AllowedCategory | null;
  onSelect: (category: AllowedCategory | null) => void;
  counts: Record<AllowedCategory, number>;
}

const SwipeCategoryFilter: React.FC<SwipeCategoryFilterProps> = ({ selected, onSelect, counts }) => {
  return (
    <div className="px-4 pb-3 pt-1 bg-background/95 border-b border-border">
      <div className="grid grid-cols-7 gap-2">
        {allowedCategories.map((cat) => {
          const isSelected = selected === cat;
          const count = counts[cat] || 0;
          return (
            <button
              key={cat}
              onClick={() => onSelect(isSelected ? null : cat)}
              className={`relative rounded-md p-1.5 flex items-center justify-center ${isSelected ? 'ring-2 ring-primary bg-accent' : 'bg-card'} ${count === 0 ? 'opacity-50 pointer-events-none' : ''}`}
              aria-pressed={isSelected}
              aria-label={`${categoryDisplayNames[cat]} (${count})`}
            >
              <CategoryIcon category={cat} className={cat.toLowerCase() === 'hotel' || cat.toLowerCase() === 'restaurant' ? 'w-14 h-14' : 'w-8 h-8'} />
              <span className="absolute -top-1 -right-1 text-[10px] min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow">
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SwipeCategoryFilter;
