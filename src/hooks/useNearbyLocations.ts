import { useState, useEffect } from 'react';
import { NearbyLocation, NearbyLocationsService } from '@/services/nearbyLocationsService';

interface UseNearbyLocationsOptions {
  userLat?: number;
  userLng?: number;
  radiusKm?: number;
  limit?: number;
  autoFetch?: boolean;
}

export const useNearbyLocations = (options: UseNearbyLocationsOptions = {}) => {
  const {
    userLat,
    userLng,
    radiusKm = 10,
    limit = 10,
    autoFetch = true
  } = options;

  const [locations, setLocations] = useState<NearbyLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNearbyLocations = async () => {
    if (!userLat || !userLng) {
      // If no coordinates provided, get mock data
      setLoading(true);
      try {
        const mockLocations = await NearbyLocationsService.getNearbyLocations(0, 0, radiusKm, limit);
        setLocations(mockLocations);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch locations');
        setLocations([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nearbyLocations = await NearbyLocationsService.getNearbyLocations(
        userLat,
        userLng,
        radiusKm,
        limit
      );
      setLocations(nearbyLocations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch nearby locations');
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const getFeaturedByType = async (type: NearbyLocation['type']) => {
    setLoading(true);
    try {
      const featuredLocations = await NearbyLocationsService.getFeaturedLocationsByType(type, 5);
      return featuredLocations;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch featured locations');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getBusinessOffers = async () => {
    if (!userLat || !userLng) return [];
    
    setLoading(true);
    try {
      const offers = await NearbyLocationsService.getBusinessOffers(userLat, userLng, 5);
      return offers;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch business offers');
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch) {
      fetchNearbyLocations();
    }
  }, [userLat, userLng, radiusKm, limit, autoFetch]);

  return {
    locations,
    loading,
    error,
    refetch: fetchNearbyLocations,
    getFeaturedByType,
    getBusinessOffers
  };
};