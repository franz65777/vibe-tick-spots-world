
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Trip {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  locations: string[];
  image_url?: string;
  created_at: string;
}

export const useUserTrips = (userId?: string) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrips = async () => {
    if (!userId) {
      setTrips([]);
      setLoading(false);
      return;
    }

    try {
      // For now, return mock data since trips table might not exist
      // In a real implementation, this would query the trips table
      const mockTrips: Trip[] = [
        {
          id: '1',
          user_id: userId,
          name: 'Dublin Adventure',
          description: 'Exploring the best of Dublin',
          start_date: '2024-01-15',
          end_date: '2024-01-20',
          locations: ['Temple Bar', 'Trinity College', 'Guinness Storehouse'],
          image_url: '/placeholder.svg',
          created_at: '2024-01-10T00:00:00Z'
        },
        {
          id: '2',
          user_id: userId,
          name: 'Cork Weekend',
          description: 'Weekend getaway to Cork',
          start_date: '2024-02-10',
          end_date: '2024-02-12',
          locations: ['English Market', 'Blarney Castle'],
          image_url: '/placeholder.svg',
          created_at: '2024-02-05T00:00:00Z'
        }
      ];

      // Only return trips for the specific user
      setTrips(mockTrips.filter(trip => trip.user_id === userId));
    } catch (error) {
      console.error('Error fetching trips:', error);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, [userId]);

  return {
    trips,
    loading,
    refetch: fetchTrips
  };
};
