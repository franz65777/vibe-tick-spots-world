/**
 * Unified Search Autocomplete - FREE alternative to Google Places
 * Uses OpenStreetMap Nominatim + our database
 * Cost: $0 (was ~$20/1000 with Google)
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { nominatimGeocoding } from '@/lib/nominatimGeocoding';
import { supabase } from '@/integrations/supabase/client';
import { CategoryIcon } from '@/components/common/CategoryIcon';

interface SearchResult {
  id: string;
  name: string;
  address: string;
  category?: string;
  lat: number;
  lng: number;
  city: string;
  source: 'database' | 'osm';
}

interface UnifiedSearchAutocompleteProps {
  onPlaceSelect: (place: {
    name: string;
    address: string;
    coordinates: { lat: number; lng: number };
    city: string;
    category?: string;
  }) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onFocus?: () => void;
  onScroll?: () => void;
  showCategoryIcons?: boolean;
}

const UnifiedSearchAutocomplete = ({
  onPlaceSelect,
  placeholder = 'Search places, cities, addresses...',
  className = '',
  autoFocus = false,
  onFocus,
  onScroll,
  showCategoryIcons = false,
}: UnifiedSearchAutocompleteProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    const combinedResults: SearchResult[] = [];

    try {
      // 1. Search our database FIRST (instant, free, better results for existing places)
      const { data: dbLocations } = await supabase
        .from('locations')
        .select('id, name, address, city, category, latitude, longitude')
        .or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%`)
        .limit(8);

      if (dbLocations) {
        combinedResults.push(
          ...dbLocations.map((loc) => ({
            id: loc.id,
            name: loc.name,
            address: loc.address || '',
            category: loc.category,
            lat: loc.latitude,
            lng: loc.longitude,
            city: loc.city || '',
            source: 'database' as const,
          }))
        );
      }

      // 2. Supplement with OpenStreetMap if needed (FREE)
      if (combinedResults.length < 5) {
        const osmResults = await nominatimGeocoding.searchPlace(searchQuery);
        
        combinedResults.push(
          ...osmResults.slice(0, 5).map((result, idx) => ({
            id: `osm-${idx}`,
            name: result.displayName.split(',')[0],
            address: result.displayName,
            lat: result.lat,
            lng: result.lng,
            city: result.city,
            source: 'osm' as const,
          }))
        );
      }

      setResults(combinedResults.slice(0, 10));
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (result: SearchResult) => {
    onPlaceSelect({
      name: result.name,
      address: result.address,
      coordinates: { lat: result.lat, lng: result.lng },
      city: result.city,
      category: result.category,
    });
    
    setQuery(result.name);
    setShowResults(false);
  };

  const handleResultsScroll = () => {
    if (onScroll) {
      onScroll();
    }
  };

  useEffect(() => {
    const resultsContainer = resultsRef.current;
    if (resultsContainer) {
      resultsContainer.addEventListener('scroll', handleResultsScroll);
      return () => resultsContainer.removeEventListener('scroll', handleResultsScroll);
    }
  }, [showResults]);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.length >= 2) setShowResults(true);
            if (onFocus) onFocus();
          }}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="pl-11 pr-10 h-12 text-base bg-muted/50"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Results dropdown */}
      {showResults && results.length > 0 && (
        <div 
          ref={resultsRef}
          onScroll={handleResultsScroll}
          className="absolute z-50 w-full mt-2 bg-background border border-border rounded-lg shadow-xl max-h-[60vh] overflow-y-auto"
        >
          {results.map((result) => (
            <button
              key={result.id}
              onClick={() => handleSelect(result)}
              className="w-full px-4 py-3 flex items-start gap-3 hover:bg-muted transition-colors text-left border-b border-border/50 last:border-0"
            >
              {showCategoryIcons && result.category ? (
                <div className="w-10 h-10 flex-shrink-0">
                  <CategoryIcon category={result.category} className="w-full h-full" />
                </div>
              ) : (
                <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-primary/10 rounded-lg">
                  <Search className="w-5 h-5 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground">
                  {result.name}
                </div>
                <div className="text-sm text-muted-foreground mt-0.5">
                  {result.city && <span>{result.city}</span>}
                  {result.city && result.address && <span className="mx-1">•</span>}
                  <span className="line-clamp-1">{result.address}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {showResults && !loading && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-50 w-full mt-2 bg-background border border-border rounded-lg shadow-lg p-6 text-center">
          <p className="text-muted-foreground">No places found for "{query}"</p>
          <p className="text-sm text-muted-foreground mt-2">
            Try searching for a city or landmark
          </p>
        </div>
      )}
    </div>
  );
};

export default UnifiedSearchAutocomplete;
