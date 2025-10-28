
import React, { useState } from 'react';
import { SlidersHorizontal, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SearchFiltersModal from './SearchFiltersModal';
import { useTranslation } from 'react-i18next';

type SortBy = 'proximity' | 'likes' | 'saves' | 'following' | 'recent';

interface SearchFiltersProps {
  sortBy: SortBy;
  onSortChange: (sortBy: SortBy) => void;
  filters: string[];
  onFiltersChange: (filters: string[]) => void;
  showFilters: boolean;
}

const SearchFilters = ({
  sortBy,
  onSortChange,
  filters,
  onFiltersChange,
  showFilters
}: SearchFiltersProps) => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!showFilters) return null;

  const activeFiltersCount = filters?.length || 0;
  const hasActiveFilters = activeFiltersCount > 0 || sortBy !== 'proximity';

  return (
    <div className="px-4 py-3 border-b border-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">{t('sortFilter', { ns: 'explore' })}</span>
          {hasActiveFilters && (
            <Badge variant="secondary" className="h-5 px-2 text-xs">
              {activeFiltersCount + (sortBy !== 'proximity' ? 1 : 0)} {t('active', { ns: 'explore' })}
            </Badge>
          )}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="h-8 px-3 gap-2"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {t('filter', { ns: 'explore' })}
        </Button>
      </div>

      {/* Active filters display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {filters.map((filter) => (
            <Badge
              key={filter}
              variant="outline"
              className="h-6 px-2 text-xs capitalize cursor-pointer hover:bg-gray-100"
              onClick={() => onFiltersChange(filters.filter(f => f !== filter))}
            >
              {filter}
              <button className="ml-1 text-gray-400 hover:text-gray-600">×</button>
            </Badge>
          ))}
        </div>
      )}

      <SearchFiltersModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedSort={sortBy}
        onSortChange={onSortChange}
        selectedFilters={filters}
        onFiltersChange={onFiltersChange}
      />
    </div>
  );
};

export default SearchFilters;
