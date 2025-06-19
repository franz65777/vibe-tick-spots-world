
import React from 'react';
import CategoryFilter from './CategoryFilter';

interface FilterButtonsProps {
  activeFilter: 'following' | 'popular';
  onFilterChange: (filter: 'following' | 'popular') => void;
  selectedCategories: string[];
  onCategoryChange: (categories: string[]) => void;
}

const FilterButtons = ({ 
  activeFilter, 
  onFilterChange, 
  selectedCategories, 
  onCategoryChange 
}: FilterButtonsProps) => {
  const filters = [
    { key: 'following' as const, label: 'Following' },
    { key: 'popular' as const, label: 'Popular' },
  ];

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
        {/* Main Filter Buttons */}
        <div className="flex items-center gap-2">
          {filters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => onFilterChange(filter.key)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm
                whitespace-nowrap transition-all duration-200 min-w-fit
                ${activeFilter === filter.key
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              <span>{filter.label}</span>
            </button>
          ))}
        </div>

        {/* Category Filter */}
        <CategoryFilter
          selectedCategories={selectedCategories}
          onCategoryChange={onCategoryChange}
        />
      </div>
    </div>
  );
};

export default FilterButtons;
