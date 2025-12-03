import { supabase } from '@/lib/supabase';
import { mapGooglePlaceTypeToCategory } from '@/utils/allowedCategories';

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
  google_place_id?: string;
}

export interface SaveLocationData {
  name: string;
  category: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  metadata?: any;
  google_place_id?: string;
}

export const locationService = {
  // Save a new location (creates the hub) - FIXED to prevent duplicates
  async saveLocation(locationData: SaveLocationData): Promise<Location | null> {
    // If Supabase is not configured, return mock data
    if (!supabase) {
      console.warn('Supabase not configured, returning mock location');
      return {
        id: Date.now().toString(),
        ...locationData,
        created_by: 'demo-user',
        pioneer_user_id: 'demo-user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_saved: true,
      };
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) throw new Error('User not authenticated');

      // CRITICAL: Check for existing location by Google Place ID FIRST
      if (locationData.google_place_id) {
        console.log('🔍 Checking for existing location by Google Place ID:', locationData.google_place_id);
        
        const { data: existingLocation } = await supabase
          .from('locations')
          .select('*')
          .eq('google_place_id', locationData.google_place_id)
          .maybeSingle();

        if (existingLocation) {
          console.log('✅ Location already exists by Google Place ID, using existing:', existingLocation.name);
          
          // Save location for current user if not already saved
          const { error: saveError } = await supabase
            .from('user_saved_locations')
            .insert({
              user_id: user.user.id,
              location_id: existingLocation.id,
            });

          if (saveError && !saveError.message.includes('duplicate')) {
            throw saveError;
          }

          return existingLocation;
        }
      }

      // CRITICAL: Check for existing location by COORDINATES (within ~11m precision)
      // This prevents duplicate locations with different names at the same physical location
      if (locationData.latitude && locationData.longitude) {
        console.log('🔍 Checking for existing location by coordinates:', locationData.latitude, locationData.longitude);
        
        // Round to 4 decimal places (~11m precision) to match the database constraint
        const roundedLat = Math.round(locationData.latitude * 10000) / 10000;
        const roundedLng = Math.round(locationData.longitude * 10000) / 10000;
        
        const { data: existingLocations } = await supabase
          .from('locations')
          .select('*')
          .gte('latitude', roundedLat - 0.00015)
          .lte('latitude', roundedLat + 0.00015)
          .gte('longitude', roundedLng - 0.00015)
          .lte('longitude', roundedLng + 0.00015)
          .limit(1);

        if (existingLocations && existingLocations.length > 0) {
          const existingLocation = existingLocations[0];
          console.log('✅ Location already exists at coordinates, using existing:', existingLocation.name, 'instead of:', locationData.name);
          
          // Save location for current user if not already saved
          const { error: saveError } = await supabase
            .from('user_saved_locations')
            .insert({
              user_id: user.user.id,
              location_id: existingLocation.id,
            });

          if (saveError && !saveError.message.includes('duplicate')) {
            throw saveError;
          }

          return existingLocation;
        }
      }

      // Only check by name/address as fallback if no coordinate or Google Place ID match
      const { data: existingLocationByNameAddress } = await supabase
        .from('locations')
        .select('*')
        .eq('name', locationData.name)
        .eq('address', locationData.address || '')
        .maybeSingle();

      let location: Location;

      if (existingLocationByNameAddress) {
        // Location exists by name/address, use it
        location = existingLocationByNameAddress;
        console.log('✅ Location exists by name/address, using existing:', location.name);
      } else {
        // Create new location hub with better category mapping
        console.log('🆕 Creating new location hub:', locationData.name);
        
        // Use the category mapping if we have types from Google Places
        const category = (locationData.metadata?.types) 
          ? mapGooglePlaceTypeToCategory(locationData.metadata.types)
          : locationData.category;
        
        const { data: newLocation, error } = await supabase
          .from('locations')
          .insert({
            ...locationData,
            category,
            created_by: user.user.id,
            pioneer_user_id: user.user.id,
          })
          .select()
          .single();

        if (error) {
          // Handle duplicate coordinate error from database trigger
          if (error.message?.includes('DUPLICATE_LOCATION:') || error.message?.includes('unique constraint')) {
            console.log('⚠️ Duplicate detected by database, fetching existing location...');
            
            // Extract the existing location ID from the error if available
            const match = error.message?.match(/DUPLICATE_LOCATION:([a-f0-9-]+)/);
            if (match) {
              const { data: existingLoc } = await supabase
                .from('locations')
                .select('*')
                .eq('id', match[1])
                .single();
              
              if (existingLoc) {
                // Save for current user
                await supabase
                  .from('user_saved_locations')
                  .insert({ user_id: user.user.id, location_id: existingLoc.id });
                return existingLoc;
              }
            }
            
            // Fallback: search by coordinates again
            if (locationData.latitude && locationData.longitude) {
              const roundedLat = Math.round(locationData.latitude * 10000) / 10000;
              const roundedLng = Math.round(locationData.longitude * 10000) / 10000;
              
              const { data: fallbackLocations } = await supabase
                .from('locations')
                .select('*')
                .gte('latitude', roundedLat - 0.0002)
                .lte('latitude', roundedLat + 0.0002)
                .gte('longitude', roundedLng - 0.0002)
                .lte('longitude', roundedLng + 0.0002)
                .limit(1);
              
              if (fallbackLocations?.[0]) {
                await supabase
                  .from('user_saved_locations')
                  .insert({ user_id: user.user.id, location_id: fallbackLocations[0].id });
                return fallbackLocations[0];
              }
            }
          }
          throw error;
        }
        
        location = newLocation;
        console.log('✅ Created new location hub with category:', location.category);
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
      console.error('❌ Error saving location:', error);
      return null;
    }
  },

  // Get user's saved locations with better error handling
  async getUserSavedLocations(): Promise<Location[]> {
    // If Supabase is not configured, return empty array
    if (!supabase) {
      console.warn('Supabase not configured, returning empty locations array');
      return [];
    }

    try {
      console.log('Getting user saved locations...');
      
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
            metadata,
            google_place_id
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
        .filter(item => item.locations)
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
            google_place_id: location.google_place_id,
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
    if (!supabase) {
      console.warn('Supabase not configured');
      return null;
    }

    try {
      const { data: location, error } = await supabase
        .from('locations')
        .select(`
          *,
          posts (count)
        `)
        .eq('id', locationId)
        .single();

      if (error) throw error;

      return {
        ...location,
        media_count: location.posts?.[0]?.count || 0,
      };
    } catch (error) {
      console.error('Error fetching location details:', error);
      return null;
    }
  },

  async searchLocations(query: string): Promise<Location[]> {
    if (!supabase) {
      console.warn('Supabase not configured, returning empty search results');
      return [];
    }

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

  async unsaveLocation(locationId: string): Promise<boolean> {
    if (!supabase) {
      console.warn('Supabase not configured');
      return false;
    }

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
