import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseLocationPhotosOptions {
  locationId?: string;
  googlePlaceId?: string;
  autoFetch?: boolean;
  maxPhotos?: number;
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
  maxPhotos = 6
}: UseLocationPhotosOptions): UseLocationPhotosResult => {
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);

  const fetchPhotos = useCallback(async (forceRefresh = false) => {
    if (!locationId && !googlePlaceId) {
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
  }, [locationId, googlePlaceId, maxPhotos]);

  useEffect(() => {
    if (autoFetch && (locationId || googlePlaceId)) {
      fetchPhotos();
    }
  }, [autoFetch, locationId, googlePlaceId, fetchPhotos]);

  return {
    photos,
    loading,
    error,
    source,
    fetchPhotos
  };
};
