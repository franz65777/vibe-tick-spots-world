import React from 'react';
import { useTranslation } from 'react-i18next';
import noUsersCharacter from '@/assets/no-users-character.png';

interface NoResultsProps {
  searchQuery: string;
  onTryDifferent?: () => void;
}

const NoResults = ({ searchQuery, onTryDifferent }: NoResultsProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 animate-fade-in">
      <div className="relative mb-8">
        <img 
          src={noUsersCharacter} 
          alt="" 
          className="w-32 h-32 object-contain opacity-90" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent rounded-full" />
      </div>
      
      <h3 className="font-semibold text-foreground mb-2 text-lg text-center">
        {t('noUsersFoundTitle', { ns: 'explore' })}
      </h3>
      
      <p className="text-muted-foreground text-center text-sm mb-6 max-w-xs leading-relaxed">
        {searchQuery 
          ? t('noUsersFoundForQuery', { ns: 'explore', query: searchQuery })
          : t('noUsersFoundGeneric', { ns: 'explore' })}
      </p>
      
      {onTryDifferent && (
        <button
          onClick={onTryDifferent}
          className="text-sm text-primary font-medium hover:text-primary/80 transition-colors"
        >
          {t('tryDifferentSearch', { ns: 'explore', defaultValue: 'Try a different search' })}
        </button>
      )}
    </div>
  );
};

export default NoResults;
