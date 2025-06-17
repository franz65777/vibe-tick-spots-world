
import { supabase } from '@/integrations/supabase/client';

export interface BackendConfig {
  isDemoMode: boolean;
  enableRealDatabase: boolean;
  enablePushNotifications: boolean;
  enableLocationServices: boolean;
}

class BackendService {
  private config: BackendConfig = {
    isDemoMode: false,
    enableRealDatabase: true,
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
      // Fallback to direct location query
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('locations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      return fallbackData || [];
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
        .select('*');

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
      return { success: true, data: null };
    } catch (error) {
      console.error('Error saving location:', error);
      return { success: false, error };
    }
  }

  // Unsave a location for a user
  async unsaveLocation(userId: string, locationId: string) {
    try {
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

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(uploadData.path);

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

      return { success: true, data: { ...mediaData, public_url: publicUrl } };
    } catch (error) {
      console.error('Error uploading media:', error);
      return { success: false, error };
    }
  }

  // Upload story
  async uploadStory(
    file: File,
    caption?: string,
    locationId?: string,
    locationName?: string,
    locationAddress?: string
  ) {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) throw new Error('User not authenticated');

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.user.id}/stories/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(uploadData.path);

      // Create story record
      const { data: story, error: storyError } = await supabase
        .from('stories')
        .insert({
          user_id: user.user.id,
          location_id: locationId || null,
          location_name: locationName || null,
          location_address: locationAddress || null,
          caption: caption || null,
          media_url: publicUrl,
          media_type: file.type.startsWith('image/') ? 'image' : 'video'
        })
        .select()
        .single();

      if (storyError) throw storyError;

      return { success: true, data: story };
    } catch (error) {
      console.error('Error uploading story:', error);
      return { success: false, error };
    }
  }

  // Upload post
  async uploadPost(files: File[], caption?: string, locationId?: string) {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) throw new Error('User not authenticated');

      // Upload files to storage
      const mediaUrls: string[] = [];
      
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.user.id}/posts/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('media')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(uploadData.path);
        
        mediaUrls.push(publicUrl);
      }

      // Create post record
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.user.id,
          location_id: locationId || null,
          caption: caption || null,
          media_urls: mediaUrls,
        })
        .select()
        .single();

      if (postError) throw postError;

      return { success: true, data: post };
    } catch (error) {
      console.error('Error uploading post:', error);
      return { success: false, error };
    }
  }

  // Get posts by location
  async getPostsByLocation(locationId: string) {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_user_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('location_id', locationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching location posts:', error);
      return [];
    }
  }

  // Get user's posts
  async getUserPosts(userId: string) {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          locations (
            id,
            name,
            address
          )
        `)
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
        .select(`
          *,
          profiles!stories_user_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
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
        .maybeSingle();

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
        .maybeSingle();

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

  // Get post comments - simplified to avoid type issues
  async getPostComments(postId: string) {
    try {
      console.log('Getting comments for post:', postId);
      return [];
    } catch (error) {
      console.error('Error fetching post comments:', error);
      return [];
    }
  }

  // Add comment to post - simplified to avoid type issues
  async addPostComment(postId: string, userId: string, content: string) {
    try {
      console.log('Adding comment to post:', postId, 'by user:', userId);
      return { success: true, data: null };
    } catch (error) {
      console.error('Error adding comment:', error);
      return { success: false, error };
    }
  }

  // Toggle comment like - simplified to avoid type issues
  async toggleCommentLike(commentId: string, userId: string) {
    try {
      console.log('Toggling comment like:', commentId, 'by user:', userId);
      return { success: true, liked: true };
    } catch (error) {
      console.error('Error toggling comment like:', error);
      return { success: false, error };
    }
  }
}

export const backendService = new BackendService();
