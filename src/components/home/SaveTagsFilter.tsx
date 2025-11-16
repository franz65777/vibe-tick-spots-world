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
            "relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 shadow-sm backdrop-blur-sm",
            selectedSaveTags.length > 0
              ? "bg-black/90 text-white"
              : "bg-white/80 text-gray-700 hover:bg-white/90"
          )}
        >
          <Filter className="h-4 w-4" />
          {selectedSaveTags.length > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-black/90 text-white rounded-full">
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
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 shadow-sm backdrop-blur-sm",
                selectedSaveTags.includes(option.value)
                  ? "bg-black/90 text-white"
                  : "bg-white/80 text-gray-700 hover:bg-white/90"
              )}
              title={option.labelKey}
            >
              <span className="text-base leading-none">{option.emoji}</span>
            </button>
          ))}
          
          {/* Close button */}
          <button
            onClick={() => setIsExpanded(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-white/80 text-gray-700 hover:bg-white/90 transition-all duration-200 shadow-sm backdrop-blur-sm ml-1"
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default SaveTagsFilter;
