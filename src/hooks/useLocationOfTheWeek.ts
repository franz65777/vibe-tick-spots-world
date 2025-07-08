import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LocationOfTheWeek {
  location_id: string;
  location_name: string;
  location_category: string;
  location_address: string;
  latitude: number;
  longitude: number;
  image_url: string;
  total_likes: number;
  total_saves: number;
  total_score: number;
}

interface UseLocationOfTheWeekReturn {
  locationOfTheWeek: LocationOfTheWeek | null;
  loading: boolean;
  error: string | null;
  refreshLocationOfTheWeek: () => void;
}

export const useLocationOfTheWeek = (): UseLocationOfTheWeekReturn => {
  const [locationOfTheWeek, setLocationOfTheWeek] = useState<LocationOfTheWeek | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocationOfTheWeek = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .rpc('get_location_of_the_week');

      if (fetchError) {
        console.error('Error fetching location of the week:', fetchError);
        setError(fetchError.message);
        return;
      }

      if (data && data.length > 0) {
        setLocationOfTheWeek(data[0]);
      } else {
        // If no library location found, create a default one
        setLocationOfTheWeek({
          location_id: 'default',
          location_name: 'Central Library',
          location_category: 'library',
          location_address: 'Downtown Area',
          latitude: 37.7749,
          longitude: -122.4194,
          image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
          total_likes: 0,
          total_saves: 0,
          total_score: 0
        });
      }
    } catch (err: any) {
      console.error('Error in fetchLocationOfTheWeek:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocationOfTheWeek();
  }, []);

  const refreshLocationOfTheWeek = () => {
    fetchLocationOfTheWeek();
  };

  return {
    locationOfTheWeek,
    loading,
    error,
    refreshLocationOfTheWeek
  };
};