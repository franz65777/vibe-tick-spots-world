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
}: SaveLocationDropdownProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const handleSaveWithTag = (tag: SaveTag) => {
    onSave(tag);
    setOpen(false);
  };

  // Get the emoji for the current save tag
  const currentTagOption = SAVE_TAG_OPTIONS.find(opt => opt.value === currentSaveTag);
  const currentEmoji = currentTagOption?.emoji || '🔖';

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
            <span className="text-xl">{currentEmoji}</span>
            {showLabel && <span className="text-xs">{t('saved', { ns: 'common', defaultValue: 'Saved' })}</span>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-56 bg-background border-border z-[100]"
        >
          <DropdownMenuItem
            onClick={onUnsave}
            className="cursor-pointer flex items-center gap-3 py-3 px-4 hover:bg-accent text-destructive"
          >
            <BookmarkCheck className="h-5 w-5" />
            <span className="text-sm font-medium">{t('unsave', { ns: 'common', defaultValue: 'Unsave' })}</span>
          </DropdownMenuItem>
          {SAVE_TAG_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleSaveWithTag(option.value)}
              className={`cursor-pointer flex items-center gap-3 py-3 px-4 hover:bg-accent ${option.value === currentSaveTag ? 'bg-accent/50' : ''}`}
            >
              <span className="text-xl">{option.emoji}</span>
              <span className="text-sm font-medium">{t(option.labelKey)}</span>
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
        align="end" 
        className="w-56 bg-background border-border z-[100]"
      >
        {SAVE_TAG_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleSaveWithTag(option.value)}
            className="cursor-pointer flex items-center gap-3 py-3 px-4 hover:bg-accent"
          >
            <span className="text-xl">{option.emoji}</span>
            <span className="text-sm font-medium">{t(option.labelKey)}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
