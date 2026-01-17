import React from 'react';
import { allowedCategories, AllowedCategory, categoryDisplayNames } from '@/utils/allowedCategories';
import { CategoryIcon } from '@/components/common/CategoryIcon';

interface SwipeCategoryFilterProps {
  selected: AllowedCategory | null;
  onSelect: (category: AllowedCategory | null) => void;
  counts: Record<AllowedCategory, number>;
}

const SwipeCategoryFilter: React.FC<SwipeCategoryFilterProps> = ({ selected, onSelect, counts }) => {
  // Filter categories with count > 0
  const visibleCategories = allowedCategories.filter(cat => (counts[cat] || 0) > 0);
  
  if (visibleCategories.length === 0) return null;

  return (
    <div className="px-3 py-2">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1" style={{ scrollSnapType: 'x mandatory' }}>
        {/* "All" button */}
        <button
          onClick={() => onSelect(null)}
          className={`flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-full transition-all ${
            selected === null 
              ? 'bg-primary text-primary-foreground shadow-md' 
              : 'bg-muted/60 text-muted-foreground hover:bg-muted'
          }`}
          style={{ scrollSnapAlign: 'start' }}
        >
          <span className="text-sm font-medium">Tutti</span>
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
            selected === null ? 'bg-primary-foreground/20' : 'bg-foreground/10'
          }`}>
            {Object.values(counts).reduce((a, b) => a + b, 0)}
          </span>
        </button>
        
        {visibleCategories.map((cat) => {
          const isSelected = selected === cat;
          const count = counts[cat] || 0;
          
          return (
            <button
              key={cat}
              onClick={() => onSelect(isSelected ? null : cat)}
              className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
                isSelected 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              }`}
              style={{ scrollSnapAlign: 'start' }}
              aria-pressed={isSelected}
              aria-label={`${categoryDisplayNames[cat]} (${count})`}
            >
              <CategoryIcon category={cat} className="w-6 h-6" />
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                isSelected ? 'bg-primary-foreground/20' : 'bg-foreground/10'
              }`}>
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
