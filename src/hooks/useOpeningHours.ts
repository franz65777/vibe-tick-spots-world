import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OpeningHoursData {
  isOpen: boolean | null;
  todayHours: string | null;
  dayName: string;
  loading: boolean;
  error: string | null;
}

interface UseOpeningHoursParams {
  coordinates?: { lat: number; lng: number } | null;
  placeName?: string;
  locationId?: string;
  googlePlaceId?: string;
}

// In-memory cache for opening hours to avoid repeated edge function calls
const openingHoursCache = new Map<string, { data: OpeningHoursData; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCacheKey(params: UseOpeningHoursParams): string {
  const { coordinates, placeName, locationId, googlePlaceId } = params;
  return `${locationId || ''}-${googlePlaceId || ''}-${coordinates?.lat || ''}-${coordinates?.lng || ''}-${placeName || ''}`;
}

export const useOpeningHours = (
  coordinatesOrParams: { lat: number; lng: number } | null | undefined | UseOpeningHoursParams,
  placeName?: string
): OpeningHoursData => {
  const [data, setData] = useState<OpeningHoursData>({
    isOpen: null,
    todayHours: null,
    dayName: '',
    loading: true,
    error: null
  });

  // Normalize params for backwards compatibility
  const params: UseOpeningHoursParams = coordinatesOrParams && 'lat' in coordinatesOrParams
    ? { coordinates: coordinatesOrParams, placeName }
    : (coordinatesOrParams as UseOpeningHoursParams) || {};

  const { coordinates, locationId, googlePlaceId } = params;
  const name = params.placeName || placeName;
  
  const cacheKey = getCacheKey(params);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!coordinates?.lat || !coordinates?.lng) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    // Check cache first
    const cached = openingHoursCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setData(cached.data);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const fetchOpeningHours = async () => {
      try {
        const { data: result, error } = await supabase.functions.invoke('get-place-hours', {
          body: {
            lat: coordinates.lat,
            lng: coordinates.lng,
            name,
            locationId,
            googlePlaceId
          }
        });

        if (error) {
          throw error;
        }

        // Get localized day name using browser locale
        const now = new Date();
        const dayName = now.toLocaleDateString(navigator.language || 'en', { weekday: 'long' });

        const newData: OpeningHoursData = result?.openingHours
          ? {
              isOpen: result.openingHours.isOpen,
              todayHours: result.openingHours.todayHours,
              dayName,
              loading: false,
              error: null
            }
          : {
              isOpen: null,
              todayHours: null,
              dayName: '',
              loading: false,
              error: null
            };

        // Cache the result
        openingHoursCache.set(cacheKey, { data: newData, timestamp: Date.now() });
        setData(newData);
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        
        console.warn('Error fetching opening hours:', error);
        const errorData: OpeningHoursData = {
          isOpen: null,
          todayHours: null,
          dayName: '',
          loading: false,
          error: 'Failed to fetch opening hours'
        };
        setData(errorData);
      }
    };

    fetchOpeningHours();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [cacheKey, coordinates?.lat, coordinates?.lng, name, locationId, googlePlaceId]);

  return data;
};
