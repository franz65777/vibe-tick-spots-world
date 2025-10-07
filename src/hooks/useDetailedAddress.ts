import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNormalizedCity } from '@/hooks/useNormalizedCity';
import { normalizeCity } from '@/utils/cityNormalization';

interface Params {
  id?: string;
  city?: string | null;
  address?: string | null;
  coordinates?: { lat?: number; lng?: number } | null;
}

// Extract the best street + number from a formatted address string
function extractStreetPart(addr?: string | null): string {
  if (!addr) return '';
  const parts = addr.split(',').map(p => p.trim()).filter(Boolean);
  // Google formatted_address is typically: "{number} {route}, {locality}, {region} ..."
  // Prefer the first part; if it lacks a digit, try combining the first two
  const first = parts[0] || '';
  if (/\d/.test(first)) return first; // has a number
  const second = parts[1] || '';
  const combo = [first, second].filter(Boolean).join(', ');
  if (/\d/.test(combo)) return combo;
  return first || combo || '';
}

/**
 * useDetailedAddress
 * - Returns a detailed address string in the format: "City, Street Name and #"
 * - Uses useNormalizedCity for a reliable city
 * - Falls back to reverse-geocoding to obtain a proper formatted_address (with number)
 */
export function useDetailedAddress(params: Params) {
  const { id, city, address, coordinates } = params;
  const { cityLabel } = useNormalizedCity({ id, city, address, coordinates });

  const [streetPart, setStreetPart] = useState<string>(() => extractStreetPart(address || ''));
  const [resolvedCity, setResolvedCity] = useState<string>(cityLabel || 'Unknown');
  const [loading, setLoading] = useState(false);

  // Keep city in sync with normalized hook
  useEffect(() => {
    if (cityLabel) setResolvedCity(cityLabel);
  }, [cityLabel]);

  // If we don't have a street with number or city is unknown, and we have coords, use reverse geocode
  const needsReverse = useMemo(() => {
    const hasNumber = /\d/.test(streetPart);
    const cityUnknown = !resolvedCity || resolvedCity === 'Unknown';
    return (!!coordinates?.lat && !!coordinates?.lng) && (!hasNumber || cityUnknown);
  }, [streetPart, resolvedCity, coordinates?.lat, coordinates?.lng]);

  useEffect(() => {
    let isMounted = true;
    if (!needsReverse) return;
    if (!coordinates?.lat || !coordinates?.lng) return;

    setLoading(true);
    supabase.functions
      .invoke('reverse-geocode', { body: { latitude: coordinates.lat, longitude: coordinates.lng } })
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) return;
        // Prefer street with number from formatted address
        const formatted = data?.formatted_address as string | undefined;
        const rcStreet = extractStreetPart(formatted);
        if (rcStreet) setStreetPart(rcStreet);
        // Use returned city if our normalized city is unknown
        if ((!resolvedCity || resolvedCity === 'Unknown') && data?.city) {
          setResolvedCity(normalizeCity(data.city || null));
        }
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => { isMounted = false; };
  }, [needsReverse, coordinates?.lat, coordinates?.lng]);

  const detailedAddress = useMemo(() => {
    const parts: string[] = [];
    if (resolvedCity && resolvedCity !== 'Unknown') parts.push(resolvedCity);
    if (streetPart) parts.push(streetPart);
    // Ensure we always return something meaningful
    if (parts.length === 0) return 'Unknown Location';
    return parts.join(', ');
  }, [resolvedCity, streetPart]);

  return { detailedAddress, loading } as const;
}
