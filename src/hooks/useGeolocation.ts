
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
  searchCity: (cityName: string) => Promise<{ lat: number; lng: number } | null>;
}

export const useGeolocation = (): UseGeolocationReturn => {
  const [location, setLocation] = useState<GeolocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getCityFromCoordinates = async (lat: number, lng: number): Promise<string> => {
    try {
      // Use Google Maps Geocoding API for better accuracy
      if (window.google && window.google.maps) {
        const geocoder = new window.google.maps.Geocoder();
        const response = await geocoder.geocode({ location: { lat, lng } });
        
        if (response.results[0]) {
          const addressComponents = response.results[0].address_components;
          const cityComponent = addressComponents.find(component => 
            component.types.includes('locality') || 
            component.types.includes('administrative_area_level_1')
          );
          return cityComponent?.long_name || 'Unknown City';
        }
      }
      
      // Fallback to free service
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      
      if (response.ok) {
        const data = await response.json();
        return data.city || data.locality || 'Unknown City';
      }
      
      return getCityFromCoordinatesManual(lat, lng);
    } catch (error) {
      console.error('Error fetching city from coordinates:', error);
      return getCityFromCoordinatesManual(lat, lng);
    }
  };

  const searchCity = async (cityName: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      // Use Google Maps Geocoding API for city search
      if (window.google && window.google.maps) {
        const geocoder = new window.google.maps.Geocoder();
        const response = await geocoder.geocode({ address: cityName });
        
        if (response.results[0]) {
          const location = response.results[0].geometry.location;
          return {
            lat: location.lat(),
            lng: location.lng()
          };
        }
      }
      
      // Fallback to manual city coordinates
      const coordinates = getCityCoordinatesManual(cityName);
      if (coordinates) return coordinates;
      
      return null;
    } catch (error) {
      console.error('Error searching city:', error);
      return null;
    }
  };

  const getCityCoordinatesManual = (cityName: string): { lat: number; lng: number } | null => {
    const cities: Record<string, { lat: number; lng: number }> = {
      'san francisco': { lat: 37.7749, lng: -122.4194 },
      'new york': { lat: 40.7128, lng: -74.0060 },
      'london': { lat: 51.5074, lng: -0.1278 },
      'paris': { lat: 48.8566, lng: 2.3522 },
      'tokyo': { lat: 35.6762, lng: 139.6503 },
      'milan': { lat: 45.4642, lng: 9.1900 },
      'barcelona': { lat: 41.3851, lng: 2.1734 },
      'rome': { lat: 41.9028, lng: 12.4964 },
      'amsterdam': { lat: 52.3676, lng: 4.9041 },
      'sydney': { lat: -33.8688, lng: 151.2093 },
      'dubai': { lat: 25.2048, lng: 55.2708 },
      'singapore': { lat: 1.3521, lng: 103.8198 },
      'hong kong': { lat: 22.3193, lng: 114.1694 },
      'los angeles': { lat: 34.0522, lng: -118.2437 },
      'chicago': { lat: 41.8781, lng: -87.6298 },
      'miami': { lat: 25.7617, lng: -80.1918 },
      'toronto': { lat: 43.6532, lng: -79.3832 },
      'vancouver': { lat: 49.2827, lng: -123.1207 },
      'mexico city': { lat: 19.4326, lng: -99.1332 },
      'berlin': { lat: 52.5200, lng: 13.4050 },
      'madrid': { lat: 40.4168, lng: -3.7038 },
      'lisbon': { lat: 38.7223, lng: -9.1393 },
      'stockholm': { lat: 59.3293, lng: 18.0686 },
      'copenhagen': { lat: 55.6761, lng: 12.5683 },
      'oslo': { lat: 59.9139, lng: 10.7522 },
      'moscow': { lat: 55.7558, lng: 37.6176 },
      'istanbul': { lat: 41.0082, lng: 28.9784 },
      'athens': { lat: 37.9838, lng: 23.7275 },
      'cairo': { lat: 30.0444, lng: 31.2357 },
      'mumbai': { lat: 19.0760, lng: 72.8777 },
      'delhi': { lat: 28.7041, lng: 77.1025 },
      'beijing': { lat: 39.9042, lng: 116.4074 },
      'shanghai': { lat: 31.2304, lng: 121.4737 },
      'seoul': { lat: 37.5665, lng: 126.9780 },
      'bangkok': { lat: 13.7563, lng: 100.5018 },
      'kuala lumpur': { lat: 3.1390, lng: 101.6869 },
      'jakarta': { lat: -6.2088, lng: 106.8456 },
      'manila': { lat: 14.5995, lng: 120.9842 },
      'melbourne': { lat: -37.8136, lng: 144.9631 },
      'brisbane': { lat: -27.4698, lng: 153.0251 },
      'perth': { lat: -31.9505, lng: 115.8605 },
      'auckland': { lat: -36.8485, lng: 174.7633 },
      'wellington': { lat: -41.2865, lng: 174.7762 },
      'cape town': { lat: -33.9249, lng: 18.4241 },
      'johannesburg': { lat: -26.2041, lng: 28.0473 },
      'lagos': { lat: 6.5244, lng: 3.3792 },
      'nairobi': { lat: -1.2921, lng: 36.8219 },
      'rio de janeiro': { lat: -22.9068, lng: -43.1729 },
      'são paulo': { lat: -23.5505, lng: -46.6333 },
      'buenos aires': { lat: -34.6118, lng: -58.3960 },
      'santiago': { lat: -33.4489, lng: -70.6693 },
      'lima': { lat: -12.0464, lng: -77.0428 },
      'bogota': { lat: 4.7110, lng: -74.0721 }
    };
    
    const key = cityName.toLowerCase().trim();
    return cities[key] || null;
  };

  const getCityFromCoordinatesManual = (lat: number, lng: number): string => {
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
      // Fallback to San Francisco
      setLocation({
        latitude: 37.7749,
        longitude: -122.4194,
        city: 'San Francisco'
      });
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
            errorMessage = 'Location permission denied - using San Francisco';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable - using San Francisco';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out - using San Francisco';
            break;
        }
        
        setError(errorMessage);
        // Fallback to San Francisco
        setLocation({
          latitude: 37.7749,
          longitude: -122.4194,
          city: 'San Francisco'
        });
        setLoading(false);
        console.log('Geolocation error, using fallback:', errorMessage);
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
    getCityFromCoordinates,
    searchCity
  };
};
