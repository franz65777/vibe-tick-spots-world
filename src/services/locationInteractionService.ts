
import { supabase } from '@/integrations/supabase/client';

export interface LocationInteraction {
  id: string;
  user_id: string;
  location_id: string;
  interaction_type: 'like' | 'save' | 'visit';
  created_at: string;
}

class LocationInteractionService {
  // Save a location for the user
  async saveLocation(locationId: string, locationData?: any): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) return false;

      // First check if location exists, if not create it
      if (locationData) {
        const { error: locationError } = await supabase
          .from('locations')
          .upsert({
            id: locationId,
            google_place_id: locationData.google_place_id,
            name: locationData.name,
            address: locationData.address,
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            category: locationData.category || 'establishment',
            place_types: locationData.types || [],
            created_by: user.user.id,
            pioneer_user_id: user.user.id
          }, { onConflict: 'google_place_id' });

        if (locationError) console.error('Location upsert error:', locationError);
      }

      // Save location for user
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

      return true;
    } catch (error) {
      console.error('Save location error:', error);
      return false;
    }
  }

  // Unsave a location for the user
  async unsaveLocation(locationId: string): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) return false;

      const { error } = await supabase
        .from('user_saved_locations')
        .delete()
        .eq('user_id', user.user.id)
        .eq('location_id', locationId);

      if (error) {
        console.error('Unsave location error:', error);
        return false;
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

  // Get locations for following feed (locations from followed users)
  async getFollowingLocations(userId: string): Promise<any[]> {
    try {
      // Get users that the current user follows
      const { data: followedUsers, error: followError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);

      if (followError || !followedUsers || followedUsers.length === 0) {
        return [];
      }

      const followedUserIds = followedUsers.map(f => f.following_id);

      // Get posts from followed users with location data
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
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
        .in('user_id', followedUserIds)
        .not('location_id', 'is', null)
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('Following locations error:', postsError);
        return [];
      }

      // Get user profiles separately to avoid join issues
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

      // Transform posts into location format
      const locationMap = new Map();
      
      posts?.forEach(post => {
        const location = post.locations;
        const locationKey = location.google_place_id || location.id;
        const userProfile = profileMap.get(post.user_id);
        
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
            addedDate: new Date(post.created_at).toLocaleDateString(),
            popularity: 75,
            city: location.address?.split(',')[1]?.trim() || 'Unknown',
            isNew: false,
            image: post.media_urls?.[0],
            friendsWhoSaved: [],
            visitors: [],
            distance: Math.random() * 10,
            totalSaves: 0,
            address: location.address || '',
            google_place_id: location.google_place_id
          });
        }
      });

      return Array.from(locationMap.values());
    } catch (error) {
      console.error('Get following locations error:', error);
      return [];
    }
  }

  // Check if user has saved a location
  async isLocationSaved(locationId: string): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) return false;

      const { data } = await supabase
        .from('user_saved_locations')
        .select('id')
        .eq('user_id', user.user.id)
        .eq('location_id', locationId)
        .maybeSingle();

      return !!data;
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
