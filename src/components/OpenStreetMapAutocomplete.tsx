import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { nominatimGeocoding } from '@/lib/nominatimGeocoding';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';

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
  disabled?: boolean;
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
  disabled = false,
}: OpenStreetMapAutocompleteProps) => {
  const { t } = useTranslation();
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
        .limit(20); // Get more to deduplicate

      if (dbLocations) {
        // DEDUPLICATE by name+city AND by coordinates (within ~11 meters)
        const uniqueLocations = new Map<string, typeof dbLocations[0]>();
        const seenNameCity = new Set<string>();
        const threshold = 0.0001;
        
        for (const loc of dbLocations) {
          // Create coordinate key rounded to threshold
          const latKey = Math.round(loc.latitude / threshold);
          const lngKey = Math.round(loc.longitude / threshold);
          const coordKey = `${latKey},${lngKey}`;
          
          // Create name+city key for additional dedup
          const nameCityKey = `${loc.name.toLowerCase().trim()}|${(loc.city || '').toLowerCase().trim()}`;
          
          // Only add if not already present at these coordinates AND not same name+city
          if (!uniqueLocations.has(coordKey) && !seenNameCity.has(nameCityKey)) {
            uniqueLocations.set(coordKey, loc);
            seenNameCity.add(nameCityKey);
          }
        }
        
        combinedResults.push(
          ...Array.from(uniqueLocations.values()).slice(0, 5).map((loc) => ({
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
              name: result.displayName.split(',')[0],
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
          disabled={disabled}
          className="pl-10 pr-10"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Results dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-background border border-border rounded-2xl shadow-lg max-h-[200px] overflow-y-auto scrollbar-hide pb-safe">
          {results.map((result) => {
            // Format address: City, street, number (no name repetition)
            const addressParts = result.address.split(',').map(p => p.trim());
            const filteredParts = addressParts.filter(p => 
              p.toLowerCase() !== result.name.toLowerCase()
            );
            const formattedAddress = result.city 
              ? `${result.city}, ${filteredParts.slice(0, 2).join(', ')}`
              : filteredParts.slice(0, 3).join(', ');
            
            return (
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
                    {formattedAddress}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* No results message */}
      {showResults && !loading && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-50 w-full mt-2 bg-background border border-border rounded-2xl shadow-lg p-4 text-center text-muted-foreground text-sm">
          {t('noPlacesFound', { ns: 'add' })} "{query}"
        </div>
      )}
    </div>
  );
};

export default OpenStreetMapAutocomplete;
