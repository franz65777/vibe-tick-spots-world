import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { normalizeCity } from '@/utils/cityNormalization';

// Simple in-memory cache to avoid repeated lookups per session
const cityCache = new Map<string, string>();

/**
 * Hook to get a normalized, user-friendly city label.
 * - Cleans up values like "Dublin 2" -> "Dublin", strips "County" prefix
 * - Falls back to reverse geocoding if still Unknown/numeric and coords exist
 */
export function useNormalizedCity(params: {
  id?: string; // stable key for caching (e.g., location id or google place id)
  city?: string | null;
  coordinates?: { lat?: number; lng?: number } | null;
  address?: string | null;
}) {
  const { id, city, coordinates, address } = params;
  const [label, setLabel] = useState<string>(() => {
    // Prefer city field; otherwise try "City" part from address
    const base = (city && city.trim()) || (address?.split(',')[1]?.trim() ?? '') || '';
    const normalized = normalizeCity(base || null);
    return normalized;
  });
  const [loading, setLoading] = useState(false);

  const cacheKey = useMemo(() => {
    const coordKey = coordinates?.lat && coordinates?.lng ? `${coordinates.lat},${coordinates.lng}` : '';
    return id || coordKey || address || city || '';
  }, [id, coordinates?.lat, coordinates?.lng, address, city]);

  useEffect(() => {
    let isMounted = true;

    const baseCity = (city && city.trim()) || (address?.split(',')[1]?.trim() ?? '') || '';
    const normalized = normalizeCity(baseCity || null);

    // If already good, set and stop
    if (normalized !== 'Unknown' && normalized.length > 2) {
      setLabel(normalized);
      return;
    }

    // Try cache
    if (cacheKey && cityCache.has(cacheKey)) {
      setLabel(cityCache.get(cacheKey)!);
      return;
    }

    // If we have coordinates, reverse geocode
    const lat = coordinates?.lat;
    const lng = coordinates?.lng;
    if (!lat || !lng) {
      setLabel(normalized || 'Unknown');
      return;
    }

    setLoading(true);
    supabase.functions
      .invoke('reverse-geocode', { body: { latitude: lat, longitude: lng } })
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          console.warn('Reverse geocode error:', error);
          setLabel(normalized || 'Unknown');
          return;
        }
        const rcCity = normalizeCity(data?.city || null);
        const finalCity = rcCity && rcCity !== 'Unknown' ? rcCity : normalized || 'Unknown';
        setLabel(finalCity);
        if (cacheKey) cityCache.set(cacheKey, finalCity);
      })
      .catch(() => {
        if (!isMounted) return;
        setLabel(normalized || 'Unknown');
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [cacheKey, city, address, coordinates?.lat, coordinates?.lng]);

  return { cityLabel: label, cityLoading: loading } as const;
}
