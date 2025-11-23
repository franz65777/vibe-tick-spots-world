import React from 'react';
import { cn } from '@/lib/utils';
import { useMapFilter } from '@/contexts/MapFilterContext';
import { SAVE_TAG_OPTIONS, SaveTag } from '@/utils/saveTags';
import { useTranslation } from 'react-i18next';

const SaveTagsFilter = () => {
  const { selectedSaveTags, toggleSaveTag } = useMapFilter();
  const { t } = useTranslation();

  // Only show when there are active save tags
  if (selectedSaveTags.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-2 px-[10px] py-2 overflow-x-auto">
      {SAVE_TAG_OPTIONS.filter(opt => opt.value !== 'general').map((option) => {
        const isSelected = selectedSaveTags.includes(option.value);
        return (
          <button
            key={option.value}
            onClick={() => toggleSaveTag(option.value as SaveTag)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all shrink-0",
              isSelected 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-card hover:bg-accent'
            )}
            aria-pressed={isSelected}
            aria-label={t(option.labelKey, { ns: 'save_tags' })}
          >
            <span className="text-2xl leading-none">
              {option.emoji}
            </span>
            <span className="text-[10px] font-medium whitespace-nowrap">
              {t(option.labelKey, { ns: 'save_tags' })}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default SaveTagsFilter;
