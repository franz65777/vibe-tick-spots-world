import { useState, useEffect } from 'react';
import { nominatimGeocoding } from '@/lib/nominatimGeocoding';

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

const STORAGE_KEY = 'last_known_location';

export const useGeolocation = (): UseGeolocationReturn => {
  const [location, setLocation] = useState<GeolocationData | null>(() => {
    // Try to load last known location from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('📍 Loaded location from localStorage:', parsed);
        return parsed;
      }
    } catch (err) {
      console.error('Error loading stored location:', err);
    }
    return null;
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getCityFromCoordinates = async (lat: number, lng: number): Promise<string> => {
    try {
      // First try the Nominatim reverse geocoding
      const result = await nominatimGeocoding.reverseGeocode(lat, lng);
      if (result && result.city && result.city !== 'Unknown City') {
        return result.city;
      }
      
      // Fallback to manual city detection
      return getCityFromCoordinatesManual(lat, lng);
    } catch (error) {
      console.error('Error with Nominatim reverse geocoding:', error);
      return getCityFromCoordinatesManual(lat, lng);
    }
  };

  const getCityFromCoordinatesManual = (lat: number, lng: number): string => {
    console.log('🏙️ Getting city from coordinates:', lat, lng);
    
    // Expanded manual mapping for more cities with larger radius
    const cities = [
      { name: 'San Francisco', lat: 37.7749, lng: -122.4194, radius: 1.0 },
      { name: 'Los Angeles', lat: 34.0522, lng: -118.2437, radius: 1.0 },
      { name: 'New York', lat: 40.7128, lng: -74.0060, radius: 1.0 },
      { name: 'Chicago', lat: 41.8781, lng: -87.6298, radius: 1.0 },
      { name: 'Miami', lat: 25.7617, lng: -80.1918, radius: 1.0 },
      { name: 'Seattle', lat: 47.6062, lng: -122.3321, radius: 1.0 },
      { name: 'Boston', lat: 42.3601, lng: -71.0589, radius: 1.0 },
      { name: 'Washington DC', lat: 38.9072, lng: -77.0369, radius: 1.0 },
      { name: 'Las Vegas', lat: 36.1699, lng: -115.1398, radius: 1.0 },
      { name: 'London', lat: 51.5074, lng: -0.1278, radius: 1.0 },
      { name: 'Paris', lat: 48.8566, lng: 2.3522, radius: 1.0 },
      { name: 'Berlin', lat: 52.5200, lng: 13.4050, radius: 1.0 },
      { name: 'Madrid', lat: 40.4168, lng: -3.7038, radius: 1.0 },
      { name: 'Rome', lat: 41.9028, lng: 12.4964, radius: 1.0 },
      { name: 'Milan', lat: 45.4642, lng: 9.1900, radius: 1.0 },
      { name: 'Barcelona', lat: 41.3851, lng: 2.1734, radius: 1.0 },
      { name: 'Amsterdam', lat: 52.3676, lng: 4.9041, radius: 1.0 },
      { name: 'Vienna', lat: 48.2082, lng: 16.3738, radius: 1.0 },
      { name: 'Zurich', lat: 47.3769, lng: 8.5417, radius: 1.0 },
      { name: 'Dublin', lat: 53.3498, lng: -6.2603, radius: 1.0 },
      { name: 'Edinburgh', lat: 55.9533, lng: -3.1883, radius: 1.0 },
      { name: 'Stockholm', lat: 59.3293, lng: 18.0686, radius: 1.0 },
      { name: 'Copenhagen', lat: 55.6761, lng: 12.5683, radius: 1.0 },
      { name: 'Prague', lat: 50.0755, lng: 14.4378, radius: 1.0 },
      { name: 'Budapest', lat: 47.4979, lng: 19.0402, radius: 1.0 },
      { name: 'Warsaw', lat: 52.2297, lng: 21.0122, radius: 1.0 },
      { name: 'Athens', lat: 37.9755, lng: 23.7348, radius: 1.0 },
      { name: 'Lisbon', lat: 38.7223, lng: -9.1393, radius: 1.0 },
      { name: 'Tokyo', lat: 35.6762, lng: 139.6503, radius: 1.0 },
      { name: 'Osaka', lat: 34.6937, lng: 135.5023, radius: 1.0 },
      { name: 'Kyoto', lat: 35.0116, lng: 135.7681, radius: 1.0 },
      { name: 'Seoul', lat: 37.5665, lng: 126.9780, radius: 1.0 },
      { name: 'Beijing', lat: 39.9042, lng: 116.4074, radius: 1.0 },
      { name: 'Shanghai', lat: 31.2304, lng: 121.4737, radius: 1.0 },
      { name: 'Hong Kong', lat: 22.3193, lng: 114.1694, radius: 1.0 },
      { name: 'Singapore', lat: 1.3521, lng: 103.8198, radius: 1.0 },
      { name: 'Bangkok', lat: 13.7563, lng: 100.5018, radius: 1.0 },
      { name: 'Mumbai', lat: 19.0760, lng: 72.8777, radius: 1.0 },
      { name: 'Delhi', lat: 28.7041, lng: 77.1025, radius: 1.0 },
      { name: 'Bangalore', lat: 12.9716, lng: 77.5946, radius: 1.0 },
      { name: 'Dubai', lat: 25.2048, lng: 55.2708, radius: 1.0 },
      { name: 'Tel Aviv', lat: 32.0853, lng: 34.7818, radius: 1.0 },
      { name: 'Istanbul', lat: 41.0082, lng: 28.9784, radius: 1.0 },
      { name: 'Sydney', lat: -33.8688, lng: 151.2093, radius: 1.0 },
      { name: 'Melbourne', lat: -37.8136, lng: 144.9631, radius: 1.0 },
      { name: 'Brisbane', lat: -27.4698, lng: 153.0251, radius: 1.0 },
      { name: 'Perth', lat: -31.9505, lng: 115.8605, radius: 1.0 },
      { name: 'Auckland', lat: -36.8485, lng: 174.7633, radius: 1.0 },
      { name: 'Toronto', lat: 43.6532, lng: -79.3832, radius: 1.0 },
      { name: 'Vancouver', lat: 49.2827, lng: -123.1207, radius: 1.0 },
      { name: 'Montreal', lat: 45.5017, lng: -73.5673, radius: 1.0 },
      { name: 'Mexico City', lat: 19.4326, lng: -99.1332, radius: 1.0 }
    ];

    for (const city of cities) {
      const distance = Math.sqrt(
        Math.pow(lat - city.lat, 2) + Math.pow(lng - city.lng, 2)
      );
      console.log(`🏙️ Distance to ${city.name}:`, distance, 'vs radius:', city.radius);
      if (distance <= city.radius) {
        console.log(`✅ Found matching city: ${city.name}`);
        return city.name;
      }
    }

    console.log('❌ No matching city found, returning Unknown City');
    return 'Unknown City';
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      console.error('🌍 Geolocation is not supported by this browser');
      setError('Geolocation is not supported by this browser');
      return;
    }

    console.log('🌍 Starting geolocation request...');
    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        console.log('🌍 Geolocation success:', { latitude, longitude, accuracy });
        
        try {
          const city = await getCityFromCoordinates(latitude, longitude);
          console.log('🏙️ City detected from coordinates:', city);
          
          const newLocation = {
            latitude,
            longitude,
            city,
            accuracy
          };
          
          // Save to localStorage for future use
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newLocation));
          } catch (err) {
            console.error('Error saving location to localStorage:', err);
          }
          
          setLocation(newLocation);
          console.log('✅ Location state updated:', newLocation);
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
            errorMessage = 'Location permission denied. Please use the search bar to find your city.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location unavailable in this environment. Use search to select your city.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Try searching for your city instead.';
            break;
        }
        
        setError(errorMessage);
        setLoading(false);
        console.error('Geolocation error:', errorMessage);
        
        // If we don't have a stored location, set a default fallback
        if (!location) {
          console.log('🌍 Setting fallback location to San Francisco');
          const fallbackLocation = {
            latitude: 37.7749,
            longitude: -122.4194,
            city: 'San Francisco',
            accuracy: 0
          };
          setLocation(fallbackLocation);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0 // Always get fresh location
      }
    );
  };

  useEffect(() => {
    // Auto-fetch location on mount
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
