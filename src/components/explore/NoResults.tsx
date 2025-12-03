import React from 'react';
import { useTranslation } from 'react-i18next';
import noUsersCharacter from '@/assets/no-users-character.png';

interface NoResultsProps {
  searchQuery: string;
}

const NoResults = ({ searchQuery }: NoResultsProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-0">
      <img src={noUsersCharacter} alt="" className="w-24 h-24 mb-6" />
      
      <h3 className="font-semibold text-foreground mb-3 text-lg">
        {t('noUsersFoundTitle', { ns: 'explore' })}
      </h3>
      
      <p className="text-muted-foreground text-center text-sm mb-4 max-w-sm leading-relaxed">
        {searchQuery 
          ? t('noUsersFoundForQuery', { ns: 'explore', query: searchQuery })
          : t('noUsersFoundGeneric', { ns: 'explore' })}
      </p>
    </div>
  );
};

export default NoResults;
