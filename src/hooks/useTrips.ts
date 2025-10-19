import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Trip {
  id: string;
  name: string;
  description: string | null;
  city: string;
  country: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_image_url: string | null;
  is_public: boolean;
  created_at: string;
  trip_locations?: any[];
}

export const useTrips = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchTrips = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          trip_locations (
            id,
            order_index,
            notes,
            location_id,
            google_place_id,
            locations (
              id,
              name,
              category,
              city,
              image_url
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrips(data || []);
    } catch (error: any) {
      console.error('Error fetching trips:', error);
      toast.error('Failed to load trips');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, [user]);

  const createTrip = async (tripData: {
    name: string;
    city: string;
    country?: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    is_public?: boolean;
    location_ids?: string[];
  }) => {
    if (!user) return null;

    try {
      const { data: newTrip, error: tripError } = await supabase
        .from('trips')
        .insert({
          user_id: user.id,
          name: tripData.name,
          city: tripData.city,
          country: tripData.country,
          description: tripData.description,
          start_date: tripData.start_date,
          end_date: tripData.end_date,
          is_public: tripData.is_public !== false,
        })
        .select()
        .single();

      if (tripError) throw tripError;

      // Add locations if provided
      if (tripData.location_ids && tripData.location_ids.length > 0) {
        const tripLocations = tripData.location_ids.map((locationId, index) => ({
          trip_id: newTrip.id,
          location_id: locationId,
          order_index: index,
        }));

        const { error: locationsError } = await supabase
          .from('trip_locations')
          .insert(tripLocations);

        if (locationsError) throw locationsError;
      }

      toast.success('Trip created successfully!');
      fetchTrips();
      return newTrip;
    } catch (error: any) {
      console.error('Error creating trip:', error);
      toast.error('Failed to create trip');
      return null;
    }
  };

  const deleteTrip = async (tripId: string) => {
    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId);

      if (error) throw error;

      toast.success('Trip deleted');
      fetchTrips();
    } catch (error: any) {
      console.error('Error deleting trip:', error);
      toast.error('Failed to delete trip');
    }
  };

  return {
    trips,
    isLoading,
    createTrip,
    deleteTrip,
    refreshTrips: fetchTrips,
  };
};