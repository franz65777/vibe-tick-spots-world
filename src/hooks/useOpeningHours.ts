import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OpeningHoursData {
  isOpen: boolean | null;
  todayHours: string | null;
  dayName: string;
  loading: boolean;
  error: string | null;
}

export const useOpeningHours = (
  coordinates: { lat: number; lng: number } | null | undefined,
  placeName?: string
): OpeningHoursData => {
  const [data, setData] = useState<OpeningHoursData>({
    isOpen: null,
    todayHours: null,
    dayName: '',
    loading: true,
    error: null
  });

  useEffect(() => {
    if (!coordinates?.lat || !coordinates?.lng) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    const fetchOpeningHours = async () => {
      try {
        console.log(`Fetching hours for ${placeName} at ${coordinates.lat}, ${coordinates.lng}`);
        
        const { data: result, error } = await supabase.functions.invoke('get-place-hours', {
          body: {
            lat: coordinates.lat,
            lng: coordinates.lng,
            name: placeName
          }
        });

        if (error) {
          console.error('Edge function error:', error);
          throw error;
        }

        console.log('Opening hours result:', result);

        if (!result?.openingHours) {
          setData({
            isOpen: null,
            todayHours: null,
            dayName: '',
            loading: false,
            error: null
          });
          return;
        }

        const { openingHours } = result;
        
        // Get day name
        const now = new Date();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[now.getDay()];

        setData({
          isOpen: openingHours.isOpen,
          todayHours: openingHours.todayHours,
          dayName,
          loading: false,
          error: null
        });
      } catch (error) {
        console.warn('Error fetching opening hours:', error);
        setData({
          isOpen: null,
          todayHours: null,
          dayName: '',
          loading: false,
          error: 'Failed to fetch opening hours'
        });
      }
    };

    fetchOpeningHours();
  }, [coordinates?.lat, coordinates?.lng, placeName]);

  return data;
};
