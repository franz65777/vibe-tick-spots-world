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

      {/* Results dropdown - Clean row style like reference */}
      {showResults && hasResults && (
        <div className="absolute z-50 w-full mt-2 bg-background/98 backdrop-blur-xl rounded-2xl shadow-2xl max-h-[400px] overflow-y-auto scrollbar-hide">
          {/* Results list - simple rows with dividers */}
          <div className="divide-y divide-border/30">
            {allResults.map((result, index) => {
              const categoryImage = getCategoryImage(result.category || 'restaurant');
              
              return (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  className={`w-full px-4 py-4 flex items-center gap-4 hover:bg-muted/40 active:bg-muted/60 transition-colors text-left ${
                    selectedIndex === index ? 'bg-muted/40' : ''
                  }`}
                >
                  {/* Category Image */}
                  <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-muted/30">
                    <img 
                      src={categoryImage}
                      alt={result.category || 'place'}
                      className="w-full h-full object-cover"
                      loading="eager"
                    />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-base text-foreground truncate">
                      {result.name}
                    </div>
                    <div className="text-sm text-muted-foreground truncate mt-0.5">
                      {result.category || result.city || result.address?.split(',')[0]}
                    </div>
                  </div>
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
