import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { nominatimGeocoding } from '@/lib/nominatimGeocoding';
import { supabase } from '@/integrations/supabase/client';

interface OpenStreetMapAutocompleteProps {
  onPlaceSelect: (place: {
    name: string;
    address: string;
    coordinates: { lat: number; lng: number };
    city: string;
  }) => void;
  placeholder?: string;
  className?: string;
  initialQuery?: string;
}

interface SearchResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  city: string;
  source: 'database' | 'nominatim';
}

const OpenStreetMapAutocomplete = ({
  onPlaceSelect,
  placeholder = 'Search for a place...',
  className = '',
  initialQuery = '',
}: OpenStreetMapAutocompleteProps) => {
  const [query, setQuery] = useState(initialQuery);
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

    // Debounce search
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
    
    try {
      const combinedResults: SearchResult[] = [];

      // 1. Search our database first (instant, no API cost)
      const { data: dbLocations } = await supabase
        .from('locations')
        .select('id, name, address, city, latitude, longitude')
        .or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%`)
        .limit(5);

      if (dbLocations) {
        combinedResults.push(
          ...dbLocations.map((loc) => ({
            id: loc.id,
            name: loc.name,
            address: loc.address || '',
            lat: loc.latitude,
            lng: loc.longitude,
            city: loc.city || '',
            source: 'database' as const,
          }))
        );
      }

      // 2. If few results, search OpenStreetMap Nominatim (FREE)
      if (combinedResults.length < 3) {
        try {
          const nominatimResults = await nominatimGeocoding.searchPlace(searchQuery);
          
          combinedResults.push(
            ...nominatimResults.map((result, idx) => ({
              id: `nominatim-${idx}`,
              name: result.displayName.split(',')[0], // First part of address
              address: result.displayName,
              lat: result.lat,
              lng: result.lng,
              city: result.city,
              source: 'nominatim' as const,
            }))
          );
        } catch (nominatimError) {
          console.warn('Nominatim search failed:', nominatimError);
        }
      }

      setResults(combinedResults);
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
    });
    
    setQuery(result.name);
    setShowResults(false);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Results dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-background border border-border rounded-lg shadow-lg max-h-[300px] overflow-y-auto">
          {results.map((result) => (
            <button
              key={result.id}
              onClick={() => handleSelect(result)}
              className="w-full px-4 py-3 flex items-start gap-3 hover:bg-muted transition-colors text-left border-b border-border last:border-0"
            >
              <MapPin className="w-4 h-4 mt-1 flex-shrink-0 text-primary" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">
                  {result.name}
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {result.address}
                </div>
                {result.source === 'database' && (
                  <div className="text-xs text-primary mt-1">
                    In your network
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {showResults && !loading && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-50 w-full mt-2 bg-background border border-border rounded-lg shadow-lg p-4 text-center text-muted-foreground text-sm">
          No places found for "{query}"
        </div>
      )}
    </div>
  );
};

export default OpenStreetMapAutocomplete;
