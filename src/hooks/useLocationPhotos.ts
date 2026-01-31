import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseLocationPhotosOptions {
  locationId?: string;
  googlePlaceId?: string;
  autoFetch?: boolean;
  maxPhotos?: number;
  initialPhotos?: string[]; // Pre-loaded photos from location object to skip API calls
}

interface UseLocationPhotosResult {
  photos: string[];
  loading: boolean;
  error: string | null;
  source: string | null;
  fetchPhotos: (forceRefresh?: boolean) => Promise<void>;
}

// =====================================================================
// MODULE-LEVEL CACHE: 24 hours to drastically reduce Google API costs
// =====================================================================
const photosCache = new Map<string, { photos: string[]; source: string; timestamp: number }>();
const PHOTOS_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

function getCacheKey(locationId?: string, googlePlaceId?: string): string {
  return `photos:${locationId || ''}:${googlePlaceId || ''}`;
}

export const useLocationPhotos = ({
  locationId,
  googlePlaceId,
  autoFetch = true,
  maxPhotos = 6,
  initialPhotos
}: UseLocationPhotosOptions): UseLocationPhotosResult => {
  const cacheKey = getCacheKey(locationId, googlePlaceId);
  
  // Check in-memory cache on initial render
  const cached = photosCache.get(cacheKey);
  const hasCachedPhotos = cached && Date.now() - cached.timestamp < PHOTOS_CACHE_DURATION;
  
  // Use initialPhotos or cached photos to avoid API calls
  const [photos, setPhotos] = useState<string[]>(
    initialPhotos?.length ? initialPhotos : 
    hasCachedPhotos ? cached.photos : 
    []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(
    initialPhotos?.length ? 'cache' : 
    hasCachedPhotos ? cached.source : 
    null
  );

  const fetchPhotos = useCallback(async (forceRefresh = false) => {
    if (!locationId && !googlePlaceId) {
      return;
    }

    // Skip fetching if we have pre-loaded photos and not forcing refresh
    if (initialPhotos && initialPhotos.length > 0 && !forceRefresh) {
      setPhotos(initialPhotos);
      setSource('cache');
      // Also populate module-level cache
      photosCache.set(cacheKey, { photos: initialPhotos, source: 'cache', timestamp: Date.now() });
      return;
    }

    // Check module-level in-memory cache (24 hours)
    if (!forceRefresh) {
      const memoryCached = photosCache.get(cacheKey);
      if (memoryCached && Date.now() - memoryCached.timestamp < PHOTOS_CACHE_DURATION) {
        console.log(`✅ Photos memory cache hit for: ${cacheKey}`);
        setPhotos(memoryCached.photos);
        setSource(memoryCached.source);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      // =====================================================================
      // CRITICAL FIX: Check database BEFORE calling edge function!
      // This avoids calling Google API when data is already cached in DB
      // =====================================================================

      // Check 1: cache per locationId
      if (locationId && !forceRefresh) {
        const { data: location } = await supabase
          .from('locations')
          .select('photos, photos_fetched_at')
          .eq('id', locationId)
          .single();

        if (location?.photos && Array.isArray(location.photos) && location.photos.length > 0) {
          console.log(`✅ Photos DB cache hit for locationId: ${locationId}`);
          const photosArr = location.photos as string[];
          setPhotos(photosArr);
          setSource('cache');
          photosCache.set(cacheKey, { photos: photosArr, source: 'cache', timestamp: Date.now() });
          setLoading(false);
          return;
        }
      }

      // Check 2: cache per googlePlaceId
      if (googlePlaceId && !forceRefresh) {
        const { data: locationByGoogle } = await supabase
          .from('locations')
          .select('photos, photos_fetched_at')
          .eq('google_place_id', googlePlaceId)
          .not('photos', 'is', null)
          .limit(1)
          .maybeSingle();

        if (locationByGoogle?.photos && Array.isArray(locationByGoogle.photos) && locationByGoogle.photos.length > 0) {
          console.log(`✅ Photos DB cache hit for google_place_id: ${googlePlaceId}`);
          const photosArr = locationByGoogle.photos as string[];
          setPhotos(photosArr);
          setSource('cache');
          photosCache.set(cacheKey, { photos: photosArr, source: 'cache', timestamp: Date.now() });
          setLoading(false);
          return;
        }
      }

      // Only call edge function if no cached data found in DB or memory
      console.log(`⚠️ No photos cache found, calling edge function for: ${locationId || googlePlaceId}`);
      const { data, error: fnError } = await supabase.functions.invoke('get-place-photos', {
        body: {
          locationId,
          googlePlaceId,
          forceRefresh,
          maxPhotos
        }
      });

      if (fnError) {
        throw fnError;
      }

      if (data?.photos) {
        setPhotos(data.photos);
        setSource(data.source || 'google');
        // Cache the result for 24 hours
        photosCache.set(cacheKey, { 
          photos: data.photos, 
          source: data.source || 'google', 
          timestamp: Date.now() 
        });
      } else {
        setPhotos([]);
        setSource(null);
      }
    } catch (err) {
      console.error('Error fetching location photos:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch photos');
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, [locationId, googlePlaceId, maxPhotos, initialPhotos, cacheKey]);

  useEffect(() => {
    // Skip auto-fetch if we have pre-loaded photos
    if (initialPhotos && initialPhotos.length > 0) {
      return;
    }
    // Skip auto-fetch if we have valid memory cache
    const memoryCached = photosCache.get(cacheKey);
    if (memoryCached && Date.now() - memoryCached.timestamp < PHOTOS_CACHE_DURATION) {
      return;
    }
    if (autoFetch && (locationId || googlePlaceId)) {
      fetchPhotos();
    }
  }, [autoFetch, locationId, googlePlaceId, fetchPhotos, initialPhotos, cacheKey]);

  return {
    photos,
    loading,
    error,
    source,
    fetchPhotos
  };
};
