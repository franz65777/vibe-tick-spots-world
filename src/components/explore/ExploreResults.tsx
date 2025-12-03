import { memo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface ExploreResultsProps {
  loading: boolean;
  isSearching: boolean;
  children?: ReactNode; // For user results
}

const ExploreResults = memo((props: ExploreResultsProps) => {
  const { t } = useTranslation();
  const {
    loading,
    isSearching,
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

  return <>{children}</>;
});

ExploreResults.displayName = 'ExploreResults';

export default ExploreResults;
