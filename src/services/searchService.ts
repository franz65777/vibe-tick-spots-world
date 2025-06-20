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
  address?: string;
  city?: string;
  google_place_id?: string;
  postCount?: number;
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

  // Get location recommendations based on user interests - FETCH ALL LOCATIONS WITH POSTS
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
        }
      ];
    }

    try {
      console.log('🔍 Fetching all locations with posts for recommendations...');
      
      // Query locations that have at least one post - NO LIMIT, fetch ALL
      const { data: locationsWithPosts, error } = await supabase
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
          created_by,
          posts!inner(id)
        `)
        .not('posts', 'is', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching locations with posts:', error);
        throw error;
      }

      console.log('✅ Found locations with posts:', locationsWithPosts?.length || 0);

      if (!locationsWithPosts || locationsWithPosts.length === 0) {
        return [];
      }

      // Transform to match interface and ensure uniqueness by google_place_id
      const uniqueLocations = new Map();
      
      locationsWithPosts.forEach(location => {
        // Only include locations that have a google_place_id and aren't already in the map
        if (location.google_place_id && !uniqueLocations.has(location.google_place_id)) {
          const postCount = Array.isArray(location.posts) ? location.posts.length : 0;
          
          // Only include locations that actually have posts
          if (postCount > 0) {
            uniqueLocations.set(location.google_place_id, {
              id: location.id,
              name: location.name,
              category: location.category,
              address: location.address,
              city: location.city || location.address?.split(',')[1]?.trim() || 'Unknown',
              likes: 0, // Will be calculated separately if needed
              visitors: [],
              isNew: new Date(location.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              coordinates: { 
                lat: parseFloat(location.latitude?.toString() || '0'), 
                lng: parseFloat(location.longitude?.toString() || '0') 
              },
              addedBy: location.created_by,
              addedDate: location.created_at,
              isFollowing: false,
              popularity: Math.min(75 + postCount * 5, 100), // Popularity based on post count
              distance: Math.random() * 5, // Mock distance for now
              recommendationReason: postCount === 1 ? 'New spot with content' : `${postCount} posts`,
              google_place_id: location.google_place_id,
              postCount: postCount
            });
          }
        }
      });

      const recommendations = Array.from(uniqueLocations.values());
      console.log('✅ Processed unique location recommendations:', recommendations.length);
      
      return recommendations;
    } catch (error) {
      console.error('❌ Error fetching location recommendations:', error);
      return [];
    }
  }

  // Get user recommendations from real database
  async getUserRecommendations(userId: string): Promise<UserRecommendation[]> {
    const config = backendService.getConfig();
    
    if (config.isDemoMode) {
      // Demo user recommendations
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
        }
      ];
    }

    try {
      // Get users that the current user is NOT following
      const { data: notFollowingUsers, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', userId)
        .limit(20);

      if (error) throw error;

      // Check follow status for each user
      const usersWithFollowStatus = await Promise.all(
        (notFollowingUsers || []).map(async (profile) => {
          // Check if already following
          const { data: followData } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', userId)
            .eq('following_id', profile.id)
            .single();

          const isFollowing = !!followData;

          // Skip if already following
          if (isFollowing) return null;

          return {
            id: profile.id,
            name: profile.full_name || profile.username || 'User',
            username: profile.username || `@user${profile.id.substring(0, 6)}`,
            avatar: profile.avatar_url || 'photo-1472099645785-5658abf4ff4e',
            followers: profile.follower_count || 0, // Use follower_count from database
            following: profile.following_count || 0,
            savedPlaces: profile.posts_count || 0,
            isFollowing: false,
            recommendationReason: 'Suggested for you',
            mutualFollowers: Math.floor(Math.random() * 5),
            sharedInterests: ['travel', 'food']
          };
        })
      );

      return usersWithFollowStatus.filter(Boolean) as UserRecommendation[];
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
