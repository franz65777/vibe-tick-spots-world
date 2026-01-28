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

// Re-export SearchResult for parent components
export type { SearchResult } from '@/hooks/useOptimizedPlacesSearch';

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
  hideDropdown?: boolean;
  onResultsDataChange?: (data: {
    query: string;
    isLoading: boolean;
    results: SearchResult[];
    isSearching: boolean;
  }) => void;
}

// Smart dedup function: prioritizes entries with images
const mergeAndDedupResults = (results: SearchResult[]): SearchResult[] => {
  const groups = new Map<string, SearchResult[]>();
  
  results.forEach(result => {
    // Create a normalized key: prefer google_place_id, fallback to name+address
    const key = result.google_place_id 
      || `${result.name.toLowerCase().trim()}|${(result.address || '').toLowerCase().trim()}`.replace(/\s+/g, ' ');
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(result);
  });
  
  // For each group, pick the "best" entry
  const merged: SearchResult[] = [];
  groups.forEach(candidates => {
    if (candidates.length === 1) {
      merged.push(candidates[0]);
      return;
    }
    
    // Sort by priority: image_url > photos.length > source=database > first
    candidates.sort((a, b) => {
      // Priority A: image_url (business) wins
      if (a.image_url && !b.image_url) return -1;
      if (!a.image_url && b.image_url) return 1;
      
      // Priority B: more photos wins
      const aPhotos = a.photos?.length || 0;
      const bPhotos = b.photos?.length || 0;
      if (aPhotos !== bPhotos) return bPhotos - aPhotos;
      
      // Priority C: database source preferred
      if (a.source === 'database' && b.source !== 'database') return -1;
      if (a.source !== 'database' && b.source === 'database') return 1;
      
      return 0;
    });
    
    merged.push(candidates[0]);
  });
  
  return merged;
};

const OptimizedPlacesAutocomplete = ({
  onPlaceSelect,
  placeholder = 'Search for a place...',
  className = '',
  userLocation,
  disabled = false,
  autoFocus = false,
  onResultsChange,
  hideDropdown = false,
  onResultsDataChange,
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

  // Deduplicate: if database has a result with same google_place_id or same name+address, skip the Google version
  const deduplicatedGoogleResults = filteredGoogleResults.filter(googleResult => {
    // Check if any database result matches by google_place_id
    const matchesByPlaceId = filteredDatabaseResults.some(
      dbResult => dbResult.google_place_id && googleResult.google_place_id && 
                  dbResult.google_place_id === googleResult.google_place_id
    );
    if (matchesByPlaceId) return false;
    
    // Check if any database result matches by normalized name
    const normalizedGoogleName = googleResult.name.toLowerCase().trim();
    const matchesByName = filteredDatabaseResults.some(
      dbResult => dbResult.name.toLowerCase().trim() === normalizedGoogleName
    );
    return !matchesByName;
  });

  const combinedResults = [...filteredDatabaseResults, ...deduplicatedGoogleResults];
  const mergedResults = mergeAndDedupResults(combinedResults);
  const hasResults = mergedResults.length > 0;
  const isSearching = query.length >= 2;

  // Notify parent of results state (simple callback)
  useEffect(() => {
    if (onResultsChange) {
      onResultsChange(hasResults || isLoading, isSearching);
    }
  }, [hasResults, isLoading, isSearching, onResultsChange]);

  // Notify parent of full results data (for external rendering)
  useEffect(() => {
    if (onResultsDataChange) {
      onResultsDataChange({
        query,
        isLoading,
        results: mergedResults,
        isSearching,
      });
    }
  }, [query, isLoading, mergedResults.length, isSearching, onResultsDataChange]);

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
    if (!showResults || mergedResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, mergedResults.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < mergedResults.length) {
          handleSelect(mergedResults[selectedIndex]);
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
          className="pr-10 !border-none !ring-0 !ring-offset-0 !shadow-none !outline-none focus-visible:!ring-0 focus-visible:!ring-offset-0"
          style={{ border: 'none', boxShadow: 'none', outline: 'none' }}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Results dropdown - Only render if hideDropdown is false */}
      {!hideDropdown && showResults && hasResults && (
        <div className="absolute z-50 w-full mt-4 max-h-[70vh] overflow-y-auto scrollbar-hide -mx-4 px-4" style={{ width: 'calc(100% + 2rem)', left: '-1rem' }}>
          {mergedResults.map((result, index) => {
            const displayImage = result.image_url 
              || (result.photos && result.photos[0]) 
              || getCategoryImage(result.category || 'restaurant');
            const isRealPhoto = !!(result.image_url || (result.photos && result.photos.length > 0));
            
            return (
              <button
                key={result.id}
                onClick={() => handleSelect(result)}
                className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-white/40 dark:hover:bg-white/10 
                           active:bg-white/60 dark:active:bg-white/20 transition-colors text-left
                           border-b border-black/5 dark:border-white/10 ${
                  selectedIndex === index ? 'bg-white/30 dark:bg-white/10' : ''
                }`}
              >
                <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-muted/20">
                  <img 
                    src={displayImage}
                    alt={result.category || 'place'}
                    className={`w-full h-full ${isRealPhoto ? 'object-cover' : 'object-contain p-1'}`}
                    loading="eager"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-base text-foreground truncate">
                    {result.name}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {result.address || result.city || ''}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* No results message - Only render if hideDropdown is false */}
      {!hideDropdown && showResults && !isLoading && query.length >= 2 && !hasResults && (
        <div className="absolute z-50 w-full mt-2 p-6 text-center">
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
