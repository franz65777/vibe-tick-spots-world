import { supabase } from '@/integrations/supabase/client';
import { imageService } from './imageService';

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
  // Get ALL locations that have posts - FIXED DEDUPLICATION BY GOOGLE_PLACE_ID AND NAME
  async getLocationRecommendations(userId: string): Promise<LocationRecommendation[]> {
    try {
      console.log('🔍 Fetching ALL unique locations with posts - PROPER DEDUPLICATION...');
      
      // Check if user session is valid before making request
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        console.log('❌ No valid session found for location recommendations');
        return [];
      }
      
      // Query to get locations with posts and proper deduplication
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
          posts!inner(
            id,
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

      console.log('📍 Raw locations data before deduplication:', locations.length);

      // ENHANCED DEDUPLICATION: Proper grouping by google_place_id AND name matching
      const locationGroups = new Map<string, any[]>();
      
      // First pass: Group by google_place_id if it exists
      for (const location of locations) {
        if (location.google_place_id) {
          const key = `place_${location.google_place_id}`;
          if (!locationGroups.has(key)) {
            locationGroups.set(key, []);
          }
          locationGroups.get(key)!.push(location);
        }
      }
      
      // Second pass: Group remaining locations by normalized name
      const ungroupedLocations = locations.filter(loc => !loc.google_place_id);
      const nameGroups = new Map<string, any[]>();
      
      for (const location of ungroupedLocations) {
        const normalizedName = location.name.toLowerCase().trim().replace(/[^\w\s]/g, '');
        let foundGroup = false;
        
        // Check if this name matches any existing group (fuzzy matching)
        for (const [existingName, group] of nameGroups) {
          if (this.isSimilarLocation(normalizedName, existingName, location.address, group[0].address)) {
            group.push(location);
            foundGroup = true;
            break;
          }
        }
        
        if (!foundGroup) {
          nameGroups.set(normalizedName, [location]);
        }
      }
      
      // Merge name groups into main locationGroups
      let nameGroupIndex = 0;
      for (const [name, group] of nameGroups) {
        locationGroups.set(`name_${nameGroupIndex}_${name}`, group);
        nameGroupIndex++;
      }
      
      console.log(`📍 After deduplication: ${locationGroups.size} unique location groups from ${locations.length} raw locations`);
      
      const uniqueResults = new Map<string, LocationRecommendation>();
      
      for (const [groupKey, locationGroup] of locationGroups) {
        // Use the location with most posts as the representative
        const sortedByPosts = locationGroup.sort((a, b) => {
          const aPosts = Array.isArray(a.posts) ? a.posts.length : 0;
          const bPosts = Array.isArray(b.posts) ? b.posts.length : 0;
          return bPosts - aPosts;
        });
        
        const primaryLocation = sortedByPosts[0];
        
        // Count total posts across all locations in this group
        let totalPosts = 0;
        for (const location of locationGroup) {
          const posts = Array.isArray(location.posts) ? location.posts : [];
          totalPosts += posts.length;
        }
        
        console.log(`🔍 Processing group: ${primaryLocation.name}, Locations in group: ${locationGroup.length}, Total posts: ${totalPosts}`);
        
        if (totalPosts > 0) {
          console.log(`🎨 Generating AI image for location: ${primaryLocation.name} (${primaryLocation.category})`);
          
          const aiLocationImage = await imageService.getPlaceImage(
            primaryLocation.name,
            primaryLocation.city || primaryLocation.address?.split(',')[1]?.trim() || 'Unknown',
            primaryLocation.category
          );
          
          const uniqueKey = primaryLocation.google_place_id || `${primaryLocation.name}_${primaryLocation.id}`;
          
          uniqueResults.set(uniqueKey, {
            id: primaryLocation.id,
            name: primaryLocation.name,
            category: primaryLocation.category,
            address: primaryLocation.address,
            city: primaryLocation.city || primaryLocation.address?.split(',')[1]?.trim() || 'Unknown',
            coordinates: { 
              lat: parseFloat(primaryLocation.latitude?.toString() || '0'), 
              lng: parseFloat(primaryLocation.longitude?.toString() || '0') 
            },
            likes: 0,
            totalSaves: 0,
            visitors: [],
            isNew: this.isLocationNew(primaryLocation.created_at),
            distance: Math.random() * 5,
            google_place_id: primaryLocation.google_place_id,
            postCount: totalPosts,
            image: aiLocationImage,
            addedDate: primaryLocation.created_at
          });
          
          console.log(`✅ Created UNIQUE card for: ${primaryLocation.name} with ${totalPosts} posts (${locationGroup.length} duplicate locations merged)`);
        }
      }

      const results = Array.from(uniqueResults.values());
      console.log(`✅ FINAL RESULT: ${results.length} UNIQUE location cards (NO DUPLICATES)`);
      console.log('📊 Each card represents a unique location with aggregated post counts');
      
      return results;
    } catch (error) {
      console.error('❌ Error in getLocationRecommendations:', error);
      return [];
    }
  }

  // Helper method to check if two locations are similar
  private isSimilarLocation(name1: string, name2: string, address1?: string, address2?: string): boolean {
    // Exact name match
    if (name1 === name2) return true;
    
    // Check if names are very similar (accounting for common variations)
    const similarity = this.calculateStringSimilarity(name1, name2);
    if (similarity > 0.8) return true;
    
    // If addresses are available, check if they're similar too
    if (address1 && address2) {
      const addr1 = address1.toLowerCase().trim();
      const addr2 = address2.toLowerCase().trim();
      if (addr1 === addr2) return true;
      
      // Check if they share the same street address
      const streetAddr1 = addr1.split(',')[0];
      const streetAddr2 = addr2.split(',')[0];
      if (streetAddr1 === streetAddr2) return true;
    }
    
    return false;
  }

  // Simple string similarity calculation
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  // Levenshtein distance calculation
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
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

      // Get users that current user is NOT following - fix the query
      const { data: users, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, posts_count')
        .neq('id', userId)
        .not('posts_count', 'is', null)
        .gt('posts_count', 0)
        .limit(20);

      if (error) {
        console.error('Error fetching users:', error);
        return [];
      }

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
