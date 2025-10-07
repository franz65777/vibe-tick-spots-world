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
  async saveLocation(locationId: string, locationData?: any): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) return false;

      // First check if location exists, if not create it (with better duplicate prevention)
      if (locationData) {
        let existingLocationId = locationId;

        // If we have a google_place_id, check for existing location first
        if (locationData.google_place_id) {
          const { data: existingLocation } = await supabase
            .from('locations')
            .select('id')
            .eq('google_place_id', locationData.google_place_id)
            .maybeSingle();

          if (existingLocation) {
            existingLocationId = existingLocation.id;
          } else {
            // Enrich with Google Place Details for accurate categorization
            let enrichedTypes: string[] = Array.isArray(locationData.types) ? locationData.types : [];
            let enrichedName: string = locationData.name;
            let enrichedAddress: string | null = locationData.address;
            let lat = locationData.latitude;
            let lng = locationData.longitude;
            try {
              const { getPlaceDetails } = await import('@/lib/googleMaps');
              const { mapGooglePlaceTypeToCategory } = await import('@/utils/allowedCategories');
              const details = await getPlaceDetails(locationData.google_place_id);
              if (details.types?.length) enrichedTypes = details.types;
              if (!enrichedName && details.name) enrichedName = details.name;
              if (!enrichedAddress && details.formatted_address) enrichedAddress = details.formatted_address;
              if ((!lat || !lng) && details.location) { lat = details.location.lat; lng = details.location.lng; }
              // Derive category from enriched types
              locationData.category = mapGooglePlaceTypeToCategory(enrichedTypes);
            } catch (e) {
              console.warn('Google Place details fetch failed, using provided data.', e);
            }

            // Create new location only if it doesn't exist
            const { data: newLocation, error: locationError } = await supabase
              .from('locations')
              .insert({
                google_place_id: locationData.google_place_id,
                name: enrichedName,
                address: enrichedAddress,
                latitude: lat,
                longitude: lng,
                category: locationData.category || 'restaurant',
                place_types: enrichedTypes || [],
                created_by: user.user.id,
                pioneer_user_id: user.user.id
              })
              .select('id')
              .single();

            if (locationError) {
              console.error('Location creation error:', locationError);
              return false;
            }
            existingLocationId = newLocation.id;
          }
        }

        locationId = existingLocationId;
      }

      // Save location for user (prevent duplicate saves)
      const { error } = await supabase
        .from('user_saved_locations')
        .insert({
          user_id: user.user.id,
          location_id: locationId
        });

      if (error && !error.message.includes('duplicate')) {
        console.error('Save location error:', error);
        return false;
      }

      // Track the save interaction for recommendations
      try {
        await trackInteraction(user.user.id, locationId, 'save');
      } catch (trackError) {
        console.error('Error tracking save interaction:', trackError);
        // Don't fail the save if tracking fails
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

      // Remove from user_saved_locations
      await supabase
        .from('user_saved_locations')
        .delete()
        .eq('user_id', user.user.id)
        .eq('location_id', locationId);

      // Remove from saved_places (for Google Places)
      await supabase
        .from('saved_places')
        .delete()
        .eq('user_id', user.user.id)
        .eq('place_id', locationId);

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
            city: location.address?.split(',')[1]?.trim() || 'Unknown',
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

  // Check if user has saved a location (checks both tables)
  async isLocationSaved(locationId: string): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) return false;

      // Check user_saved_locations table
      const { data: internalSave } = await supabase
        .from('user_saved_locations')
        .select('id')
        .eq('user_id', user.user.id)
        .eq('location_id', locationId)
        .maybeSingle();

      if (internalSave) return true;

      // Check saved_places table (for Google Places)
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
