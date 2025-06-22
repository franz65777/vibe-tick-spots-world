
import { supabase } from '@/integrations/supabase/client';

interface LocationRecommendation {
  id: string;
  name: string;
  category: string;
  address?: string;
  city?: string;
  coordinates: { lat: number; lng: number };
  likes: number;
  totalSaves: number;
  visitors: string[];
  isNew: boolean;
  distance?: number;
  google_place_id?: string;
  postCount: number;
}

interface UserRecommendation {
  id: string;
  name: string;
  username: string;
  avatar: string;
  is_following: boolean;
}

class SearchService {
  // Get ALL locations that have posts - ENSURE UNIQUE BY GOOGLE_PLACE_ID
  async getLocationRecommendations(userId: string): Promise<LocationRecommendation[]> {
    try {
      console.log('🔍 Fetching ALL locations with posts...');
      
      // Query locations that have posts using inner join to ensure they have content
      const { data: locations, error } = await supabase
        .from('locations')
        .select(`
          id,
          name,
          category,
          address,
          city,
          latitude,
          longitude,
          google_place_id,
          created_at,
          posts!inner(id)
        `)
        .not('posts', 'is', null);

      if (error) {
        console.error('❌ Error fetching locations:', error);
        throw error;
      }

      if (!locations || locations.length === 0) {
        console.log('📍 No locations with posts found');
        return [];
      }

      // De-duplicate by google_place_id and ensure unique results
      const uniqueResults = new Map<string, LocationRecommendation>();
      
      locations.forEach(location => {
        const key = location.google_place_id || location.id;
        
        if (!uniqueResults.has(key)) {
          const postCount = Array.isArray(location.posts) ? location.posts.length : 0;
          
          // Only include locations that actually have posts
          if (postCount > 0) {
            uniqueResults.set(key, {
              id: location.id,
              name: location.name,
              category: location.category,
              address: location.address,
              city: location.city || location.address?.split(',')[1]?.trim() || 'Unknown',
              coordinates: { 
                lat: parseFloat(location.latitude?.toString() || '0'), 
                lng: parseFloat(location.longitude?.toString() || '0') 
              },
              likes: 0,
              totalSaves: 0,
              visitors: [],
              isNew: this.isLocationNew(location.created_at),
              distance: Math.random() * 5, // Mock distance for now
              google_place_id: location.google_place_id,
              postCount: postCount
            });
          }
        }
      });

      const results = Array.from(uniqueResults.values());
      console.log('✅ Unique locations with posts found:', results.length);
      return results;
    } catch (error) {
      console.error('❌ Error in getLocationRecommendations:', error);
      return [];
    }
  }

  // Check if location was recently created (within 7 days)
  private isLocationNew(createdAt: string): boolean {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return new Date(createdAt) > sevenDaysAgo;
  }

  async getUserRecommendations(userId: string): Promise<UserRecommendation[]> {
    try {
      // Get users that current user is NOT following
      const { data: users, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          full_name,
          avatar_url,
          posts!inner(id)
        `)
        .neq('id', userId)
        .limit(20);

      if (error) throw error;

      // Get current user's following list
      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);

      const followingIds = new Set(following?.map(f => f.following_id) || []);

      return users?.map(user => ({
        id: user.id,
        name: user.full_name || user.username || 'User',
        username: user.username || `@${user.id.substring(0, 8)}`,
        avatar: user.avatar_url || 'photo-1472099645785-5658abf4ff4e',
        is_following: followingIds.has(user.id)
      })) || [];
    } catch (error) {
      console.error('Error fetching user recommendations:', error);
      return [];
    }
  }

  async saveSearchHistory(userId: string, query: string, searchType: 'locations' | 'users'): Promise<void> {
    try {
      await supabase
        .from('search_history')
        .insert({
          user_id: userId,
          search_query: query,
          search_type: searchType
        });
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  }
}

export const searchService = new SearchService();
