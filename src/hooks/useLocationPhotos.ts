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

export const useLocationPhotos = ({
  locationId,
  googlePlaceId,
  autoFetch = true,
  maxPhotos = 6,
  initialPhotos
}: UseLocationPhotosOptions): UseLocationPhotosResult => {
  // Use initialPhotos if available to avoid API calls
  const [photos, setPhotos] = useState<string[]>(initialPhotos || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(initialPhotos?.length ? 'cache' : null);

  const fetchPhotos = useCallback(async (forceRefresh = false) => {
    if (!locationId && !googlePlaceId) {
      return;
    }

    // Skip fetching if we have pre-loaded photos and not forcing refresh
    if (initialPhotos && initialPhotos.length > 0 && !forceRefresh) {
      setPhotos(initialPhotos);
      setSource('cache');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First check if we have cached photos in the location record
      if (locationId && !forceRefresh) {
        const { data: location } = await supabase
          .from('locations')
          .select('photos, photos_fetched_at')
          .eq('id', locationId)
          .single();

        if (location?.photos && Array.isArray(location.photos) && location.photos.length > 0) {
          setPhotos(location.photos as string[]);
          setSource('cache');
          setLoading(false);
          return;
        }
      }

      // Fetch from edge function
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
  }, [locationId, googlePlaceId, maxPhotos, initialPhotos]);

  useEffect(() => {
    // Skip auto-fetch if we have pre-loaded photos
    if (initialPhotos && initialPhotos.length > 0) {
      return;
    }
    if (autoFetch && (locationId || googlePlaceId)) {
      fetchPhotos();
    }
  }, [autoFetch, locationId, googlePlaceId, fetchPhotos, initialPhotos]);

  return {
    photos,
    loading,
    error,
    source,
    fetchPhotos
  };
};
