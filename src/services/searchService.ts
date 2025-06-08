
import { supabase } from '@/integrations/supabase/client';
import { backendService } from './backendService';

export interface SearchHistoryItem {
  id: string;
  search_query: string;
  search_type: 'locations' | 'users';
  searched_at: string;
}

export interface LocationRecommendation {
  id: string;
  name: string;
  category: string;
  likes: number;
  friendsWhoSaved?: { name: string; avatar: string }[];
  visitors: string[];
  isNew: boolean;
  coordinates: { lat: number; lng: number };
  image?: string;
  addedBy?: string;
  addedDate?: string;
  isFollowing?: boolean;
  popularity?: number;
  distance?: number;
  recommendationReason?: string;
}

export interface UserRecommendation {
  id: string;
  name: string;
  username: string;
  avatar: string;
  followers: number;
  following: number;
  savedPlaces: number;
  isFollowing: boolean;
  recommendationReason?: string;
  mutualFollowers?: number;
  sharedInterests?: string[];
}

class SearchService {
  // Get search history for user
  async getSearchHistory(userId: string): Promise<SearchHistoryItem[]> {
    const config = backendService.getConfig();
    
    if (config.isDemoMode) {
      // Demo search history
      return [
        {
          id: '1',
          search_query: 'pizza',
          search_type: 'locations' as const,
          searched_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          search_query: 'coffee',
          search_type: 'locations' as const,
          searched_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '3',
          search_query: 'sarah',
          search_type: 'users' as const,
          searched_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        }
      ];
    }

    try {
      const { data, error } = await supabase
        .from('search_history')
        .select('*')
        .eq('user_id', userId)
        .order('searched_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data || []).map(item => ({
        id: item.id,
        search_query: item.search_query,
        search_type: item.search_type as 'locations' | 'users',
        searched_at: item.searched_at
      }));
    } catch (error) {
      console.error('Error fetching search history:', error);
      return [];
    }
  }

  // Save search to history
  async saveSearchHistory(userId: string, query: string, type: 'locations' | 'users'): Promise<void> {
    const config = backendService.getConfig();
    
    if (config.isDemoMode) {
      console.log('Demo mode: Would save search history:', { userId, query, type });
      return;
    }

    try {
      // Check if this exact search already exists recently
      const { data: existing } = await supabase
        .from('search_history')
        .select('id')
        .eq('user_id', userId)
        .eq('search_query', query)
        .eq('search_type', type)
        .gte('searched_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .single();

      if (!existing) {
        await supabase
          .from('search_history')
          .insert({
            user_id: userId,
            search_query: query,
            search_type: type
          });
      }
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  }

  // Get location recommendations based on user interests
  async getLocationRecommendations(userId: string): Promise<LocationRecommendation[]> {
    const config = backendService.getConfig();
    
    if (config.isDemoMode) {
      // Demo recommendations based on mock user preferences
      return [
        {
          id: 'rec-1',
          name: 'Artisan Coffee House',
          category: 'cafe',
          likes: 184,
          friendsWhoSaved: [
            { name: 'Emma', avatar: 'photo-1438761681033-6461ffad8d80' },
            { name: 'James', avatar: 'photo-1507003211169-0a1dd7228f2d' }
          ],
          visitors: ['user1', 'user2', 'user3', 'user4'],
          isNew: true,
          coordinates: { lat: 37.7849, lng: -122.4194 },
          image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop',
          addedBy: 'user3',
          addedDate: '2024-06-05',
          isFollowing: false,
          popularity: 92,
          distance: 0.5,
          recommendationReason: 'Popular among coffee lovers you follow'
        },
        {
          id: 'rec-2',
          name: 'Gourmet Burger Joint',
          category: 'restaurant',
          likes: 267,
          friendsWhoSaved: [
            { name: 'Alex', avatar: 'photo-1472099645785-5658abf4ff4e' }
          ],
          visitors: ['user5', 'user6', 'user7'],
          isNew: false,
          coordinates: { lat: 37.7749, lng: -122.4094 },
          image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
          addedBy: 'user4',
          addedDate: '2024-05-28',
          isFollowing: true,
          popularity: 88,
          distance: 0.8,
          recommendationReason: 'Trending in your area'
        },
        {
          id: 'rec-3',
          name: 'Rooftop Cocktail Bar',
          category: 'bar',
          likes: 156,
          friendsWhoSaved: [
            { name: 'Sofia', avatar: 'photo-1534528741775-53994a69daeb' },
            { name: 'Mike', avatar: 'photo-1507003211169-0a1dd7228f2d' },
            { name: 'Lisa', avatar: 'photo-1494790108755-2616b5a5c75b' }
          ],
          visitors: ['user8', 'user9'],
          isNew: false,
          coordinates: { lat: 37.7649, lng: -122.4294 },
          image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=300&fit=crop',
          addedBy: 'user5',
          addedDate: '2024-05-20',
          isFollowing: false,
          popularity: 85,
          distance: 1.1,
          recommendationReason: 'Saved by 3 people you follow'
        }
      ];
    }

    try {
      // In production, this would use complex recommendation algorithms
      // For now, get popular locations with some intelligence
      const { data, error } = await supabase
        .from('locations')
        .select(`
          *,
          location_likes(count),
          user_saved_locations!inner(user_id)
        `)
        .limit(10);

      if (error) throw error;
      
      // Transform to match interface
      return (data || []).map(location => ({
        id: location.id,
        name: location.name,
        category: location.category,
        likes: location.location_likes?.[0]?.count || 0,
        visitors: [],
        isNew: new Date(location.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        coordinates: { lat: parseFloat(location.latitude.toString()), lng: parseFloat(location.longitude.toString()) },
        image: location.image_url,
        addedBy: location.created_by,
        addedDate: location.created_at,
        isFollowing: false,
        popularity: 75,
        distance: Math.random() * 2,
        recommendationReason: 'Popular in your area'
      }));
    } catch (error) {
      console.error('Error fetching location recommendations:', error);
      return [];
    }
  }

  // Get user recommendations
  async getUserRecommendations(userId: string): Promise<UserRecommendation[]> {
    const config = backendService.getConfig();
    
    if (config.isDemoMode) {
      return [
        {
          id: 'user-rec-1',
          name: 'Jessica Martinez',
          username: '@jessm',
          avatar: 'photo-1534528741775-53994a69daeb',
          followers: 2340,
          following: 567,
          savedPlaces: 234,
          isFollowing: false,
          recommendationReason: 'Popular food blogger',
          mutualFollowers: 5,
          sharedInterests: ['coffee', 'restaurants', 'photography']
        },
        {
          id: 'user-rec-2',
          name: 'David Park',
          username: '@davidp',
          avatar: 'photo-1472099645785-5658abf4ff4e',
          followers: 1890,
          following: 423,
          savedPlaces: 189,
          isFollowing: false,
          recommendationReason: 'Shares similar taste in cafes',
          mutualFollowers: 3,
          sharedInterests: ['cafe', 'culture', 'travel']
        },
        {
          id: 'user-rec-3',
          name: 'Emma Thompson',
          username: '@emmat',
          avatar: 'photo-1438761681033-6461ffad8d80',
          followers: 3456,
          following: 789,
          savedPlaces: 345,
          isFollowing: false,
          recommendationReason: 'Local influencer in your city',
          mutualFollowers: 8,
          sharedInterests: ['bars', 'nightlife', 'events']
        }
      ];
    }

    try {
      // In production, this would use recommendation algorithms
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', userId)
        .limit(10);

      if (error) throw error;
      
      return (data || []).map(profile => ({
        id: profile.id,
        name: profile.full_name || 'User',
        username: profile.username || '@user',
        avatar: profile.avatar_url || 'photo-1472099645785-5658abf4ff4e',
        followers: profile.follower_count || 0,
        following: profile.following_count || 0,
        savedPlaces: profile.posts_count || 0,
        isFollowing: false,
        recommendationReason: 'Suggested for you',
        mutualFollowers: Math.floor(Math.random() * 10),
        sharedInterests: ['travel', 'food']
      }));
    } catch (error) {
      console.error('Error fetching user recommendations:', error);
      return [];
    }
  }

  // Update user preferences based on search patterns
  async updateUserPreferences(userId: string, category: string): Promise<void> {
    const config = backendService.getConfig();
    
    if (config.isDemoMode) {
      console.log('Demo mode: Would update user preferences:', { userId, category });
      return;
    }

    try {
      // Check if preference exists
      const { data: existing } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .eq('category', category)
        .single();

      if (existing) {
        // Update search count
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
