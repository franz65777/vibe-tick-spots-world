
import { supabase } from '@/integrations/supabase/client';

export interface BackendConfig {
  isDemoMode: boolean;
  enableRealDatabase: boolean;
  enablePushNotifications: boolean;
  enableLocationServices: boolean;
}

class BackendService {
  private config: BackendConfig = {
    isDemoMode: true, // Set to false for production
    enableRealDatabase: false, // Set to true when ready for production
    enablePushNotifications: false,
    enableLocationServices: false
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

  // Enable production mode (call this when ready to go live)
  async enableProductionMode(): Promise<boolean> {
    const isConnected = await this.testConnection();
    if (isConnected) {
      this.updateConfig({
        isDemoMode: false,
        enableRealDatabase: true,
        enablePushNotifications: true,
        enableLocationServices: true
      });
      return true;
    }
    return false;
  }

  // Get user's saved locations (demo-safe)
  async getUserSavedLocations(userId: string) {
    if (this.config.isDemoMode) {
      console.log('Demo mode: Using mock saved locations');
      return [];
    }

    try {
      // For now, return from locations table since user_saved_locations doesn't exist yet
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching saved locations:', error);
      return [];
    }
  }

  // Search locations (demo-safe)
  async searchLocations(query: string, city?: string) {
    if (this.config.isDemoMode) {
      console.log('Demo mode: Using mock search results');
      return [];
    }

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
    if (this.config.isDemoMode) {
      console.log('Demo mode: Using mock popular locations');
      return [];
    }

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
    if (this.config.isDemoMode) {
      console.log('Demo mode: Using mock followed users locations');
      return [];
    }

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
}

export const backendService = new BackendService();
