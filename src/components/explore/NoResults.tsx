import React from 'react';
import { MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface NoResultsProps {
  searchMode: 'locations' | 'users';
  searchQuery: string;
  onAddLocation?: () => void;
}

const NoResults = ({ searchMode, searchQuery, onAddLocation }: NoResultsProps) => {
  const { t } = useTranslation();

  const messages = {
    locations: {
      title: t('noResults', { ns: 'explore' }),
      description: t('tryDifferentSearch', { ns: 'explore' }),
      icon: MapPin as any,
      actionText: t('add', { ns: 'common' })
    },
    users: {
      title: t('noResults', { ns: 'explore' }),
      description: t('tryDifferentSearch', { ns: 'explore' }),
      icon: Users as any
    }
  } as const;

  const config = messages[searchMode];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-0">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
        <Icon className="w-10 h-10 text-gray-400" />
      </div>
      
      <h3 className="font-semibold text-gray-900 mb-3 text-lg">
        {config.title}
      </h3>
      
      <p className="text-gray-500 text-center text-sm mb-4 max-w-sm leading-relaxed">
        {config.description}
      </p>

      {searchMode === 'locations' && onAddLocation && (
        <Button
          onClick={onAddLocation}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          {t('add', { ns: 'common' })}
        </Button>
      )}
      {/* For users mode we intentionally remove the Invite Friends box */}
    </div>
  );
};

export default NoResults;
