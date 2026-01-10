import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { nominatimGeocoding } from '@/lib/nominatimGeocoding';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { mapNominatimTypeToCategory } from '@/utils/allowedCategories';
import { extractParentCityFromAddress, normalizeCity } from '@/utils/cityNormalization';

interface OpenStreetMapAutocompleteProps {
  onPlaceSelect: (place: {
    name: string;
    address: string;
    coordinates: { lat: number; lng: number };
    city: string;
    nominatimType?: string;
    nominatimClass?: string;
    category?: string;
    isCity?: boolean;
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
  nominatimType?: string;
  nominatimClass?: string;
  category?: string;
  isCity?: boolean;
}

// Types that represent actual cities (not suburbs/municipalities)
const CITY_TYPES = ['city', 'town', 'village', 'hamlet'];
// Types that are sub-areas of cities (should show parent city instead)
const SUB_CITY_TYPES = [
  'municipality', 'suburb', 'quarter', 'neighbourhood', 'borough', 'district',
  'city_district', 'county', 'state_district', 'region', 'locality',
  'isolated_dwelling', 'farm', 'allotments', 'administrative'
];
const CITY_CLASSES = ['place', 'boundary'];

const OpenStreetMapAutocomplete = ({
  onPlaceSelect,
  placeholder = 'Search for a place...',
  className = '',
  initialQuery = '',
  disabled = false,
}: OpenStreetMapAutocompleteProps) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState(initialQuery);
  const [cityResults, setCityResults] = useState<SearchResult[]>([]);
  const [locationResults, setLocationResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setCityResults([]);
      setLocationResults([]);
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

  const normalizeName = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ');
  };

  const isCityType = (type?: string, classType?: string): boolean => {
    if (!type && !classType) return false;
    // Only true cities, not municipalities/suburbs
    return CITY_TYPES.includes(type || '') && CITY_CLASSES.includes(classType || '');
  };

  const isSubCityType = (type?: string): boolean => {
    return SUB_CITY_TYPES.includes(type || '');
  };

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    
    try {
      const cities: SearchResult[] = [];
      const locations: SearchResult[] = [];
      const seenNormalizedNames = new Set<string>();
      const seenCityNames = new Set<string>();

      // 1. Search specifically for cities worldwide (no location bias)
      try {
        const citySearchResults = await nominatimGeocoding.searchCities(searchQuery, 'en');
        
        for (const result of citySearchResults) {
          // Always display the *parent city* (never a municipality/district name)
          const rawCity = result.city || result.displayName.split(',')[0];

          let resolvedCity = normalizeCity(rawCity || null);
          if (!resolvedCity || resolvedCity === 'Unknown') {
            const parent = extractParentCityFromAddress(result.displayName, rawCity);
            resolvedCity = normalizeCity(parent || null);
          }

          if (!resolvedCity || resolvedCity === 'Unknown') continue;

          const normalizedKey = normalizeName(resolvedCity);
          if (seenCityNames.has(normalizedKey)) continue;
          seenCityNames.add(normalizedKey);

          if (cities.length < 5) {
            const addressParts = result.displayName.split(',').map(p => p.trim());
            const country = addressParts[addressParts.length - 1] || '';

            cities.push({
              id: `city-${cities.length}`,
              name: resolvedCity,
              address: country,
              lat: result.lat,
              lng: result.lng,
              city: resolvedCity,
              source: 'nominatim' as const,
              nominatimType: result.type,
              nominatimClass: result.class,
              isCity: true,
            });
          }
        }
      } catch (cityError) {
        console.warn('City search failed:', cityError);
      }

      // 2. Search our database for locations
      const { data: dbLocations } = await supabase
        .from('locations')
        .select('id, name, address, city, latitude, longitude, category')
        .or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%`)
        .limit(20);

      if (dbLocations) {
        for (const loc of dbLocations) {
          const normalizedName = normalizeName(loc.name);
          
          if (seenNormalizedNames.has(normalizedName)) continue;
          seenNormalizedNames.add(normalizedName);
          
          if (locations.length < 5) {
            locations.push({
              id: loc.id,
              name: loc.name,
              address: loc.address || '',
              lat: loc.latitude,
              lng: loc.longitude,
              city: loc.city || '',
              source: 'database' as const,
              category: loc.category || undefined,
              isCity: false,
            });
          }
        }
      }

      // 3. Search OpenStreetMap Nominatim for places (skip viewbox for global search)
      try {
        const nominatimResults = await nominatimGeocoding.searchPlace(searchQuery, 'en', undefined, { skipViewbox: true });
        
        for (const result of nominatimResults) {
          const placeName = result.displayName.split(',')[0];
          const normalizedName = normalizeName(placeName);
          const isCity = isCityType(result.type, result.class);
          
          // Skip cities - we already have them from the dedicated city search
          if (isCity) {
            const cityKey = normalizedName;
            if (!seenCityNames.has(cityKey) && cities.length < 5) {
              seenCityNames.add(cityKey);
              const addressParts = result.displayName.split(',').map(p => p.trim());
              const country = addressParts[addressParts.length - 1] || '';
              
              cities.push({
                id: `city-${cities.length}`,
                name: placeName,
                address: country,
                lat: result.lat,
                lng: result.lng,
                city: placeName,
                source: 'nominatim' as const,
                nominatimType: result.type,
                nominatimClass: result.class,
                isCity: true,
              });
            }
            continue;
          }
          
          // Skip sub-city types for locations
          if (isSubCityType(result.type)) continue;
          
          // Regular location
          if (seenNormalizedNames.has(normalizedName)) continue;
          seenNormalizedNames.add(normalizedName);
          
          const mappedCategory = mapNominatimTypeToCategory(result.type, result.class);
          
          if (locations.length < 8) {
            locations.push({
              id: `nominatim-${locations.length}`,
              name: placeName,
              address: result.displayName,
              lat: result.lat,
              lng: result.lng,
              city: result.city || '',
              source: 'nominatim' as const,
              nominatimType: result.type,
              nominatimClass: result.class,
              category: mappedCategory,
              isCity: false,
            });
          }
        }
      } catch (nominatimError) {
        console.warn('Nominatim search failed:', nominatimError);
      }

      setCityResults(cities);
      setLocationResults(locations);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setCityResults([]);
      setLocationResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (result: SearchResult) => {
    onPlaceSelect({
      name: result.name,
      address: result.address,
      coordinates: { lat: result.lat, lng: result.lng },
      city: result.isCity ? result.name : result.city,
      nominatimType: result.nominatimType,
      nominatimClass: result.nominatimClass,
      category: result.category,
      isCity: result.isCity,
    });
    
    setQuery(result.name);
    setShowResults(false);
  };

  const hasResults = cityResults.length > 0 || locationResults.length > 0;

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
      {showResults && hasResults && (
        <div className="absolute z-50 w-full mt-2 bg-background border border-border rounded-2xl shadow-lg max-h-[300px] overflow-y-auto scrollbar-hide pb-safe">
          {/* Cities section */}
          {cityResults.length > 0 && (
            <>
              <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
                {t('cities', { ns: 'common', defaultValue: 'Città' })}
              </div>
              {cityResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  className="w-full px-4 py-3 flex items-start gap-3 hover:bg-muted transition-colors text-left border-b border-border"
                >
                  <Building2 className="w-4 h-4 mt-1 flex-shrink-0 text-primary" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">
                      {result.name}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {result.address}
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}

          {/* Locations section */}
          {locationResults.length > 0 && (
            <>
              <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
                {t('locations', { ns: 'common', defaultValue: 'Posizioni' })}
              </div>
              {locationResults.map((result) => {
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
            </>
          )}
        </div>
      )}

      {/* No results message */}
      {showResults && !loading && query.length >= 2 && !hasResults && (
        <div className="absolute z-50 w-full mt-2 bg-background border border-border rounded-2xl shadow-lg p-4 text-center text-muted-foreground text-sm">
          {t('noPlacesFound', { ns: 'add' })} "{query}"
        </div>
      )}
    </div>
  );
};

export default OpenStreetMapAutocomplete;
