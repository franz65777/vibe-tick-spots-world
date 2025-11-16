import { useState } from 'react';
import { Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMapFilter } from '@/contexts/MapFilterContext';
import { SAVE_TAG_OPTIONS } from '@/utils/saveTags';

const SaveTagsFilter = () => {
  const { selectedSaveTags, toggleSaveTag } = useMapFilter();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {/* Collapsed state - just icon */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className={cn(
            "flex items-center justify-center w-11 h-11 rounded-full transition-all backdrop-blur-sm border",
            selectedSaveTags.length > 0
              ? "bg-primary/20 border-primary/50 text-primary"
              : "bg-background/80 border-border/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <Filter className="h-4 w-4" />
          {selectedSaveTags.length > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold bg-primary text-primary-foreground rounded-full">
              {selectedSaveTags.length}
            </span>
          )}
        </button>
      )}

      {/* Expanded state - show save tag options (excluding 'general') */}
      {isExpanded && (
        <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm border border-border/50 rounded-full p-1.5 shadow-lg">
          {SAVE_TAG_OPTIONS.filter(opt => opt.value !== 'general').map((option) => (
            <button
              key={option.value}
              onClick={() => toggleSaveTag(option.value)}
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full transition-all text-lg",
                selectedSaveTags.includes(option.value)
                  ? "bg-primary/20 border-2 border-primary scale-110"
                  : "bg-background hover:bg-accent"
              )}
              title={option.labelKey}
            >
              {option.emoji}
            </button>
          ))}
          
          {/* Close button */}
          <button
            onClick={() => setIsExpanded(false)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-muted hover:bg-accent transition-colors ml-1"
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default SaveTagsFilter;
