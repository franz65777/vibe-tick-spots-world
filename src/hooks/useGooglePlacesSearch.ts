
import { useState, useCallback } from 'react';

interface PlaceResult {
  id: string;
  name: string;
  address: string;
  coordinates: { lat: number; lng: number };
  category: string;
  rating?: number;
  photoUrl?: string;
}

export const useGooglePlacesSearch = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchPlaces = useCallback(async (query: string, location?: { lat: number; lng: number }): Promise<PlaceResult[]> => {
    if (!query.trim()) return [];

    setIsLoading(true);
    setError(null);

    try {
      // Use Google Places Text Search API
      const locationBias = location ? `&location=${location.lat},${location.lng}&radius=50000` : '';
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}${locationBias}&key=AIzaSyDGVKK3IvDz3N0vCDX7XHKa0wHkZl6kLOY`
      );

      if (!response.ok) {
        throw new Error('Failed to search places');
      }

      const data = await response.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(data.error_message || 'Places search failed');
      }

      const places: PlaceResult[] = (data.results || []).map((place: any) => ({
        id: place.place_id,
        name: place.name,
        address: place.formatted_address,
        coordinates: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng
        },
        category: place.types?.[0] || 'establishment',
        rating: place.rating,
        photoUrl: place.photos?.[0] ? 
          `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=AIzaSyDGVKK3IvDz3N0vCDX7XHKa0wHkZl6kLOY` 
          : undefined
      }));

      return places;
    } catch (err: any) {
      console.error('Error searching places:', err);
      setError(err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    searchPlaces,
    isLoading,
    error
  };
};
