/**
 * Unified Search Autocomplete - FREE alternative to Google Places
 * Uses OpenStreetMap Nominatim + our database
 * Cost: $0 (was ~$20/1000 with Google)
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { nominatimGeocoding } from '@/lib/nominatimGeocoding';
import { supabase } from '@/integrations/supabase/client';

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
}

const UnifiedSearchAutocomplete = ({
  onPlaceSelect,
  placeholder = 'Search places, cities, addresses...',
  className = '',
  autoFocus = false,
}: UnifiedSearchAutocompleteProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="pl-11 pr-10 h-12 text-base"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Results dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-background border border-border rounded-lg shadow-xl max-h-[400px] overflow-y-auto">
          {results.map((result) => (
            <button
              key={result.id}
              onClick={() => handleSelect(result)}
              className="w-full px-4 py-3 flex items-start gap-3 hover:bg-muted transition-colors text-left border-b border-border/50 last:border-0"
            >
              {result.source === 'database' ? (
                <Building2 className="w-5 h-5 mt-1 flex-shrink-0 text-primary" />
              ) : (
                <MapPin className="w-5 h-5 mt-1 flex-shrink-0 text-muted-foreground" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground">
                  {result.name}
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {result.address}
                </div>
                {result.source === 'database' && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="text-xs font-medium text-primary">
                      In Spott
                    </div>
                    {result.category && (
                      <div className="text-xs text-muted-foreground">
                        • {result.category}
                      </div>
                    )}
                  </div>
                )}
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
