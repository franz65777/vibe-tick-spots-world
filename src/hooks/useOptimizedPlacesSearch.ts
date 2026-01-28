/**
 * Optimized Places Search Hook
 * 
 * Strategy: DB First → Google Text Search (ID Only = FREE) → Nominatim Fallback
 * 
 * Cost breakdown:
 * - Database search: $0 (local)
 * - Google Text Search with ID-only mask: $0 (unlimited)
 * - Place Details Essentials (on selection): 10,000 free/month
 * - Nominatim fallback: $0 (free)
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { nominatimGeocoding } from '@/lib/nominatimGeocoding';
import { 
  mapNominatimTypeToCategory, 
  mapGooglePlaceTypeToCategory,
  isAllowedCategory,
  isAllowedNominatimType
} from '@/utils/allowedCategories';

export interface SearchResult {
  id: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  city: string;
  category?: string;
  source: 'database' | 'google' | 'nominatim';
  google_place_id?: string;
  types?: string[];
  isCity?: boolean;
}

interface UseOptimizedPlacesSearchOptions {
  userLocation?: { lat: number; lng: number } | null;
  debounceMs?: number;
  minQueryLength?: number;
  filterCitiesOut?: boolean; // New option to filter cities from results
}

// In-memory cache for search results (reduces API calls)
const searchCache = new Map<string, { results: SearchResult[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// City-type indicators from Google Places
const CITY_TYPES = ['locality', 'administrative_area_level_3', 'administrative_area_level_2', 'administrative_area_level_1', 'country'];

export function useOptimizedPlacesSearch(options: UseOptimizedPlacesSearchOptions = {}) {
  const { userLocation, debounceMs = 150, minQueryLength = 2, filterCitiesOut = false } = options;
  
  const [query, setQuery] = useState('');
  const [databaseResults, setDatabaseResults] = useState<SearchResult[]>([]);
  const [googleResults, setGoogleResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const debounceRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Get cached results if available
  const getCached = (cacheKey: string): SearchResult[] | null => {
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.results;
    }
    return null;
  };

  // Set cache
  const setCache = (cacheKey: string, results: SearchResult[]) => {
    searchCache.set(cacheKey, { results, timestamp: Date.now() });
    // Cleanup old entries
    if (searchCache.size > 50) {
      const now = Date.now();
      for (const [key, value] of searchCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          searchCache.delete(key);
        }
      }
    }
  };

  // Search local database
  const searchDatabase = async (searchQuery: string): Promise<SearchResult[]> => {
    try {
      const { data: locations } = await supabase
        .from('locations')
        .select('id, name, address, city, latitude, longitude, category, google_place_id')
        .or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%`)
        .limit(5);

      if (!locations) return [];

      return locations.map(loc => ({
        id: loc.id,
        name: loc.name,
        address: loc.address || '',
        lat: loc.latitude,
        lng: loc.longitude,
        city: loc.city || '',
        category: loc.category,
        source: 'database' as const,
        google_place_id: loc.google_place_id || undefined,
        isCity: false,
      }));
    } catch (err) {
      console.error('Database search error:', err);
      return [];
    }
  };

  // Search Google Places (ID Only = FREE UNLIMITED)
  const searchGoogle = async (searchQuery: string): Promise<SearchResult[]> => {
    try {
      const response = await supabase.functions.invoke('google-places-search', {
        body: {
          action: 'search',
          query: searchQuery,
          userLat: userLocation?.lat,
          userLng: userLocation?.lng,
        },
      });

      if (response.error) {
        console.warn('Google search error:', response.error);
        return [];
      }

      const { results = [] } = response.data || {};

      // Filter and map Google results
      return results
        .map((place: any, index: number) => {
          const types = place.types || [];
          const isCity = types.some((t: string) => CITY_TYPES.includes(t));
          const category = mapGooglePlaceTypeToCategory(types);
          
          return {
            id: `google-${index}`,
            name: place.name,
            address: place.formatted_address || '',
            city: '',
            source: 'google' as const,
            google_place_id: place.place_id,
            types,
            category,
            isCity,
          };
        })
        // Filter for allowed categories only (exclude cities and non-allowed types)
        .filter((result: SearchResult) => {
          // Exclude cities
          if (result.isCity) return false;
          // Only include allowed categories
          return isAllowedCategory(result.category || 'restaurant');
        });
    } catch (err) {
      console.error('Google search error:', err);
      return [];
    }
  };

  // Fallback to Nominatim (FREE but slower)
  const searchNominatim = async (searchQuery: string): Promise<SearchResult[]> => {
    try {
      const results = await nominatimGeocoding.searchPlace(
        searchQuery,
        'en',
        userLocation || undefined,
        { skipViewbox: true }
      );

      return results
        .slice(0, 5)
        .map((result, index) => {
          const placeName = result.displayName.split(',')[0];
          const category = mapNominatimTypeToCategory(result.type, result.class);
          const isCity = ['city', 'town', 'village', 'municipality'].includes(result.type || '');

          return {
            id: `nominatim-${index}`,
            name: placeName,
            address: result.displayName,
            lat: result.lat,
            lng: result.lng,
            city: result.city,
            category,
            source: 'nominatim' as const,
            isCity,
            nominatimType: result.type,
            nominatimClass: result.class,
          };
        })
        // Filter for allowed categories only
        .filter((r: any) => {
          if (r.isCity) return false;
          return isAllowedNominatimType(r.nominatimType, r.nominatimClass);
        });
    } catch (err) {
      console.error('Nominatim search error:', err);
      return [];
    }
  };

  // Main search function - unified strategy: DB → Google → Nominatim fallback
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < minQueryLength) {
      setDatabaseResults([]);
      setGoogleResults([]);
      return;
    }

    // Check cache first
    const cacheKey = `${searchQuery.toLowerCase()}_${userLocation?.lat}_${userLocation?.lng}_${filterCitiesOut}`;
    const cached = getCached(cacheKey);
    if (cached) {
      const dbResults = cached.filter(r => r.source === 'database');
      const otherResults = cached.filter(r => r.source !== 'database');
      setDatabaseResults(dbResults);
      setGoogleResults(otherResults);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      // Step 1: Always search local database first (instant, free)
      const dbResults = await searchDatabase(searchQuery);
      setDatabaseResults(dbResults);

      let externalResults: SearchResult[] = [];

      // Step 2: Always use Google Text Search for specific places (FREE with ID-only mask)
      // Only if database has few results
      if (dbResults.length < 3) {
        console.log('[Search] Using Google Text Search');
        try {
          externalResults = await searchGoogle(searchQuery);
        } catch (googleErr) {
          console.warn('Google failed, falling back to Nominatim:', googleErr);
        }

        // Step 3: Fallback to Nominatim if Google returned nothing
        if (externalResults.length === 0) {
          console.log('[Search] Falling back to Nominatim');
          externalResults = await searchNominatim(searchQuery);
        }
      }

      setGoogleResults(externalResults);

      // Cache combined results
      const allResults = [...dbResults, ...externalResults];
      setCache(cacheKey, allResults);

    } catch (err) {
      console.error('Search error:', err);
      setError('Search failed');
    } finally {
      setIsLoading(false);
    }
  }, [userLocation, minQueryLength, filterCitiesOut]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, performSearch, debounceMs]);

  // Get place details (uses 10k free/month quota)
  const getPlaceDetails = async (placeId: string): Promise<SearchResult | null> => {
    try {
      const response = await supabase.functions.invoke('google-places-search', {
        body: {
          action: 'details',
          placeId,
        },
      });

      if (response.error || !response.data?.details) {
        console.warn('Failed to get place details:', response.error);
        return null;
      }

      const { details } = response.data;
      const types = details.types || [];
      const category = mapGooglePlaceTypeToCategory(types);
      
      return {
        id: details.place_id,
        name: details.name,
        address: details.formatted_address,
        lat: details.geometry.location.lat,
        lng: details.geometry.location.lng,
        city: details.city || '',
        category,
        source: 'google',
        google_place_id: details.place_id,
        types,
        isCity: false,
      };
    } catch (err) {
      console.error('Get place details error:', err);
      return null;
    }
  };

  // Clear results
  const clearResults = useCallback(() => {
    setQuery('');
    setDatabaseResults([]);
    setGoogleResults([]);
    setError(null);
  }, []);

  return {
    query,
    setQuery,
    databaseResults,
    googleResults,
    allResults: [...databaseResults, ...googleResults],
    isLoading,
    error,
    getPlaceDetails,
    clearResults,
  };
}
