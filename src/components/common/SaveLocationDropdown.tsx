import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { SAVE_TAG_OPTIONS, type SaveTag } from '@/utils/saveTags';

interface SaveLocationDropdownProps {
  isSaved: boolean;
  onSave: (tag: SaveTag) => void;
  onUnsave: () => void;
  disabled?: boolean;
  variant?: 'default' | 'ghost' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  currentSaveTag?: SaveTag;
  showLabel?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const SaveLocationDropdown = ({
  isSaved,
  onSave,
  onUnsave,
  disabled = false,
  variant = 'ghost',
  size = 'icon',
  currentSaveTag = 'general',
  showLabel = false,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: SaveLocationDropdownProps) => {
  const { t } = useTranslation();
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  const handleSaveWithTag = (tag: SaveTag) => {
    onSave(tag);
    setOpen(false);
  };

  // Get the emoji for the current save tag
  const currentTagOption = SAVE_TAG_OPTIONS.find(opt => opt.value === currentSaveTag);
  const currentEmoji = currentTagOption?.emoji || '📍';
  
  // Function to get the display label for a save tag
  const getTagLabel = (tag: SaveTag) => {
    if (tag === 'general') {
      return t('save', { ns: 'common', defaultValue: 'Save' });
    }
    const option = SAVE_TAG_OPTIONS.find(opt => opt.value === tag);
    if (option) {
      // Extract just the category name without the save_tags prefix
      const parts = option.labelKey.split('.');
      const key = parts[parts.length - 1];
      return t(key, { ns: 'save_tags', defaultValue: key });
    }
    return t('save', { ns: 'common', defaultValue: 'Save' });
  };

  if (isSaved) {
    return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant as any}
            size={size}
            disabled={disabled}
            className={showLabel ? "flex-col h-auto py-3 gap-1 rounded-2xl" : ""}
          >
            {currentSaveTag === 'general' ? (
              <Bookmark className="h-5 w-5 fill-current" />
            ) : (
              <span className="text-xl">{currentEmoji}</span>
            )}
            {showLabel && <span className="text-xs">{getTagLabel(currentSaveTag)}</span>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="center"
          side="top"
          sideOffset={8}
          className="w-56 bg-background/95 backdrop-blur-sm border-border rounded-2xl shadow-lg z-[9999]"
        >
          <DropdownMenuItem
            onClick={onUnsave}
            className="cursor-pointer flex items-center gap-3 py-3 px-4 hover:bg-accent text-destructive rounded-xl m-1"
          >
            <BookmarkCheck className="h-5 w-5" />
            <span className="text-sm font-medium">{t('unsave', { ns: 'common', defaultValue: 'Unsave' })}</span>
          </DropdownMenuItem>
          {SAVE_TAG_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleSaveWithTag(option.value)}
              className={`cursor-pointer flex items-center gap-3 py-3 px-4 hover:bg-accent rounded-xl m-1 ${option.value === currentSaveTag ? 'bg-accent/50' : ''}`}
            >
              {option.value === 'general' ? (
                <Bookmark className="h-5 w-5" />
              ) : (
                <span className="text-xl">{option.emoji}</span>
              )}
              <span className="text-sm font-medium">{getTagLabel(option.value)}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant as any}
          size={size}
          disabled={disabled}
          className={showLabel ? "flex-col h-auto py-3 gap-1 rounded-2xl" : ""}
        >
          <Bookmark className="h-5 w-5" />
          {showLabel && <span className="text-xs">{t('save', { ns: 'common', defaultValue: 'Save' })}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="center"
        side="top"
        sideOffset={8}
        className="w-56 bg-background/95 backdrop-blur-sm border-border rounded-2xl shadow-lg z-[9999]"
      >
        {SAVE_TAG_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleSaveWithTag(option.value)}
            className="cursor-pointer flex items-center gap-3 py-3 px-4 hover:bg-accent rounded-xl m-1"
          >
            {option.value === 'general' ? (
              <Bookmark className="h-5 w-5" />
            ) : (
              <span className="text-xl">{option.emoji}</span>
            )}
            <span className="text-sm font-medium">{getTagLabel(option.value)}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
