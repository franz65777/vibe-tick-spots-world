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
  cover_image_url: string | null;
  is_public: boolean;
  created_at: string;
  view_count?: number;
  save_count?: number;
  profiles?: {
    id: string;
    username: string;
    avatar_url: string;
  };
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
    cover_image_url?: string;
    is_public?: boolean;
    places?: any[];
  }) => {
    if (!user) return null;

    try {
      const { data: newTrip, error: tripError } = await supabase
        .from('trips')
        .insert({
          user_id: user.id,
          name: tripData.name,
          city: tripData.city,
          country: tripData.country || 'Unknown',
          description: tripData.description,
          cover_image_url: tripData.cover_image_url,
          is_public: tripData.is_public !== false,
        })
        .select()
        .single();

      if (tripError) throw tripError;

      // Add locations to the trip if provided
      if (tripData.places && tripData.places.length > 0) {
        const tripLocations = tripData.places.map((place, index) => ({
          trip_id: newTrip.id,
          location_id: place.id.startsWith('ChIJ') ? null : place.id,
          google_place_id: place.id.startsWith('ChIJ') ? place.id : null,
          order_index: index,
          notes: null,
        }));

        const { error: locationsError } = await supabase
          .from('trip_locations')
          .insert(tripLocations);

        if (locationsError) {
          console.error('Error adding locations to trip:', locationsError);
        }
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

  const updateTrip = async (tripId: string, updates: {
    name?: string;
    description?: string;
    cover_image_url?: string;
    is_public?: boolean;
  }) => {
    try {
      const { error } = await supabase
        .from('trips')
        .update(updates)
        .eq('id', tripId);

      if (error) throw error;

      toast.success('List updated');
      fetchTrips();
    } catch (error: any) {
      console.error('Error updating trip:', error);
      toast.error('Failed to update list');
    }
  };

  const deleteTrip = async (tripId: string) => {
    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId);

      if (error) throw error;

      toast.success('List deleted');
      fetchTrips();
    } catch (error: any) {
      console.error('Error deleting trip:', error);
      toast.error('Failed to delete list');
    }
  };

  return {
    trips,
    isLoading,
    createTrip,
    updateTrip,
    deleteTrip,
    refreshTrips: fetchTrips,
  };
};