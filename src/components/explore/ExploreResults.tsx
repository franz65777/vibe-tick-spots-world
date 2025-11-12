import { memo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import SimpleCategoryFilter from './SimpleCategoryFilter';
import LocationGrid from './LocationGrid';
import { AllowedCategory } from '@/utils/allowedCategories';

interface ExploreResultsProps {
  searchMode: 'locations' | 'users';
  loading: boolean;
  isSearching: boolean;
  searchQuery: string;
  selectedCategory: AllowedCategory | null;
  onCategorySelect: (category: AllowedCategory | null) => void;
  children?: ReactNode; // For user results
}

const ExploreResults = memo((props: ExploreResultsProps) => {
  const { t } = useTranslation();
  const {
    searchMode,
    loading,
    isSearching,
    searchQuery,
    selectedCategory,
    onCategorySelect,
    children
  } = props;

  if (loading || isSearching) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600 font-medium">
            {isSearching ? t('searching', { ns: 'common' }) : t('loading', { ns: 'common' })}
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      {searchMode === 'locations' ? (
        <>
          {/* Category Filter */}
          <SimpleCategoryFilter
            selectedCategory={selectedCategory}
            onCategorySelect={onCategorySelect}
          />

          {/* Location Grid */}
          <LocationGrid searchQuery={searchQuery} selectedCategory={selectedCategory} />
        </>
      ) : (
        children
      )}
    </>
  );
});

ExploreResults.displayName = 'ExploreResults';

export default ExploreResults;
