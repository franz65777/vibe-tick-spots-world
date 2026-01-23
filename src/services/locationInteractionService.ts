import { supabase } from '@/integrations/supabase/client';
import { trackInteraction } from './recommendationService';
import { toast } from 'sonner';
import { isValidUUID } from '@/utils/uuidValidation';

export interface LocationInteraction {
  id: string;
  user_id: string;
  location_id: string;
  interaction_type: 'like' | 'save' | 'visit';
  created_at: string;
}

// Validate location exists on Google Maps and is not permanently closed
async function validateLocationWithGoogle(name: string, latitude: number, longitude: number): Promise<{ valid: boolean; google_place_id?: string; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('validate-location', {
      body: { name, latitude, longitude }
    });

    if (error) {
      console.error('Location validation error:', error);
      // On error, allow save to not block user
      return { valid: true };
    }

    return data;
  } catch (err) {
    console.error('Location validation failed:', err);
    // On error, allow save
    return { valid: true };
  }
}

class LocationInteractionService {
  // Save a location for the user - with validation for closed locations
  async saveLocation(locationId: string, locationData?: any, saveTag: string = 'to_try'): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) return false;

      let internalLocationId = locationId;

      // First, try to resolve the internal location.id if we have a google_place_id
      if (locationData?.google_place_id) {
        const { data: existingLocation } = await supabase
          .from('locations')
          .select('id')
          .eq('google_place_id', locationData.google_place_id)
          .maybeSingle();

        if (existingLocation) {
          internalLocationId = existingLocation.id;
        } else {
          // For external locations (Foursquare/OSM), validate with Google before creating
          if (locationData.name && locationData.latitude && locationData.longitude) {
            const validation = await validateLocationWithGoogle(
              locationData.name,
              locationData.latitude,
              locationData.longitude
            );

            if (!validation.valid) {
              console.log('Location validation failed:', validation.error);
              toast.error(validation.error || 'Questa location non esiste più su Google Maps');
              return false;
            }

            // If we got a google_place_id from validation, use it
            if (validation.google_place_id) {
              // Check if location already exists with this google_place_id
              const { data: validatedLocation } = await supabase
                .from('locations')
                .select('id')
                .eq('google_place_id', validation.google_place_id)
                .maybeSingle();

              if (validatedLocation) {
                internalLocationId = validatedLocation.id;
              } else {
                // Update locationData with validated google_place_id
                locationData.google_place_id = validation.google_place_id;
              }
            }
          }

          // Create new location only if we don't have an internal ID yet
          if (internalLocationId === locationId) {
            const { data: newLocation, error: locationError } = await supabase
              .from('locations')
              .insert({
                google_place_id: locationData.google_place_id,
                name: locationData.name,
                address: locationData.address,
                latitude: locationData.latitude,
                longitude: locationData.longitude,
                category: locationData.category || 'restaurant',
                place_types: locationData.types || [],
                created_by: user.user.id,
                pioneer_user_id: user.user.id
              })
              .select('id')
              .single();

            if (locationError) {
              console.error('Location creation error:', locationError);
              return false;
            }
            internalLocationId = newLocation.id;
          }
        }
      } else {
        // For locations without google_place_id, validate if we have name + coords
        if (locationData?.name && locationData?.latitude && locationData?.longitude) {
          const validation = await validateLocationWithGoogle(
            locationData.name,
            locationData.latitude,
            locationData.longitude
          );

          if (!validation.valid) {
            console.log('Location validation failed:', validation.error);
            toast.error(validation.error || 'Questa location non esiste più su Google Maps');
            return false;
          }
        }

        // If no locationData, try to check if locationId is a google_place_id
        // Only query by UUID if it's a valid UUID to avoid database errors
        let existingLocation = null;
        if (isValidUUID(locationId)) {
          const { data } = await supabase
            .from('locations')
            .select('id')
            .eq('id', locationId)
            .maybeSingle();
          existingLocation = data;
        }
        
        // If not found by UUID, try google_place_id
        if (!existingLocation) {
          const { data } = await supabase
            .from('locations')
            .select('id')
            .eq('google_place_id', locationId)
            .maybeSingle();
          existingLocation = data;
        }

        if (existingLocation) {
          internalLocationId = existingLocation.id;
        }
      }

      // Delete any existing save with different tag to ensure only one save per location
      await supabase
        .from('user_saved_locations')
        .delete()
        .eq('user_id', user.user.id)
        .eq('location_id', internalLocationId);

      // Also delete from legacy saved_places table using google_place_id
      if (locationData?.google_place_id) {
        await supabase
          .from('saved_places')
          .delete()
          .eq('user_id', user.user.id)
          .eq('place_id', locationData.google_place_id);
      }
      // Also try to delete using locationId as place_id (fallback)
      await supabase
        .from('saved_places')
        .delete()
        .eq('user_id', user.user.id)
        .eq('place_id', locationId);

      // Now insert the new save with the correct tag
      const { error } = await supabase
        .from('user_saved_locations')
        .insert({
          user_id: user.user.id,
          location_id: internalLocationId,
          save_tag: saveTag
        });

      if (error) {
        console.error('Save location error:', error);
        return false;
      }

      // Track the save interaction for recommendations
      try {
        await trackInteraction(user.user.id, internalLocationId, 'save');
      } catch (trackError) {
        console.error('Error tracking save interaction:', trackError);
      }

      return true;
    } catch (error) {
      console.error('Save location error:', error);
      return false;
    }
  }

  // Unsave a location for the user (removes from both tables)
  async unsaveLocation(locationId: string): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) return false;

      // Try to resolve internal location id - query separately to avoid UUID parse errors
      let internalLocationId = locationId;
      let existingLocation = null;
      
      if (isValidUUID(locationId)) {
        const { data } = await supabase
          .from('locations')
          .select('id, google_place_id')
          .eq('id', locationId)
          .maybeSingle();
        existingLocation = data;
      }
      
      // If not found by UUID, try google_place_id
      if (!existingLocation) {
        const { data } = await supabase
          .from('locations')
          .select('id, google_place_id')
          .eq('google_place_id', locationId)
          .maybeSingle();
        existingLocation = data;
      }

      if (existingLocation) {
        internalLocationId = existingLocation.id;
        
        // Remove from user_saved_locations using internal id
        await supabase
          .from('user_saved_locations')
          .delete()
          .eq('user_id', user.user.id)
          .eq('location_id', internalLocationId);

        // Remove from saved_places using google_place_id if available
        if (existingLocation.google_place_id) {
          await supabase
            .from('saved_places')
            .delete()
            .eq('user_id', user.user.id)
            .eq('place_id', existingLocation.google_place_id);
        }
      } else {
        // Fallback: Only try UUID-based delete if it's a valid UUID
        if (isValidUUID(locationId)) {
          await supabase
            .from('user_saved_locations')
            .delete()
            .eq('user_id', user.user.id)
            .eq('location_id', locationId);
        }

        // Try saved_places with locationId as place_id (works for Google Place IDs)
        await supabase
          .from('saved_places')
          .delete()
          .eq('user_id', user.user.id)
          .eq('place_id', locationId);
      }

      return true;
    } catch (error) {
      console.error('Unsave location error:', error);
      return false;
    }
  }

  // Like/Unlike a location
  async toggleLocationLike(locationId: string): Promise<{ liked: boolean; count: number }> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) return { liked: false, count: 0 };

      // Check if already liked
      const { data: existingLike } = await supabase
        .from('location_likes')
        .select('id')
        .eq('user_id', user.user.id)
        .eq('location_id', locationId)
        .maybeSingle();

      if (existingLike) {
        // Unlike
        await supabase
          .from('location_likes')
          .delete()
          .eq('user_id', user.user.id)
          .eq('location_id', locationId);

        // Get updated count
        const { count } = await supabase
          .from('location_likes')
          .select('*', { count: 'exact', head: true })
          .eq('location_id', locationId);

        return { liked: false, count: count || 0 };
      } else {
        // Like
        await supabase
          .from('location_likes')
          .insert({
            user_id: user.user.id,
            location_id: locationId
          });

        // Track the like interaction for recommendations
        try {
          await trackInteraction(user.user.id, locationId, 'like');
        } catch (trackError) {
          console.error('Error tracking like interaction:', trackError);
        }

        // Get updated count
        const { count } = await supabase
          .from('location_likes')
          .select('*', { count: 'exact', head: true })
          .eq('location_id', locationId);

        return { liked: true, count: count || 1 };
      }
    } catch (error) {
      console.error('Toggle location like error:', error);
      return { liked: false, count: 0 };
    }
  }

  // Get locations for following feed (locations saved by followed users)
  async getFollowingLocations(userId: string): Promise<any[]> {
    try {
      // Get users that the current user follows
      const { data: followedUsers, error: followError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);

      if (followError || !followedUsers || followedUsers.length === 0) {
        console.log('No followed users found');
        return [];
      }

      const followedUserIds = followedUsers.map(f => f.following_id);
      console.log('Following user IDs:', followedUserIds);

      // Get saved locations from followed users
      const { data: savedLocations, error: savedError } = await supabase
        .from('user_saved_locations')
        .select(`
          location_id,
          user_id,
          created_at,
          locations!inner(
            id,
            name,
            address,
            latitude,
            longitude,
            category,
            google_place_id
          )
        `)
        .in('user_id', followedUserIds);

      if (savedError) {
        console.error('Following saved locations error:', savedError);
        return [];
      }

      console.log('Saved locations from followed users:', savedLocations?.length || 0);

      if (!savedLocations || savedLocations.length === 0) {
        return [];
      }

      // Get user profiles for attribution
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', followedUserIds);

      if (profilesError) {
        console.error('Profiles error:', profilesError);
      }

      // Create a map of user profiles for quick lookup
      const profileMap = new Map();
      profiles?.forEach(profile => {
        profileMap.set(profile.id, profile);
      });

      // Transform saved locations into location format, deduplicate by google_place_id or id
      const locationMap = new Map();
      
      savedLocations.forEach(saved => {
        const location = saved.locations as any;
        const locationKey = location.google_place_id || location.id;
        const userProfile = profileMap.get(saved.user_id);
        
        if (!locationMap.has(locationKey)) {
          locationMap.set(locationKey, {
            id: location.id,
            name: location.name,
            category: location.category,
            coordinates: { 
              lat: parseFloat(location.latitude?.toString() || '0'), 
              lng: parseFloat(location.longitude?.toString() || '0') 
            },
            likes: 0,
            isFollowing: true,
            addedBy: userProfile?.full_name || userProfile?.username || 'Someone',
            addedDate: new Date(saved.created_at).toLocaleDateString(),
            popularity: 75,
            city: undefined,
            isNew: false,
            image: undefined,
            friendsWhoSaved: [],
            visitors: [],
            distance: Math.random() * 10,
            totalSaves: 0,
            address: location.address || '',
            google_place_id: location.google_place_id
          });
        }
      });

      const locations = Array.from(locationMap.values());
      console.log('Final following locations:', locations.length);
      return locations;
    } catch (error) {
      console.error('Get following locations error:', error);
      return [];
    }
  }

  // Check if user has saved a location (checks both tables and resolves google_place_id)
  async isLocationSaved(locationId: string): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) return false;

      // 1) Direct check with internal location id
      const { data: internalSave } = await supabase
        .from('user_saved_locations')
        .select('id')
        .eq('user_id', user.user.id)
        .eq('location_id', locationId)
        .maybeSingle();

      if (internalSave) return true;

      // 2) If not found, treat locationId as google_place_id and resolve internal id
      const { data: locationRow } = await supabase
        .from('locations')
        .select('id')
        .eq('google_place_id', locationId)
        .maybeSingle();

      if (locationRow?.id) {
        const { data: resolvedSave } = await supabase
          .from('user_saved_locations')
          .select('id')
          .eq('user_id', user.user.id)
          .eq('location_id', locationRow.id)
          .maybeSingle();
        if (resolvedSave) return true;
      }

      // 3) Legacy: check saved_places by google place id
      const { data: googleSave } = await supabase
        .from('saved_places')
        .select('id')
        .eq('user_id', user.user.id)
        .eq('place_id', locationId)
        .maybeSingle();

      return !!googleSave;
    } catch (error) {
      console.error('Check saved location error:', error);
      return false;
    }
  }

  // Check if user has liked a location
  async isLocationLiked(locationId: string): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) return false;

      const { data } = await supabase
        .from('location_likes')
        .select('id')
        .eq('user_id', user.user.id)
        .eq('location_id', locationId)
        .maybeSingle();

      return !!data;
    } catch (error) {
      console.error('Check liked location error:', error);
      return false;
    }
  }

  // Get the current save tag for a location
  async getCurrentSaveTag(locationId: string): Promise<string> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) return 'general';

      // Try to resolve the internal location id (for user_saved_locations)
      const { data: location } = await supabase
        .from('locations')
        .select('id')
        .or(`id.eq.${locationId},google_place_id.eq.${locationId}`)
        .maybeSingle();

      const internalId = location?.id || locationId;

      // 1) New system: user_saved_locations (one row per location with save_tag)
      const { data: savedLocation } = await supabase
        .from('user_saved_locations')
        .select('save_tag')
        .eq('user_id', user.user.id)
        .eq('location_id', internalId)
        .maybeSingle();

      if (savedLocation?.save_tag) {
        return savedLocation.save_tag;
      }

      // 2) Legacy system: saved_places (place_id = google_place_id)
      const { data: savedPlace } = await supabase
        .from('saved_places')
        .select('save_tag')
        .eq('user_id', user.user.id)
        .eq('place_id', locationId)
        .maybeSingle();

      if (savedPlace?.save_tag) {
        return savedPlace.save_tag;
      }

      return 'general';
    } catch (error) {
      console.error('Error getting save tag:', error);
      return 'general';
    }
  }

  // Get location like count
  async getLocationLikeCount(locationId: string): Promise<number> {
    try {
      const { count } = await supabase
        .from('location_likes')
        .select('*', { count: 'exact', head: true })
        .eq('location_id', locationId);

      return count || 0;
    } catch (error) {
      console.error('Get location like count error:', error);
      return 0;
    }
  }
}

export const locationInteractionService = new LocationInteractionService();
