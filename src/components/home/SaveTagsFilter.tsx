import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useMapFilter } from '@/contexts/MapFilterContext';
import { SAVE_TAG_OPTIONS, SaveTag } from '@/utils/saveTags';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal } from 'lucide-react';
import saveTagBeen from '@/assets/save-tag-been.png';
import saveTagToTry from '@/assets/save-tag-to-try.png';
import saveTagFavourite from '@/assets/save-tag-favourite.png';

// Map tag values to imported icons
const TAG_ICONS: Record<string, string> = {
  been: saveTagBeen,
  to_try: saveTagToTry,
  favourite: saveTagFavourite,
};

const SaveTagsFilter = () => {
  const { selectedSaveTags, toggleSaveTag } = useMapFilter();
  const { t } = useTranslation();
  const [showFilters, setShowFilters] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowFilters(!showFilters)}
        className={cn(
          "flex-shrink-0 flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg transition-all duration-200 min-w-[48px]",
          showFilters && "bg-primary/10"
        )}
        aria-label="Toggle save filters"
      >
        <SlidersHorizontal className={cn(
          "w-5 h-5 transition-colors",
          showFilters ? "text-primary" : "text-muted-foreground"
        )} />
        <span className={cn(
          "text-[8px] font-medium whitespace-nowrap transition-colors",
          showFilters ? "text-primary" : "text-muted-foreground"
        )}>
          {t('explore:filters')}
        </span>
      </button>

      {showFilters && SAVE_TAG_OPTIONS.map((option) => {
        const isSelected = selectedSaveTags.includes(option.value);
        const iconSrc = TAG_ICONS[option.value];
        return (
          <button
            key={option.value}
            onClick={() => toggleSaveTag(option.value)}
            className={cn(
              "flex-shrink-0 flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg transition-all duration-200 min-w-[48px]",
              isSelected && "bg-primary/10"
            )}
            aria-pressed={isSelected}
            aria-label={t(option.labelKey, { ns: 'save_tags' })}
          >
            {iconSrc ? (
              <img src={iconSrc} alt="" className="w-5 h-5 object-contain" />
            ) : (
              <span className="text-xl leading-none">{option.emoji}</span>
            )}
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
