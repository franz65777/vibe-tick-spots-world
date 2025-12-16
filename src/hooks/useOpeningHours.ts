import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OpeningHoursData {
  isOpen: boolean | null;
  todayHours: string | null;
  dayIndex: number; // 0=Sunday, 1=Monday, etc.
  loading: boolean;
  error: string | null;
}

interface UseOpeningHoursParams {
  coordinates?: { lat: number; lng: number } | null;
  placeName?: string;
  locationId?: string;
  googlePlaceId?: string;
  cachedOpeningHours?: any; // Pre-fetched opening hours from place object
}

// In-memory cache for opening hours to avoid repeated edge function calls
const openingHoursCache = new Map<string, { data: OpeningHoursData; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCacheKey(params: UseOpeningHoursParams): string {
  const { coordinates, placeName, locationId, googlePlaceId } = params;
  return `${locationId || ''}-${googlePlaceId || ''}-${coordinates?.lat || ''}-${coordinates?.lng || ''}-${placeName || ''}`;
}

// Parse cached opening hours data to get today's status
function parseOpeningHoursData(data: any): { isOpen: boolean | null; todayHours: string | null } {
  if (!data) return { isOpen: null, todayHours: null };
  
  try {
    const now = new Date();
    const dayIndex = now.getDay(); // 0=Sunday, 1=Monday, etc.
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    
    // Handle Google Places API format with periods array
    if (data.periods && Array.isArray(data.periods)) {
      const todayPeriods = data.periods.filter((p: any) => p.open?.day === dayIndex);
      
      if (todayPeriods.length === 0) {
        return { isOpen: false, todayHours: 'Closed' };
      }
      
      let isOpen = false;
      const hoursStrings: string[] = [];
      
      for (const period of todayPeriods) {
        const openTime = parseInt(period.open?.time || '0000');
        const closeTime = period.close ? parseInt(period.close.time) : 2400;
        
        const openHour = Math.floor(openTime / 100);
        const openMin = openTime % 100;
        const closeHour = Math.floor(closeTime / 100);
        const closeMin = closeTime % 100;
        
        const openMinutes = openHour * 60 + openMin;
        const closeMinutes = closeHour * 60 + closeMin;
        
        if (currentTime >= openMinutes && currentTime < closeMinutes) {
          isOpen = true;
        }
        
        hoursStrings.push(`${String(openHour).padStart(2, '0')}:${String(openMin).padStart(2, '0')} – ${String(closeHour).padStart(2, '0')}:${String(closeMin).padStart(2, '0')}`);
      }
      
      return { isOpen, todayHours: hoursStrings.join(', ') };
    }
    
    // Handle weekday_text format
    if (data.weekday_text && Array.isArray(data.weekday_text)) {
      // weekday_text is 0=Monday, need to convert from JS day (0=Sunday)
      const weekdayIndex = dayIndex === 0 ? 6 : dayIndex - 1;
      const todayText = data.weekday_text[weekdayIndex] || '';
      const hoursMatch = todayText.match(/:\s*(.+)$/);
      const todayHours = hoursMatch ? hoursMatch[1] : null;
      
      // Try to determine if open based on current time
      if (todayHours && todayHours.toLowerCase() !== 'closed') {
        return { isOpen: data.open_now ?? null, todayHours };
      }
      return { isOpen: false, todayHours: 'Closed' };
    }
    
    return { isOpen: null, todayHours: null };
  } catch (e) {
    console.warn('Error parsing opening hours data:', e);
    return { isOpen: null, todayHours: null };
  }
}

export const useOpeningHours = (
  coordinatesOrParams: { lat: number; lng: number } | null | undefined | UseOpeningHoursParams,
  placeName?: string
): OpeningHoursData => {
  const [data, setData] = useState<OpeningHoursData>({
    isOpen: null,
    todayHours: null,
    dayIndex: new Date().getDay(),
    loading: true,
    error: null
  });

  // Normalize params for backwards compatibility
  const params: UseOpeningHoursParams = coordinatesOrParams && 'lat' in coordinatesOrParams
    ? { coordinates: coordinatesOrParams, placeName }
    : (coordinatesOrParams as UseOpeningHoursParams) || {};

  const { coordinates, locationId, googlePlaceId, cachedOpeningHours } = params;
  const name = params.placeName || placeName;
  
  const cacheKey = getCacheKey(params);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const dayIndex = new Date().getDay();
    
    if (!coordinates?.lat || !coordinates?.lng) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    // If we have cached opening hours from the place object, use them immediately
    if (cachedOpeningHours) {
      const parsed = parseOpeningHoursData(cachedOpeningHours);
      const newData: OpeningHoursData = {
        isOpen: parsed.isOpen,
        todayHours: parsed.todayHours,
        dayIndex,
        loading: false,
        error: null
      };
      setData(newData);
      return;
    }

    // Check in-memory cache
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

        const newData: OpeningHoursData = result?.openingHours
          ? {
              isOpen: result.openingHours.isOpen,
              todayHours: result.openingHours.todayHours,
              dayIndex,
              loading: false,
              error: null
            }
          : {
              isOpen: null,
              todayHours: null,
              dayIndex,
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
          dayIndex,
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
  }, [cacheKey, coordinates?.lat, coordinates?.lng, name, locationId, googlePlaceId, cachedOpeningHours]);

  return data;
};
