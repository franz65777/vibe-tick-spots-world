import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Search, Loader2, ChevronDown, Sparkles, MapPin } from 'lucide-react';
import { searchPhoton, PhotonResult } from '@/lib/photonGeocoding';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface CityExplorationPanelProps {
  city: string;
  cityCoords: { lat: number; lng: number };
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (location: PhotonResult) => void;
}

const CityExplorationPanel: React.FC<CityExplorationPanelProps> = ({
  city,
  cityCoords,
  isOpen,
  onClose,
  onLocationSelect,
}) => {
  const { t } = useTranslation();
  const [searchContext, setSearchContext] = useState<string[]>([]);
  const [currentQuery, setCurrentQuery] = useState('');
  const [results, setResults] = useState<PhotonResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragStartY = useRef<number>(0);
  const initialHeight = useRef<number>(0);

  // Load initial locations when panel opens
  useEffect(() => {
    if (isOpen && city) {
      loadInitialLocations();
    }
  }, [isOpen, city]);

  const loadInitialLocations = async () => {
    setIsLoading(true);
    try {
      const results = await searchPhoton(city, cityCoords, 10);
      setResults(results);
    } catch (error) {
      console.error('Failed to load initial locations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!currentQuery.trim()) return;
    
    setIsLoading(true);
    setIsAILoading(true);
    
    try {
      // Build new search context
      const newContext = [...searchContext, currentQuery.trim()];
      
      // Try AI-enhanced search for complex queries
      let searchTerms = [currentQuery];
      if (newContext.length > 1) {
        try {
          const { data } = await supabase.functions.invoke('search-locations-ai', {
            body: { city, searchContext, query: currentQuery }
          });
          if (data?.searchTerms?.length) {
            searchTerms = data.searchTerms;
          }
        } catch (e) {
          console.log('AI search unavailable, using standard search');
        }
      }
      setIsAILoading(false);
      
      // Search with all terms and combine results
      const allResults: PhotonResult[] = [];
      const seenIds = new Set<string>();
      
      for (const term of searchTerms) {
        const fullQuery = `${term} ${city}`;
        const termResults = await searchPhoton(fullQuery, cityCoords, 8);
        
        for (const result of termResults) {
          if (!seenIds.has(result.id)) {
            seenIds.add(result.id);
            allResults.push(result);
          }
        }
      }
      
      setResults(allResults.slice(0, 15));
      setSearchContext(newContext);
      setCurrentQuery('');
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
      setIsAILoading(false);
    }
  };

  const clearContext = () => {
    setSearchContext([]);
    loadInitialLocations();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Drag handling for expand/collapse
  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
    initialHeight.current = panelRef.current?.offsetHeight || 0;
  };

  const handleDragEnd = (e: React.TouchEvent | React.MouseEvent) => {
    const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;
    const delta = clientY - dragStartY.current;
    
    if (delta < -50) {
      // Dragged up - expand
      setExpanded(true);
    } else if (delta > 50) {
      // Dragged down
      if (expanded) {
        setExpanded(false);
      } else {
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className={cn(
        "absolute left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-lg transition-all duration-300 ease-out",
        expanded ? "h-[70vh]" : "h-[45vh]"
      )}
      style={{ top: '100%' }}
    >
      {/* Drag handle */}
      <div
        className="flex justify-center py-2 cursor-grab active:cursor-grabbing touch-none"
        onMouseDown={handleDragStart}
        onMouseUp={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchEnd={handleDragEnd}
      >
        <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
      </div>

      {/* Header */}
      <div className="px-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">{city}</h3>
          <ChevronDown 
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              expanded && "rotate-180"
            )}
          />
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-full">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Search context tags */}
      {searchContext.length > 0 && (
        <div className="px-4 pb-2 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">{t('searchContext', { ns: 'common', defaultValue: 'Searching:' })}</span>
          {searchContext.map((ctx, i) => (
            <span key={i} className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
              {ctx}
            </span>
          ))}
          <button onClick={clearContext} className="text-xs text-muted-foreground hover:text-foreground underline">
            {t('clear', { ns: 'common', defaultValue: 'Clear' })}
          </button>
        </div>
      )}

      {/* Search input */}
      <div className="px-4 pb-3">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={currentQuery}
            onChange={(e) => setCurrentQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={searchContext.length > 0 
              ? t('refineSearch', { ns: 'common', defaultValue: 'Refine your search...' })
              : t('searchInCity', { city, ns: 'common', defaultValue: `Find places in ${city}...` })
            }
            className="w-full h-10 pl-4 pr-20 rounded-full bg-muted/50 border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {isAILoading && (
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            )}
            <button
              onClick={handleSearch}
              disabled={isLoading || !currentQuery.trim()}
              className="p-1.5 bg-primary text-primary-foreground rounded-full disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results list */}
      <div className="px-4 overflow-y-auto" style={{ maxHeight: expanded ? 'calc(70vh - 160px)' : 'calc(45vh - 160px)' }}>
        {isLoading && results.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : results.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {t('noLocationsFound', { ns: 'common', defaultValue: 'No locations found' })}
          </p>
        ) : (
          <div className="space-y-2 pb-4">
            {results.map((location) => (
              <button
                key={location.id}
                onClick={() => onLocationSelect(location)}
                className="w-full p-3 flex items-start gap-3 bg-muted/30 hover:bg-muted/50 rounded-xl transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{location.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{location.displayAddress}</p>
                  <span className="text-[10px] px-2 py-0.5 mt-1 inline-block rounded-full bg-muted text-muted-foreground capitalize">
                    {location.category === 'entertainment' ? 'fun' : location.category}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CityExplorationPanel;
