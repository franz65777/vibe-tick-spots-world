import { memo, RefObject } from 'react';
import { Search, MapPin, Users, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface ExploreHeaderBarProps {
  searchMode: 'locations' | 'users';
  searchQuery: string;
  inputFocused: boolean;
  searchInputRef: RefObject<HTMLInputElement>;
  onSearchModeChange: (mode: 'locations' | 'users') => void;
  onSearchChange: (query: string) => void;
  onInputFocus: (focused: boolean) => void;
  onClearSearch: () => void;
  onAiClick?: () => void;
}

const ExploreHeaderBar = memo((props: ExploreHeaderBarProps) => {
  const { t } = useTranslation();
  const {
    searchMode,
    searchQuery,
    inputFocused,
    searchInputRef,
    onSearchModeChange,
    onSearchChange,
    onInputFocus,
    onClearSearch,
    onAiClick
  } = props;

  return (
    <div className="bg-background pt-safe">
      <div className="px-2.5 py-4 pt-2">
        {/* Search Mode Toggle */}
        <div className="flex bg-muted/10 backdrop-blur-md border border-border/10 rounded-2xl p-1 mb-4">
          <button
            onClick={() => onSearchModeChange('locations')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
              searchMode === 'locations'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MapPin className="w-4 h-4" />
            {t('places', { ns: 'explore' })}
          </button>
          <button
            onClick={() => onSearchModeChange('users')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
              searchMode === 'users'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-4 h-4" />
            {t('people', { ns: 'explore' })}
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative flex items-center gap-2">
          {/* AI Assistant Button - Hidden when search is active */}
          {!inputFocused && !searchQuery && (
            <Button
              onClick={onAiClick}
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
              placeholder={
                searchMode === 'locations'
                  ? t('searchPlaces', { ns: 'explore' })
                  : t('searchPeople', { ns: 'explore' })
              }
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
