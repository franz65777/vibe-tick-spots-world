import { memo, RefObject } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface ExploreHeaderBarProps {
  searchQuery: string;
  inputFocused: boolean;
  searchInputRef: RefObject<HTMLInputElement>;
  onSearchChange: (query: string) => void;
  onInputFocus: (focused: boolean) => void;
  onClearSearch: () => void;
}

const ExploreHeaderBar = memo((props: ExploreHeaderBarProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    searchQuery,
    inputFocused,
    searchInputRef,
    onSearchChange,
    onInputFocus,
    onClearSearch
  } = props;

  return (
    <div className="bg-background">
      <div className="px-4 py-4">
        {/* Search Bar */}
        <div className="relative flex items-center gap-2">
          {/* Swipe Discovery Button - Hidden when search is active */}
          {!inputFocused && !searchQuery && (
            <Button
              onClick={() => navigate('/discover')}
              variant="ghost"
              size="icon"
              className="shrink-0 h-12 w-12 rounded-2xl bg-muted/50 hover:bg-muted"
            >
              <Sparkles className="w-5 h-5 text-primary" />
            </Button>
          )}
          
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder={t('searchPeople', { ns: 'explore' })}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => onInputFocus(true)}
              onBlur={() => setTimeout(() => onInputFocus(false), 100)}
              className="pl-12 pr-4 h-12 bg-muted/50 border-border focus:bg-background rounded-2xl"
            />
            {searchQuery && (
              <Button
                onClick={onClearSearch}
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted rounded-full"
              >
                ×
              </Button>
            )}
          </div>
          {(inputFocused || searchQuery) && (
            <Button
              onClick={() => searchInputRef.current?.blur()}
              variant="ghost"
              className="text-sm font-medium text-primary hover:text-primary/80 px-3 shrink-0"
            >
              {t('cancel', { ns: 'common' })}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});

ExploreHeaderBar.displayName = 'ExploreHeaderBar';

export default ExploreHeaderBar;
