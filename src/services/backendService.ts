
import { supabase } from '@/integrations/supabase/client';

export interface BackendConfig {
  isDemoMode: boolean;
  enableRealDatabase: boolean;
  enablePushNotifications: boolean;
  enableLocationServices: boolean;
}

class BackendService {
  private config: BackendConfig = {
    isDemoMode: false, // Now enabled for production
    enableRealDatabase: true, // Real database enabled
    enablePushNotifications: true,
    enableLocationServices: true
  };

  getConfig(): BackendConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<BackendConfig>): void {
    this.config = { ...this.config, ...updates };
    console.log('Backend config updated:', this.config);
  }

  // Check if Supabase is properly configured and connected
  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      if (error) {
        console.warn('Supabase connection test failed:', error);
        return false;
      }
      console.log('Supabase connection test successful');
      return true;
    } catch (error) {
      console.warn('Supabase connection test error:', error);
      return false;
    }
  }

  // Get user's saved locations from real database
  async getUserSavedLocations(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_saved_locations')
        .select(`
          *,
          locations (
            id,
            name,
            category,
            address,
            latitude,
            longitude,
            city,
            country,
            image_url,
            description,
            created_by,
            pioneer_user_id,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId)
        .order('saved_at', { ascending: false });

      if (error) throw error;
      
      return data?.map(item => ({
        ...item.locations,
        saved_at: item.saved_at
      })) || [];
    } catch (error) {
      console.error('Error fetching saved locations:', error);
      return [];
    }
  }

  // Search locations from real database
  async searchLocations(query: string, city?: string) {
    try {
      let queryBuilder = supabase
        .from('locations')
        .select('*')
        .or(`name.ilike.%${query}%, description.ilike.%${query}%`);

      if (city) {
        queryBuilder = queryBuilder.eq('city', city);
      }

      const { data, error } = await queryBuilder.limit(20);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching locations:', error);
      return [];
    }
  }

  // Get popular locations based on likes and engagement
  async getPopularLocations(city?: string, limit: number = 10) {
    try {
      let queryBuilder = supabase
        .from('locations')
        .select(`
          *,
          location_likes(count)
        `);

      if (city) {
        queryBuilder = queryBuilder.eq('city', city);
      }

      const { data, error } = await queryBuilder.limit(limit);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching popular locations:', error);
      return [];
    }
  }

  // Get locations from followed users
  async getFollowedUsersLocations(userId: string, city?: string) {
    try {
      // Get users that the current user follows
      const { data: followedUsers, error: followError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);

      if (followError) throw followError;

      if (!followedUsers || followedUsers.length === 0) {
        return [];
      }

      const followedUserIds = followedUsers.map(f => f.following_id);

      // Get locations created by followed users
      let queryBuilder = supabase
        .from('locations')
        .select('*')
        .in('created_by', followedUserIds);

      if (city) {
        queryBuilder = queryBuilder.eq('city', city);
      }

      const { data, error } = await queryBuilder.limit(20);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching followed users locations:', error);
      return [];
    }
  }

  // Save a location for a user
  async saveLocation(userId: string, locationId: string) {
    try {
      const { data, error } = await supabase
        .from('user_saved_locations')
        .insert({
          user_id: userId,
          location_id: locationId
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error saving location:', error);
      return { success: false, error };
    }
  }

  // Unsave a location for a user
  async unsaveLocation(userId: string, locationId: string) {
    try {
      const { error } = await supabase
        .from('user_saved_locations')
        .delete()
        .eq('user_id', userId)
        .eq('location_id', locationId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error unsaving location:', error);
      return { success: false, error };
    }
  }

  // Upload media file
  async uploadMedia(file: File, userId: string, locationId?: string) {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      
      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create media record
      const { data: mediaData, error: mediaError } = await supabase
        .from('media')
        .insert({
          user_id: userId,
          location_id: locationId,
          file_path: uploadData.path,
          file_type: file.type.startsWith('image/') ? 'image' : 'video',
          file_size: file.size
        })
        .select()
        .single();

      if (mediaError) throw mediaError;

      return { success: true, data: mediaData };
    } catch (error) {
      console.error('Error uploading media:', error);
      return { success: false, error };
    }
  }
}

export const backendService = new BackendService();
