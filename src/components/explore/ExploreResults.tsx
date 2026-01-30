import { memo, ReactNode } from 'react';
import SearchResultsSkeleton from '@/components/common/skeletons/SearchResultsSkeleton';

interface ExploreResultsProps {
  loading: boolean;
  isSearching: boolean;
  searchMode?: 'locations' | 'users';
  children?: ReactNode;
}

const ExploreResults = memo((props: ExploreResultsProps) => {
  const {
    loading,
    isSearching,
    searchMode = 'locations',
    children
  } = props;

  if (loading || isSearching) {
    return <SearchResultsSkeleton mode={searchMode} />;
  }

  return <>{children}</>;
});

ExploreResults.displayName = 'ExploreResults';

export default ExploreResults;
