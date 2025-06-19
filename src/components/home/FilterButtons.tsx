
import React from 'react';

interface FilterButtonsProps {
  activeFilter: 'following' | 'popular' | 'new';
  onFilterChange: (filter: 'following' | 'popular' | 'new') => void;
  newCount?: number;
}

const FilterButtons = ({ activeFilter, onFilterChange, newCount = 0 }: FilterButtonsProps) => {
  const filters = [
    { key: 'following' as const, label: 'Following', count: null },
    { key: 'popular' as const, label: 'Popular', count: null },
    { key: 'new' as const, label: 'New', count: newCount > 0 ? newCount : null },
  ];

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        {filters.map((filter) => (
          <button
            key={filter.key}
            onClick={() => onFilterChange(filter.key)}
            className={`
              relative flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm
              whitespace-nowrap transition-all duration-200 min-w-fit
              ${activeFilter === filter.key
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            <span>{filter.label}</span>
            {filter.count && filter.count > 0 && (
              <span className={`
                inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full
                ${activeFilter === filter.key
                  ? 'bg-white text-blue-600'
                  : 'bg-blue-600 text-white'
                }
              `}>
                {filter.count > 99 ? '99+' : filter.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FilterButtons;
