/**
 * Optimized Places Autocomplete Component
 * 
 * Uses hybrid search: DB → Google (ID Only = FREE) → Nominatim fallback
 * Designed for ultra-fast, reliable place search at $0/month cost
 */

import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Loader2, Building2, Database, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useOptimizedPlacesSearch, SearchResult } from '@/hooks/useOptimizedPlacesSearch';
import { useTranslation } from 'react-i18next';
import { CategoryIcon } from '@/components/common/CategoryIcon';

interface OptimizedPlacesAutocompleteProps {
  onPlaceSelect: (place: {
    name: string;
    address: string;
    coordinates: { lat: number; lng: number };
    city: string;
    category?: string;
    google_place_id?: string;
    isCity?: boolean;
  }) => void;
  placeholder?: string;
  className?: string;
  userLocation?: { lat: number; lng: number } | null;
  disabled?: boolean;
  autoFocus?: boolean;
}

const OptimizedPlacesAutocomplete = ({
  onPlaceSelect,
  placeholder = 'Search for a place...',
  className = '',
  userLocation,
  disabled = false,
  autoFocus = false,
}: OptimizedPlacesAutocompleteProps) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const {
    query,
    setQuery,
    databaseResults,
    googleResults,
    isLoading,
    getPlaceDetails,
  } = useOptimizedPlacesSearch({ userLocation, debounceMs: 150 });

  // Filter out cities - only show specific locations/places
  const filteredDatabaseResults = databaseResults.filter(r => !r.isCity);
  const filteredGoogleResults = googleResults.filter(r => !r.isCity);

  const hasResults = filteredDatabaseResults.length > 0 || filteredGoogleResults.length > 0;
  const allResults = [...filteredDatabaseResults, ...filteredGoogleResults];

  // Handle place selection
  const handleSelect = async (result: SearchResult) => {
    // If it's from database, we already have coordinates
    if (result.source === 'database' && result.lat && result.lng) {
      onPlaceSelect({
        name: result.name,
        address: result.address,
        coordinates: { lat: result.lat, lng: result.lng },
        city: result.city,
        category: result.category,
        google_place_id: result.google_place_id,
        isCity: result.isCity,
      });
      setQuery(result.name);
      setShowResults(false);
      return;
    }

    // If it's from Nominatim, we already have coordinates
    if (result.source === 'nominatim' && result.lat && result.lng) {
      onPlaceSelect({
        name: result.name,
        address: result.address,
        coordinates: { lat: result.lat, lng: result.lng },
        city: result.city,
        category: result.category,
        isCity: result.isCity,
      });
      setQuery(result.name);
      setShowResults(false);
      return;
    }

    // If it's from Google, we need to fetch details (uses 10k free/month)
    if (result.source === 'google' && result.google_place_id) {
      const details = await getPlaceDetails(result.google_place_id);
      if (details && details.lat && details.lng) {
        onPlaceSelect({
          name: details.name,
          address: details.address,
          coordinates: { lat: details.lat, lng: details.lng },
          city: details.city,
          category: details.category,
          google_place_id: details.google_place_id,
          isCity: details.isCity,
        });
        setQuery(details.name);
        setShowResults(false);
      }
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || allResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, allResults.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < allResults.length) {
          handleSelect(allResults[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowResults(false);
        break;
    }
  };

  // Show results when typing
  useEffect(() => {
    if (query.length >= 2) {
      setShowResults(true);
      setSelectedIndex(-1);
    } else {
      setShowResults(false);
    }
  }, [query]);

  // Source icon component
  const SourceIcon = ({ source }: { source: string }) => {
    switch (source) {
      case 'database':
        return <Database className="w-3 h-3 text-green-500" />;
      case 'google':
        return <Globe className="w-3 h-3 text-blue-500" />;
      default:
        return <MapPin className="w-3 h-3 text-muted-foreground" />;
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className="pr-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Results dropdown - Clean minimal design */}
      {showResults && hasResults && (
        <div className="absolute z-50 w-full mt-2 bg-card border border-border/50 rounded-xl shadow-xl max-h-[320px] overflow-y-auto scrollbar-hide">
          {/* Database results section */}
          {filteredDatabaseResults.length > 0 && (
            <>
              <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border/30">
                <Database className="w-3 h-3" />
                {t('savedPlaces', { ns: 'common', defaultValue: 'Luoghi salvati' })}
              </div>
              {filteredDatabaseResults.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  className={`w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-accent/50 active:bg-accent transition-colors text-left ${
                    selectedIndex === index ? 'bg-accent/50' : ''
                  } ${index < filteredDatabaseResults.length - 1 ? 'border-b border-border/20' : ''}`}
                >
                  <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center bg-primary/10 rounded-lg">
                    {result.category ? (
                      <CategoryIcon category={result.category} className="w-5 h-5" />
                    ) : (
                      <MapPin className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground truncate">
                      {result.name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {result.city}{result.city && result.address ? ' • ' : ''}{result.address}
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}

          {/* External results section */}
          {filteredGoogleResults.length > 0 && (
            <>
              <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border/30 bg-muted/20">
                <Globe className="w-3 h-3" />
                {t('suggestions', { ns: 'common', defaultValue: 'Suggerimenti' })}
              </div>
              {filteredGoogleResults.map((result, index) => {
                const globalIndex = filteredDatabaseResults.length + index;
                return (
                  <button
                    key={result.id}
                    onClick={() => handleSelect(result)}
                    className={`w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-accent/50 active:bg-accent transition-colors text-left ${
                      selectedIndex === globalIndex ? 'bg-accent/50' : ''
                    } ${index < filteredGoogleResults.length - 1 ? 'border-b border-border/20' : ''}`}
                  >
                    <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center bg-blue-500/10 rounded-lg">
                      <MapPin className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground truncate">
                        {result.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {result.address}
                      </div>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* No results message */}
      {showResults && !isLoading && query.length >= 2 && !hasResults && (
        <div className="absolute z-50 w-full mt-2 bg-background border border-border rounded-2xl shadow-lg p-4 text-center text-muted-foreground text-sm">
          {t('noPlacesFound', { ns: 'add', defaultValue: 'Nessun luogo trovato per' })} "{query}"
        </div>
      )}
    </div>
  );
};

export default OptimizedPlacesAutocomplete;
