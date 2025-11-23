import React from 'react';
import { cn } from '@/lib/utils';
import { useMapFilter } from '@/contexts/MapFilterContext';
import { SAVE_TAG_OPTIONS, SaveTag } from '@/utils/saveTags';
import { useTranslation } from 'react-i18next';

const SaveTagsFilter = () => {
  const { selectedSaveTags, toggleSaveTag } = useMapFilter();
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-4 gap-2 px-[10px] py-3">
      {SAVE_TAG_OPTIONS.filter(opt => opt.value !== 'general').map((option) => {
        const isSelected = selectedSaveTags.includes(option.value);
        return (
          <button
            key={option.value}
            onClick={() => toggleSaveTag(option.value as SaveTag)}
            className={cn(
              "relative flex items-center justify-center rounded-md transition-transform p-2",
              isSelected ? 'ring-2 ring-primary bg-primary/10' : 'bg-card'
            )}
            aria-pressed={isSelected}
            aria-label={t(option.labelKey, { ns: 'save_tags' })}
          >
            <span className={cn(
              "text-3xl leading-none",
              isSelected ? 'opacity-100' : 'opacity-80'
            )}>
              {option.emoji}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default SaveTagsFilter;
