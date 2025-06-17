
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Location {
  id: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  category: string;
}

interface NearbyPlace {
  id: string;
  name: string;
  address: string;
  distance?: number;
  category: string;
}

export const useLocationTagging = () => {
  const { user } = useAuth();
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [recentLocations, setRecentLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Get user's current location
  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        });
      });

      const { latitude, longitude } = position.coords;
      setUserLocation({ lat: latitude, lng: longitude });
      
      // Fetch nearby places from database
      await fetchNearbyPlaces(latitude, longitude);
      
    } catch (error) {
      console.error('Error getting location:', error);
      // Fallback to recent/popular locations
      await fetchRecentLocations();
    } finally {
      setLoading(false);
    }
  };

  const fetchNearbyPlaces = async (lat: number, lng: number) => {
    try {
      // Calculate nearby locations using basic distance calculation
      // In a real app, you'd use PostGIS for more accurate geo queries
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(10);

      if (error) throw error;

      // Simple distance calculation (not accurate for long distances)
      const placesWithDistance = data
        ?.map(location => ({
          id: location.id,
          name: location.name,
          address: location.address || '',
          category: location.category,
          distance: calculateDistance(
            lat, lng, 
            Number(location.latitude), 
            Number(location.longitude)
          )
        }))
        .sort((a, b) => (a.distance || 0) - (b.distance || 0))
        .slice(0, 5) || [];

      setNearbyPlaces(placesWithDistance);
    } catch (error) {
      console.error('Error fetching nearby places:', error);
    }
  };

  const fetchRecentLocations = async () => {
    try {
      if (!user) return;

      const { data, error } = await supabase
        .from('user_saved_locations')
        .select(`
          locations (
            id,
            name,
            address,
            latitude,
            longitude,
            category
          )
        `)
        .eq('user_id', user.id)
        .order('saved_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const locations = data
        ?.map(item => item.locations)
        .filter(Boolean) as Location[];

      setRecentLocations(locations || []);
    } catch (error) {
      console.error('Error fetching recent locations:', error);
    }
  };

  const searchLocations = async (query: string) => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .or(`name.ilike.%${query}%,address.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching locations:', error);
      return [];
    }
  };

  const createNewLocation = async (locationData: {
    name: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    category: string;
  }) => {
    try {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('locations')
        .insert({
          ...locationData,
          created_by: user.id,
          pioneer_user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating location:', error);
      return null;
    }
  };

  // Simple distance calculation (Haversine formula approximation)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  useEffect(() => {
    if (user) {
      getCurrentLocation();
      fetchRecentLocations();
    }
  }, [user]);

  return {
    nearbyPlaces,
    recentLocations,
    userLocation,
    loading,
    searchLocations,
    createNewLocation,
    getCurrentLocation
  };
};
