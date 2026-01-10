import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  normalizeCity,
  extractParentCityFromAddress,
  extractCityFromName,
} from '@/utils/cityNormalization';
import { useTranslation } from 'react-i18next';
import { translateCityName } from '@/utils/cityTranslations';

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
  name?: string | null;
  coordinates?: { lat?: number; lng?: number } | null;
  address?: string | null;
}) {
  const { id, city, name, coordinates, address } = params;
  const { i18n } = useTranslation();

  // Heuristics to detect street-like strings (contain numbers or common street terms)
  const isStreetLike = (value?: string | null) => {
    if (!value) return false;
    const v = value.toLowerCase();
    if (/\d/.test(v)) return true;
    return /(street|st\.?|avenue|ave\.?|road|rd\.?|square|sq\.?|piazza|platz|plaza|place|lane|ln\.?|drive|dr\.?|court|ct\.?|alley|way|quay|boulevard|blvd\.?|rue|via|calle|estrada|rua)/i.test(v);
  };

  // Heuristics to detect business/place names (non-city-like)
  const isNonCityLike = (value?: string | null) => {
    if (!value) return false;
    const v = value.toLowerCase();
    if (isStreetLike(v)) return true;
    return /(bar|pub|restaurant|cafe|caf[eé]|lounge|house|hotel|museum|gallery|bakery|pizzeria|pizza|coffee|club|park|market|shop|store|salon|studio|gym|spa|church|cathedral|mosque|temple|university|college|school|library|cinema|theatre|theater|stadium|arena|beach|harbour|harbor|port)/i.test(v);
  };

  // Extract best city-like segment from a freeform address
  const extractCityFromAddress = (addr?: string | null) => {
    if (!addr) return '';
    const parts = addr.split(',').map(p => p.trim()).filter(Boolean);
    // Prefer from right to left the first non-street-like segment longer than 2 chars
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (p.length > 2 && !/^\d+$/.test(p) && !isStreetLike(p)) {
        return p;
      }
    }
    return '';
  };
  const [label, setLabel] = useState<string>(() => {
    const base = (city && city.trim()) || extractCityFromAddress(address) || extractCityFromName(name) || '';
    let normalized = normalizeCity(base || null);

    // If base was a sub-city (municipality/district), try to pull the parent city from the address
    if (normalized === 'Unknown' && address) {
      const parent = extractParentCityFromAddress(address, base);
      normalized = normalizeCity(parent || null);
    }

    return normalized;
  });
  const [loading, setLoading] = useState(false);

  const cacheKey = useMemo(() => {
    const coordKey = coordinates?.lat && coordinates?.lng ? `${coordinates.lat},${coordinates.lng}` : '';
    return id || coordKey || address || city || name || '';
  }, [id, coordinates?.lat, coordinates?.lng, address, city, name]);

  useEffect(() => {
    let isMounted = true;

    const baseCity = (city && city.trim()) || extractCityFromAddress(address) || extractCityFromName(name) || '';
    let normalized = normalizeCity(baseCity || null);

    if (normalized === 'Unknown' && address) {
      const parent = extractParentCityFromAddress(address, baseCity);
      normalized = normalizeCity(parent || null);
    }

    // Try to translate with static list first (fast path)
    const staticTranslation = translateCityName(normalized, i18n.language);
    
    // If we have a valid city AND it was successfully translated (different from original), use it
    if (normalized !== 'Unknown' && normalized.length > 2 && !isNonCityLike(normalized)) {
      if (staticTranslation !== normalized || i18n.language === 'en') {
        // We have a translation or we're in English, use it directly
        setLabel(staticTranslation);
        return;
      }
      
      // No static translation available and not in English - need to get dynamic translation
      // Fall through to reverse geocode if we have coordinates
    }

    // Try cache
    const cacheKeyWithLang = `${cacheKey}-${i18n.language}`;
    if (cacheKeyWithLang && cityCache.has(cacheKeyWithLang)) {
      setLabel(cityCache.get(cacheKeyWithLang)!);
      return;
    }

    // If we have coordinates, reverse geocode with language parameter for dynamic translation
    const lat = coordinates?.lat !== undefined ? Number(coordinates.lat) : undefined;
    const lng = coordinates?.lng !== undefined ? Number(coordinates.lng) : undefined;
    if (
      lat === undefined || lng === undefined ||
      lat === null || lng === null ||
      Number.isNaN(lat) || Number.isNaN(lng)
    ) {
      // No coordinates, use what we have (normalized or translated)
      setLabel(staticTranslation || normalized || 'Unknown');
      return;
    }

    setLoading(true);
    supabase.functions
      .invoke('reverse-geocode', { body: { latitude: lat, longitude: lng, language: i18n.language } })
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          console.warn('Reverse geocode error:', error);
          setLabel(staticTranslation || normalized || 'Unknown');
          return;
        }
        // Reverse geocode should return city name in the requested language
        const rcCity = data?.city?.trim() || '';
        const finalCity = rcCity && rcCity !== 'Unknown' ? rcCity : (staticTranslation || normalized || 'Unknown');
        setLabel(finalCity);
        if (cacheKeyWithLang) cityCache.set(cacheKeyWithLang, finalCity);
      })
      .catch(() => {
        if (!isMounted) return;
        setLabel(staticTranslation || normalized || 'Unknown');
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [cacheKey, city, address, name, coordinates?.lat, coordinates?.lng, i18n.language]);

  return { cityLabel: label, cityLoading: loading } as const;
}
