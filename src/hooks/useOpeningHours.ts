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
  placeName?: string,
  googlePlaceId?: string | null
): OpeningHoursData => {
  const [data, setData] = useState<OpeningHoursData>({
    isOpen: null,
    todayHours: null,
    dayName: '',
    loading: true,
    error: null
  });

  useEffect(() => {
    if (!coordinates?.lat && !googlePlaceId) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    const fetchOpeningHours = async () => {
      try {
        const { data: result, error } = await supabase.functions.invoke('get-place-hours', {
          body: {
            googlePlaceId,
            lat: coordinates?.lat,
            lng: coordinates?.lng,
            name: placeName
          }
        });

        if (error) {
          throw error;
        }

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

        // Extract hours from weekday text if available (more accurate)
        let todayHours = openingHours.todayHours;
        if (openingHours.weekdayText) {
          // weekdayText format: "Saturday: 1:00 PM – 12:30 AM"
          const hoursMatch = openingHours.weekdayText.match(/:\s*(.+)$/);
          if (hoursMatch) {
            todayHours = hoursMatch[1];
          }
        }

        setData({
          isOpen: openingHours.isOpen,
          todayHours,
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
  }, [coordinates?.lat, coordinates?.lng, placeName, googlePlaceId]);

  return data;
};
