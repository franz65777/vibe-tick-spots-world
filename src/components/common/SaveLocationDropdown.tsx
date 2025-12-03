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
import saveTagDate from '@/assets/save-tag-date.png';
import saveTagBirthday from '@/assets/save-tag-birthday.png';
import saveTagNightOut from '@/assets/save-tag-night-out.png';
import saveTagFamily from '@/assets/save-tag-family.png';

// Map tag values to imported icons
const TAG_ICONS: Record<string, string> = {
  date_night: saveTagDate,
  birthday: saveTagBirthday,
  night_out: saveTagNightOut,
  family: saveTagFamily,
};

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

// Helper to render tag icon (image or emoji fallback)
const TagIcon = ({ option, className = "w-5 h-5" }: { option: typeof SAVE_TAG_OPTIONS[0], className?: string }) => {
  const iconSrc = TAG_ICONS[option.value];
  if (iconSrc) {
    return <img src={iconSrc} alt="" className={`${className} object-contain`} />;
  }
  return <span className="text-xl">{option.emoji}</span>;
};

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

  // Get the current tag option
  const currentTagOption = SAVE_TAG_OPTIONS.find(opt => opt.value === currentSaveTag);
  
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
            ) : currentTagOption ? (
              <TagIcon option={currentTagOption} />
            ) : (
              <Bookmark className="h-5 w-5 fill-current" />
            )}
            {showLabel && <span className="text-xs">{getTagLabel(currentSaveTag)}</span>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="center"
          side="top"
          sideOffset={8}
          className="w-56 bg-background/95 backdrop-blur-sm border-border rounded-2xl shadow-lg z-[9999] pl-2.5"
        >
          {SAVE_TAG_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleSaveWithTag(option.value)}
              className={"cursor-pointer flex items-center gap-3 py-3 px-4 hover:bg-accent rounded-xl m-1"}
            >
              {option.value === 'general' ? (
                <Bookmark className="h-5 w-5" />
              ) : (
                <TagIcon option={option} />
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
        className="w-56 bg-background/95 backdrop-blur-sm border-border rounded-2xl shadow-lg z-[9999] pl-2.5"
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
              <TagIcon option={option} />
            )}
            <span className="text-sm font-medium">{getTagLabel(option.value)}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
