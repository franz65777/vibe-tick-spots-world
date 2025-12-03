import React from 'react';
import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface NoResultsProps {
  searchQuery: string;
}

const NoResults = ({ searchQuery }: NoResultsProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-0">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
        <Users className="w-10 h-10 text-gray-400" />
      </div>
      
      <h3 className="font-semibold text-gray-900 mb-3 text-lg">
        {t('noUsersFoundTitle', { ns: 'explore' })}
      </h3>
      
      <p className="text-gray-500 text-center text-sm mb-4 max-w-sm leading-relaxed">
        {searchQuery 
          ? t('noUsersFoundForQuery', { ns: 'explore', query: searchQuery })
          : t('noUsersFoundGeneric', { ns: 'explore' })}
      </p>
    </div>
  );
};

export default NoResults;
