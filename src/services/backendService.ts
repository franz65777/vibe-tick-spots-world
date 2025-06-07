
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
      const { data, error } = await supabase
        .from('user_saved_locations')
        .select(`
          location_id,
          saved_at,
          locations (*)
        `)
        .eq('user_id', userId);

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
}

export const backendService = new BackendService();
