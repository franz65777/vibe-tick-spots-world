import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { SaveTagFilter } from '@/contexts/MapFilterContext';
import { useTranslation } from 'react-i18next';
import { SAVE_TAG_OPTIONS } from '@/utils/saveTags';

// Import tag icons
import saveTagBeen from '@/assets/save-tag-been.png';
import saveTagToTry from '@/assets/save-tag-to-try.png';
import saveTagFavourite from '@/assets/save-tag-favourite.png';

const TAG_ICONS: Record<string, string> = {
  been: saveTagBeen,
  to_try: saveTagToTry,
  favourite: saveTagFavourite
};

interface SaveTagInlineFiltersProps {
  selectedSaveTags: SaveTagFilter[];
  onToggleSaveTag: (tag: SaveTagFilter) => void;
}

/**
 * Compact inline save tag filters for the drawer header.
 * Memoized to prevent unnecessary re-renders.
 */
const SaveTagInlineFilters: React.FC<SaveTagInlineFiltersProps> = memo(({
  selectedSaveTags,
  onToggleSaveTag
}) => {
  const { t: tSaveTags } = useTranslation('save_tags');

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      {SAVE_TAG_OPTIONS.map(option => {
        const isSelected = selectedSaveTags.includes(option.value);
        const iconSrc = TAG_ICONS[option.value];
        return (
          <button 
            key={option.value} 
            onClick={() => onToggleSaveTag(option.value)} 
            className={cn(
              "flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-full transition-all duration-150",
              "border text-xs font-medium",
              isSelected 
                ? "border-primary/50 bg-primary/15 dark:bg-primary/25 text-primary" 
                : "border-border/40 bg-background/60 text-muted-foreground hover:bg-background/80"
            )}
          >
            {iconSrc ? (
              <img src={iconSrc} alt="" className="w-4 h-4 object-contain" loading="eager" />
            ) : (
              <span className="text-sm">{option.emoji}</span>
            )}
            <span className="hidden sm:inline">{tSaveTags(option.labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
});

SaveTagInlineFilters.displayName = 'SaveTagInlineFilters';

export default SaveTagInlineFilters;
