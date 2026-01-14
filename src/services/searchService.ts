import { supabase } from '@/integrations/supabase/client';
import { imageService } from './imageService';
import { normalizeCity } from '@/utils/cityNormalization';

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
  // Get ALL locations that have posts - IMPROVED DEDUPLICATION LOGIC
  async getLocationRecommendations(userId: string): Promise<LocationRecommendation[]> {
    try {
      console.log('🔍 Fetching ALL unique locations with posts - ADVANCED DEDUPLICATION...');
      
      // Check if user session is valid before making request
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        console.log('❌ No valid session found for location recommendations');
        return [];
      }
      
      // Fetch user's saved locations to exclude them from recommendations
      const [locationsResult, savedPlacesResult, savedLocationsResult] = await Promise.all([
        // Query to get locations with posts
        supabase
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
          .not('posts', 'is', null),
        // Get saved places (external/google places)
        supabase
          .from('saved_places')
          .select('place_id')
          .eq('user_id', userId),
        // Get user saved locations (internal)
        supabase
          .from('user_saved_locations')
          .select('location_id')
          .eq('user_id', userId)
      ]);

      const { data: locations, error } = locationsResult;

      if (error) {
        console.error('❌ Error fetching locations:', error);
        throw error;
      }

      if (!locations || locations.length === 0) {
        console.log('📍 No locations with posts found');
        return [];
      }

      // Build a set of saved location IDs to exclude
      const savedLocationIds = new Set<string>();
      
      // Add internal saved location IDs
      savedLocationsResult.data?.forEach(item => {
        if (item.location_id) savedLocationIds.add(item.location_id);
      });
      
      // Add saved places IDs (these might be google_place_ids or location ids)
      savedPlacesResult.data?.forEach(item => {
        if (item.place_id) savedLocationIds.add(item.place_id);
      });

      console.log(`📍 User has ${savedLocationIds.size} saved locations to exclude`);

      // Filter out already saved locations
      const unsavedLocations = locations.filter(location => {
        // Check if location ID is saved
        if (savedLocationIds.has(location.id)) return false;
        // Check if google_place_id is saved
        if (location.google_place_id && savedLocationIds.has(location.google_place_id)) return false;
        return true;
      });

      console.log(`📍 After excluding saved: ${unsavedLocations.length} locations (from ${locations.length})`);

      if (unsavedLocations.length === 0) {
        console.log('📍 All locations with posts are already saved by user');
        return [];
      }

      console.log('📍 Raw locations data before deduplication:', unsavedLocations.length);

      // ADVANCED DEDUPLICATION STRATEGY
      const uniqueLocationGroups = new Map<string, any[]>();
      
      // Step 1: Group by google_place_id (most reliable identifier)
      for (const location of unsavedLocations) {
        if (location.google_place_id) {
          const key = `google_${location.google_place_id}`;
          if (!uniqueLocationGroups.has(key)) {
            uniqueLocationGroups.set(key, []);
          }
          uniqueLocationGroups.get(key)!.push(location);
        }
      }
      
      // Step 2: Group remaining locations by normalized name + address combination
      const ungroupedLocations = unsavedLocations.filter(loc => !loc.google_place_id);
      
      for (const location of ungroupedLocations) {
        // Create a normalized key combining name and address
        const normalizedName = this.normalizeLocationName(location.name);
        const normalizedAddress = location.address ? this.normalizeAddress(location.address) : '';
        const combinedKey = `${normalizedName}_${normalizedAddress}`;
        
        // Check if this location is similar to any existing group
        let foundGroup = false;
        for (const [existingKey, group] of uniqueLocationGroups) {
          if (existingKey.startsWith('google_')) continue; // Skip Google Place ID groups
          
          const existingLocation = group[0];
          if (this.areLocationsSimilar(location, existingLocation)) {
            group.push(location);
            foundGroup = true;
            break;
          }
        }
        
        if (!foundGroup) {
          const key = `name_${combinedKey}`;
          uniqueLocationGroups.set(key, [location]);
        }
      }
      
      console.log(`📍 After advanced deduplication: ${uniqueLocationGroups.size} unique location groups from ${unsavedLocations.length} raw locations`);
      
      const uniqueResults = new Map<string, LocationRecommendation>();
      
      for (const [groupKey, locationGroup] of uniqueLocationGroups) {
        // Select the location with the most posts as the representative
        const sortedByPosts = locationGroup.sort((a, b) => {
          const aPosts = Array.isArray(a.posts) ? a.posts.length : 0;
          const bPosts = Array.isArray(b.posts) ? b.posts.length : 0;
          return bPosts - aPosts;
        });
        
        const representativeLocation = sortedByPosts[0];
        
        // Aggregate post counts from all locations in the group
        let totalPosts = 0;
        for (const location of locationGroup) {
          const posts = Array.isArray(location.posts) ? location.posts : [];
          totalPosts += posts.length;
        }
        
        console.log(`🔍 Processing group: "${representativeLocation.name}" (${locationGroup.length} duplicates merged, ${totalPosts} total posts)`);
        
        if (totalPosts > 0) {
          console.log(`🎨 Generating AI image for location: ${representativeLocation.name} (${representativeLocation.category})`);
          
          const baseCity = normalizeCity(representativeLocation.city);
          const fallbackCity = normalizeCity(representativeLocation.address?.split(',')[1]?.trim() || null);
          const displayCity = baseCity !== 'Unknown' ? baseCity : fallbackCity;
          
          const aiLocationImage = await imageService.getPlaceImage(
            representativeLocation.name,
            displayCity !== 'Unknown' ? displayCity : 'Unknown',
            representativeLocation.category
          );
          
          // Use a unique key based on the best available identifier
          const uniqueKey = representativeLocation.google_place_id || 
                           `${representativeLocation.name}_${representativeLocation.id}`;
          
          uniqueResults.set(uniqueKey, {
            id: representativeLocation.id,
            name: representativeLocation.name,
            category: representativeLocation.category,
            address: representativeLocation.address,
            city: (displayCity !== 'Unknown' ? displayCity : undefined) || undefined,
            coordinates: { 
              lat: parseFloat(representativeLocation.latitude?.toString() || '0'), 
              lng: parseFloat(representativeLocation.longitude?.toString() || '0') 
            },
            likes: 0,
            totalSaves: 0,
            visitors: [],
            isNew: this.isLocationNew(representativeLocation.created_at),
            distance: Math.random() * 5,
            google_place_id: representativeLocation.google_place_id,
            postCount: totalPosts,
            image: aiLocationImage,
            addedDate: representativeLocation.created_at
          });
          
          console.log(`✅ Created UNIQUE card for: "${representativeLocation.name}" with ${totalPosts} posts (merged ${locationGroup.length} duplicate entries)`);
        }
      }

      const results = Array.from(uniqueResults.values());
      console.log(`✅ FINAL RESULT: ${results.length} COMPLETELY UNIQUE location cards`);
      console.log('📊 Each card represents a unique location with aggregated data from all duplicates');
      
      return results;
    } catch (error) {
      console.error('❌ Error in getLocationRecommendations:', error);
      return [];
    }
  }

  // Enhanced location similarity check
  private areLocationsSimilar(loc1: any, loc2: any): boolean {
    // Normalize names for comparison
    const name1 = this.normalizeLocationName(loc1.name);
    const name2 = this.normalizeLocationName(loc2.name);
    
    // Exact name match
    if (name1 === name2) return true;
    
    // High similarity in names
    const nameSimilarity = this.calculateStringSimilarity(name1, name2);
    if (nameSimilarity > 0.85) return true;
    
    // Check address similarity if both have addresses
    if (loc1.address && loc2.address) {
      const addr1 = this.normalizeAddress(loc1.address);
      const addr2 = this.normalizeAddress(loc2.address);
      
      if (addr1 === addr2) return true;
      
      // Check if they share the same street address
      const street1 = addr1.split(',')[0];
      const street2 = addr2.split(',')[0];
      if (street1 === street2 && street1.length > 10) return true;
    }
    
    // Check coordinate proximity (within ~100 meters)
    if (loc1.latitude && loc1.longitude && loc2.latitude && loc2.longitude) {
      const distance = this.calculateDistance(
        parseFloat(loc1.latitude), parseFloat(loc1.longitude),
        parseFloat(loc2.latitude), parseFloat(loc2.longitude)
      );
      if (distance < 0.1) return true; // Less than 100 meters
    }
    
    return false;
  }

  // Normalize location name for better matching
  private normalizeLocationName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\b(the|a|an|and|&|of|at|in|on)\b/g, '') // Remove common words
      .trim();
  }

  // Normalize address for better matching
  private normalizeAddress(address: string): string {
    return address
      .toLowerCase()
      .trim()
      .replace(/\b(street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd)\b/g, '')
      .replace(/[^\w\s,]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Calculate distance between two coordinates in kilometers
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  // Simple string similarity calculation using Levenshtein distance
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
