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
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const SaveLocationDropdown = ({
  isSaved,
  onSave,
  onUnsave,
  disabled = false,
  variant = 'ghost',
  size = 'icon',
}: SaveLocationDropdownProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const handleSaveWithTag = (tag: SaveTag) => {
    onSave(tag);
    setOpen(false);
  };

  if (isSaved) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={onUnsave}
        disabled={disabled}
        className="text-primary hover:text-primary/80"
      >
        <BookmarkCheck className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled}
        >
          <Bookmark className="h-5 w-5" />
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
