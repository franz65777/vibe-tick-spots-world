import { supabase } from '@/integrations/supabase/client';
import { trackInteraction } from './recommendationService';

export interface LocationInteraction {
  id: string;
  user_id: string;
  location_id: string;
  interaction_type: 'like' | 'save' | 'visit';
  created_at: string;
}

class LocationInteractionService {
  // Save a location for the user - IMPROVED duplicate prevention
  async saveLocation(locationId: string, locationData?: any, saveTag: string = 'general'): Promise<boolean> {
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
          // Create new location only if it doesn't exist
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
      } else {
        // If no locationData, try to check if locationId is a google_place_id
        const { data: existingLocation } = await supabase
          .from('locations')
          .select('id')
          .or(`id.eq.${locationId},google_place_id.eq.${locationId}`)
          .maybeSingle();

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

      // Try to resolve internal location id
      let internalLocationId = locationId;
      const { data: existingLocation } = await supabase
        .from('locations')
        .select('id, google_place_id')
        .or(`id.eq.${locationId},google_place_id.eq.${locationId}`)
        .maybeSingle();

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
        // Fallback: try to delete with the id we have
        await supabase
          .from('user_saved_locations')
          .delete()
          .eq('user_id', user.user.id)
          .eq('location_id', locationId);

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
          // Don't fail the like if tracking fails
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
