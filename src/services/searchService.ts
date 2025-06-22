import { supabase } from '@/integrations/supabase/client';

export interface LocationRecommendation {
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
  image?: string;
  addedBy?: string | { name: string; avatar: string; isFollowing: boolean };
  addedDate?: string;
  isFollowing?: boolean;
  popularity?: number;
  friendsWhoSaved?: { name: string; avatar: string }[] | number;
  recommendationReason?: string;
}

export interface UserRecommendation {
  id: string;
  name: string;
  username: string;
  avatar: string;
  is_following: boolean;
  followers?: number;
  savedPlaces?: number;
  mutualFollowers?: number;
  sharedInterests?: string[];
  recommendationReason?: string;
}

export interface SearchHistoryItem {
  id: string;
  search_query: string;
  search_type: 'locations' | 'users';
  searched_at: string;
}

class SearchService {
  // Get ALL locations that have posts - ENSURE UNIQUE BY GOOGLE_PLACE_ID
  async getLocationRecommendations(userId: string): Promise<LocationRecommendation[]> {
    try {
      console.log('🔍 Fetching ALL locations with posts...');
      
      // Check if user session is valid before making request
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        console.log('❌ No valid session found for location recommendations');
        return [];
      }
      
      // Query locations that have posts using proper join
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
          posts(
            id,
            media_urls,
            created_at
          )
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

      console.log('📍 Raw locations data:', locations);

      // Process and de-duplicate locations
      const uniqueResults = new Map<string, LocationRecommendation>();
      
      locations.forEach(location => {
        // Use google_place_id as key for deduplication, fallback to location id
        const key = location.google_place_id || location.id;
        
        // Count actual posts
        const posts = Array.isArray(location.posts) ? location.posts : [];
        const postCount = posts.length;
        
        // Only include locations that actually have posts
        if (postCount > 0 && !uniqueResults.has(key)) {
          // Get the most recent post image for location card
          const latestPost = posts.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0];
          
          const firstMediaUrl = latestPost?.media_urls?.[0];
          
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
            postCount: postCount,
            image: firstMediaUrl, // Add the first media from latest post
            addedDate: location.created_at
          });
        }
      });

      const results = Array.from(uniqueResults.values());
      console.log('✅ Processed unique locations with posts:', results.length);
      console.log('📊 Sample location data:', results[0]);
      
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
      // Check session before making request
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        console.log('❌ No valid session found for user recommendations');
        return [];
      }

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

  async getSearchHistory(userId: string): Promise<SearchHistoryItem[]> {
    try {
      const { data: history, error } = await supabase
        .from('search_history')
        .select('id, search_query, search_type, searched_at')
        .eq('user_id', userId)
        .order('searched_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return history?.map(item => ({
        id: item.id,
        search_query: item.search_query,
        search_type: item.search_type as 'locations' | 'users',
        searched_at: item.searched_at
      })) || [];
    } catch (error) {
      console.error('Error fetching search history:', error);
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

  async updateUserPreferences(userId: string, category: string): Promise<void> {
    try {
      // Check if preference already exists
      const { data: existing } = await supabase
        .from('user_preferences')
        .select('id, search_count')
        .eq('user_id', userId)
        .eq('category', category)
        .maybeSingle();

      if (existing) {
        // Update existing preference
        await supabase
          .from('user_preferences')
          .update({
            search_count: existing.search_count + 1,
            last_searched: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        // Create new preference
        await supabase
          .from('user_preferences')
          .insert({
            user_id: userId,
            category: category,
            search_count: 1,
            last_searched: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Error updating user preferences:', error);
    }
  }
}

export const searchService = new SearchService();
