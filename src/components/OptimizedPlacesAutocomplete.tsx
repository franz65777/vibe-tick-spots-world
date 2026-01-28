/**
 * Optimized Places Autocomplete Component
 * 
 * Uses hybrid search: DB → Google (ID Only = FREE) → Nominatim fallback
 * Designed for ultra-fast, reliable place search at $0/month cost
 * 
 * Features:
 * - 3D category icons matching Home page design
 * - Filters cities out when used in Add page
 * - Callback to notify parent of result state
 */

import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useOptimizedPlacesSearch, SearchResult } from '@/hooks/useOptimizedPlacesSearch';
import { useTranslation } from 'react-i18next';
import { getCategoryImage } from '@/utils/categoryIcons';

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
  onResultsChange?: (hasResults: boolean, isSearching: boolean) => void;
}

const OptimizedPlacesAutocomplete = ({
  onPlaceSelect,
  placeholder = 'Search for a place...',
  className = '',
  userLocation,
  disabled = false,
  autoFocus = false,
  onResultsChange,
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
  } = useOptimizedPlacesSearch({ userLocation, debounceMs: 150, filterCitiesOut: true });

  // Filter out cities - only show specific locations/places
  const filteredDatabaseResults = databaseResults.filter(r => !r.isCity);
  const filteredGoogleResults = googleResults.filter(r => !r.isCity);

  const hasResults = filteredDatabaseResults.length > 0 || filteredGoogleResults.length > 0;
  const allResults = [...filteredDatabaseResults, ...filteredGoogleResults];
  const isSearching = query.length >= 2;

  // Notify parent of results state
  useEffect(() => {
    if (onResultsChange) {
      onResultsChange(hasResults || isLoading, isSearching);
    }
  }, [hasResults, isLoading, isSearching, onResultsChange]);

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

      {/* Results dropdown - Home page style with 3D icons */}
      {showResults && hasResults && (
        <div className="absolute z-50 w-full mt-2 bg-card/95 backdrop-blur-lg border border-border/40 rounded-2xl shadow-2xl max-h-[360px] overflow-y-auto scrollbar-hide">
          {/* Header */}
          <div className="px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/30">
            {t('locations', { ns: 'common', defaultValue: 'Posizioni' })}
          </div>

          {/* Combined results list */}
          <div className="py-1">
            {allResults.map((result, index) => {
              const categoryImage = getCategoryImage(result.category || 'restaurant');
              
              return (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  className={`w-full px-4 py-3 flex items-center gap-3.5 hover:bg-muted/50 active:bg-muted/70 transition-colors text-left ${
                    selectedIndex === index ? 'bg-muted/50' : ''
                  }`}
                >
                  {/* 3D Category Icon */}
                  <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-muted/40 rounded-xl overflow-hidden">
                    <img 
                      src={categoryImage}
                      alt={result.category || 'place'}
                      className="w-9 h-9 object-contain"
                      loading="eager"
                    />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-foreground truncate">
                      {result.name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {result.city && result.address 
                        ? `${result.city} • ${result.address.split(',')[0]}`
                        : result.address || result.city}
                    </div>
                  </div>

                  {/* Source indicator dot */}
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    result.source === 'database' 
                      ? 'bg-green-500' 
                      : result.source === 'google' 
                        ? 'bg-blue-500' 
                        : 'bg-orange-500'
                  }`} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* No results message */}
      {showResults && !isLoading && query.length >= 2 && !hasResults && (
        <div className="absolute z-50 w-full mt-2 bg-card/95 backdrop-blur-lg border border-border/40 rounded-2xl shadow-2xl p-6 text-center">
          <MapPin className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">
            {t('noPlacesFound', { ns: 'add', defaultValue: 'Nessun luogo trovato per' })} "{query}"
          </p>
        </div>
      )}
    </div>
  );
};

export default OptimizedPlacesAutocomplete;
