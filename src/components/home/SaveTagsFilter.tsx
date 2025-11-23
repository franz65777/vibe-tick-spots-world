import React from 'react';
import { cn } from '@/lib/utils';
import { useMapFilter } from '@/contexts/MapFilterContext';
import { SAVE_TAG_OPTIONS, SaveTag } from '@/utils/saveTags';
import { useTranslation } from 'react-i18next';

const SaveTagsFilter = () => {
  const { selectedSaveTags, toggleSaveTag } = useMapFilter();
  const { t } = useTranslation();

  return (
    <>
      {SAVE_TAG_OPTIONS.filter(opt => opt.value !== 'general').map((option) => {
        const isSelected = selectedSaveTags.includes(option.value);
        return (
          <button
            key={option.value}
            onClick={() => toggleSaveTag(option.value as SaveTag)}
            className={cn(
              "flex-shrink-0 flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg transition-all duration-200 min-w-[48px]",
              isSelected && "bg-primary/10"
            )}
            aria-pressed={isSelected}
            aria-label={t(option.labelKey, { ns: 'save_tags' })}
          >
            <span className="text-xl leading-none">
              {option.emoji}
            </span>
            <span className={cn(
              "text-[8px] font-medium whitespace-nowrap transition-colors",
              isSelected ? "text-primary" : "text-muted-foreground"
            )}>
              {t(option.labelKey, { ns: 'save_tags' })}
            </span>
          </button>
        );
      })}
    </>
  );
};

export default SaveTagsFilter;
