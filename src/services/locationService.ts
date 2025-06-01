
import { supabase } from '@/lib/supabase';

export interface Location {
  id: string;
  name: string;
  category: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  created_by: string;
  pioneer_user_id: string;
  created_at: string;
  updated_at: string;
  metadata?: any;
  is_saved?: boolean;
  media_count?: number;
}

export interface SaveLocationData {
  name: string;
  category: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  metadata?: any;
}

export const locationService = {
  // Save a new location (creates the hub)
  async saveLocation(locationData: SaveLocationData): Promise<Location | null> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) throw new Error('User not authenticated');

      // First check if location already exists
      const { data: existingLocation } = await supabase
        .from('locations')
        .select('*')
        .eq('name', locationData.name)
        .eq('address', locationData.address || '')
        .single();

      let location: Location;

      if (existingLocation) {
        // Location exists, just save it for the user
        location = existingLocation;
      } else {
        // Create new location hub
        const { data: newLocation, error } = await supabase
          .from('locations')
          .insert({
            ...locationData,
            created_by: user.user.id,
            pioneer_user_id: user.user.id, // First person to save becomes pioneer
          })
          .select()
          .single();

        if (error) throw error;
        location = newLocation;
      }

      // Save location for current user
      const { error: saveError } = await supabase
        .from('user_saved_locations')
        .insert({
          user_id: user.user.id,
          location_id: location.id,
        });

      if (saveError && !saveError.message.includes('duplicate')) {
        throw saveError;
      }

      return location;
    } catch (error) {
      console.error('Error saving location:', error);
      return null;
    }
  },

  // Get user's saved locations with better error handling
  async getUserSavedLocations(): Promise<Location[]> {
    try {
      console.log('Getting user saved locations...');
      
      // Check if Supabase is properly configured
      if (!supabase) {
        console.warn('Supabase not configured, returning empty array');
        return [];
      }

      const { data: user, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.warn('Auth error, user not authenticated:', userError);
        return [];
      }
      
      if (!user?.user) {
        console.warn('No authenticated user found');
        return [];
      }

      console.log('User authenticated, fetching saved locations...');

      const { data, error } = await supabase
        .from('user_saved_locations')
        .select(`
          location_id,
          saved_at,
          locations (
            id,
            name,
            category,
            address,
            latitude,
            longitude,
            created_by,
            pioneer_user_id,
            created_at,
            updated_at,
            metadata
          )
        `)
        .eq('user_id', user.user.id)
        .order('saved_at', { ascending: false });

      if (error) {
        console.error('Database error fetching saved locations:', error);
        return [];
      }

      console.log('Raw data from Supabase:', data);

      if (!data) {
        console.log('No data returned from query');
        return [];
      }

      const locations = data
        .filter(item => item.locations) // Filter out any null locations
        .map(item => {
          const location = item.locations as any;
          return {
            id: location.id,
            name: location.name,
            category: location.category,
            address: location.address,
            latitude: location.latitude,
            longitude: location.longitude,
            created_by: location.created_by,
            pioneer_user_id: location.pioneer_user_id,
            created_at: location.created_at,
            updated_at: location.updated_at,
            metadata: location.metadata,
            is_saved: true,
          } as Location;
        });

      console.log('Processed locations:', locations);
      return locations;
    } catch (error) {
      console.error('Error fetching saved locations:', error);
      return [];
    }
  },

  // Get location details with media count
  async getLocationDetails(locationId: string): Promise<Location | null> {
    try {
      const { data: location, error } = await supabase
        .from('locations')
        .select(`
          *,
          media (count)
        `)
        .eq('id', locationId)
        .single();

      if (error) throw error;

      return {
        ...location,
        media_count: location.media?.[0]?.count || 0,
      };
    } catch (error) {
      console.error('Error fetching location details:', error);
      return null;
    }
  },

  // Search locations
  async searchLocations(query: string): Promise<Location[]> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .or(`name.ilike.%${query}%, address.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching locations:', error);
      return [];
    }
  },

  // Unsave location
  async unsaveLocation(locationId: string): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) return false;

      const { error } = await supabase
        .from('user_saved_locations')
        .delete()
        .eq('user_id', user.user.id)
        .eq('location_id', locationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error unsaving location:', error);
      return false;
    }
  },
};
