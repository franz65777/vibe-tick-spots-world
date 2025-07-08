
import { useState, useEffect } from 'react';

interface GeolocationData {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  accuracy?: number;
}

interface UseGeolocationReturn {
  location: GeolocationData | null;
  error: string | null;
  loading: boolean;
  getCurrentLocation: () => void;
  getCityFromCoordinates: (lat: number, lng: number) => Promise<string>;
}

export const useGeolocation = (): UseGeolocationReturn => {
  const [location, setLocation] = useState<GeolocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getCityFromCoordinates = async (lat: number, lng: number): Promise<string> => {
    try {
      // Use more reliable reverse geocoding API with proper error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(
        `https://api.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
        { 
          signal: controller.signal,
          headers: {
            'User-Agent': 'LocationApp/1.0'
          }
        }
      );
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        const address = data.address;
        return address?.city || address?.town || address?.village || address?.municipality || 'Unknown City';
      }
      
      // Fallback to manual city detection based on coordinates
      return getCityFromCoordinatesManual(lat, lng);
    } catch (error) {
      console.error('Error fetching city from coordinates:', error);
      return getCityFromCoordinatesManual(lat, lng);
    }
  };

  const getCityFromCoordinatesManual = (lat: number, lng: number): string => {
    // Simple manual mapping for major cities
    const cities = [
      { name: 'San Francisco', lat: 37.7749, lng: -122.4194, radius: 0.5 },
      { name: 'New York', lat: 40.7128, lng: -74.0060, radius: 0.5 },
      { name: 'London', lat: 51.5074, lng: -0.1278, radius: 0.5 },
      { name: 'Paris', lat: 48.8566, lng: 2.3522, radius: 0.5 },
      { name: 'Tokyo', lat: 35.6762, lng: 139.6503, radius: 0.5 },
      { name: 'Milan', lat: 45.4642, lng: 9.1900, radius: 0.5 },
      { name: 'Barcelona', lat: 41.3851, lng: 2.1734, radius: 0.5 },
      { name: 'Rome', lat: 41.9028, lng: 12.4964, radius: 0.5 },
      { name: 'Amsterdam', lat: 52.3676, lng: 4.9041, radius: 0.5 },
      { name: 'Sydney', lat: -33.8688, lng: 151.2093, radius: 0.5 }
    ];

    for (const city of cities) {
      const distance = Math.sqrt(
        Math.pow(lat - city.lat, 2) + Math.pow(lng - city.lng, 2)
      );
      if (distance <= city.radius) {
        return city.name;
      }
    }

    return 'Unknown City';
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        try {
          const city = await getCityFromCoordinates(latitude, longitude);
          
          setLocation({
            latitude,
            longitude,
            city,
            accuracy
          });
          
          console.log('Location detected:', { latitude, longitude, city });
        } catch (err) {
          console.error('Error getting city name:', err);
          setLocation({
            latitude,
            longitude,
            accuracy
          });
        }
        
        setLoading(false);
      },
      (error) => {
        let errorMessage = 'Unknown error occurred';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        
        setError(errorMessage);
        setLoading(false);
        console.error('Geolocation error:', errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  useEffect(() => {
    // Auto-detect location on mount
    getCurrentLocation();
  }, []);

  return {
    location,
    error,
    loading,
    getCurrentLocation,
    getCityFromCoordinates
  };
};
