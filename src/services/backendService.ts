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
      // Use type assertion for newly created table
      const { data, error } = await (supabase as any)
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
      
      return data?.map((item: any) => ({
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
      // Use type assertion for newly created table
      const { data, error } = await (supabase as any)
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
      // Use type assertion for newly created table
      const { error } = await (supabase as any)
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

      // Create media record using type assertion
      const { data: mediaData, error: mediaError } = await (supabase as any)
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

  // Upload story with media
  async uploadStory(
    file: File,
    caption?: string,
    locationId?: string,
    locationName?: string,
    locationAddress?: string
  ) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (caption) formData.append('caption', caption);
      if (locationId) formData.append('locationId', locationId);
      if (locationName) formData.append('locationName', locationName);
      if (locationAddress) formData.append('locationAddress', locationAddress);

      const { data, error } = await supabase.functions.invoke('upload-story', {
        body: formData,
      });

      if (error) throw error;
      return { success: true, data: data.story };
    } catch (error) {
      console.error('Error uploading story:', error);
      return { success: false, error };
    }
  }

  // Upload post with multiple media files
  async uploadPost(
    files: File[],
    caption?: string,
    locationId?: string
  ) {
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      if (caption) formData.append('caption', caption);
      if (locationId) formData.append('locationId', locationId);

      const { data, error } = await supabase.functions.invoke('upload-post', {
        body: formData,
      });

      if (error) throw error;
      return { success: true, data: data.post };
    } catch (error) {
      console.error('Error uploading post:', error);
      return { success: false, error };
    }
  }

  // Get user's posts
  async getUserPosts(userId: string) {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user posts:', error);
      return [];
    }
  }

  // Get all stories (not expired)
  async getStories() {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching stories:', error);
      return [];
    }
  }

  // Like/Unlike post
  async togglePostLike(postId: string, userId: string) {
    try {
      // Check if already liked
      const { data: existingLike } = await supabase
        .from('post_likes')
        .select('id')
        .eq('user_id', userId)
        .eq('post_id', postId)
        .single();

      if (existingLike) {
        // Unlike
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('user_id', userId)
          .eq('post_id', postId);

        if (error) throw error;
        return { success: true, liked: false };
      } else {
        // Like
        const { error } = await supabase
          .from('post_likes')
          .insert({ user_id: userId, post_id: postId });

        if (error) throw error;
        return { success: true, liked: true };
      }
    } catch (error) {
      console.error('Error toggling post like:', error);
      return { success: false, error };
    }
  }

  // Save/Unsave post
  async togglePostSave(postId: string, userId: string) {
    try {
      // Check if already saved
      const { data: existingSave } = await supabase
        .from('post_saves')
        .select('id')
        .eq('user_id', userId)
        .eq('post_id', postId)
        .single();

      if (existingSave) {
        // Unsave
        const { error } = await supabase
          .from('post_saves')
          .delete()
          .eq('user_id', userId)
          .eq('post_id', postId);

        if (error) throw error;
        return { success: true, saved: false };
      } else {
        // Save
        const { error } = await supabase
          .from('post_saves')
          .insert({ user_id: userId, post_id: postId });

        if (error) throw error;
        return { success: true, saved: true };
      }
    } catch (error) {
      console.error('Error toggling post save:', error);
      return { success: false, error };
    }
  }
}

export const backendService = new BackendService();
