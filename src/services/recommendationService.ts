import { supabase } from '@/integrations/supabase/client';

// Configurable weights for the recommendation algorithm
export const RECOMMENDATION_WEIGHTS = {
  PERSONAL_MATCH: 0.4,
  FRIEND_BOOST: 0.3,
  TREND_BOOST: 0.2,
  RECENCY: 0.1,
};

// Scoring thresholds
export const SCORING_THRESHOLDS = {
  TRENDING_RATIO: 1.2, // Location needs 20% growth to be considered trending
  POPULAR_THRESHOLD: 30, // Combined likes + saves to be "popular"
  CACHE_DURATION_MS: 24 * 60 * 60 * 1000, // 24 hours
};

// Action weights for different interaction types
export const ACTION_WEIGHTS: Record<string, number> = {
  like: 1.0,
  save: 2.0,
  visit: 1.5,
  share: 3.0,
  view: 0.5,
};

interface CategoryWeight {
  category: string;
  weight: number;
}

interface UserProfileVector {
  categoryWeights: Map<string, number>;
  totalInteractions: number;
  lastUpdated: Date;
}

interface FriendInfluence {
  locationId: string;
  friendCount: number;
  friendAvatars: string[];
}

interface LocationScore {
  locationId: string;
  score: number;
  personalMatch: number;
  friendBoost: number;
  trendBoost: number;
  recencyBoost: number;
  badge: 'offer' | 'popular' | 'recommended' | 'trending' | null;
}

// In-memory cache for user profiles
const userProfileCache = new Map<string, { profile: UserProfileVector; timestamp: number }>();

/**
 * Track a user interaction with a location
 */
export async function trackInteraction(
  userId: string,
  locationId: string,
  actionType: 'like' | 'save' | 'visit' | 'share' | 'view'
): Promise<void> {
  const weight = ACTION_WEIGHTS[actionType] || 1.0;

  const { error } = await supabase
    .from('interactions')
    .insert({
      user_id: userId,
      location_id: locationId,
      action_type: actionType,
      weight,
    });

  if (error) {
    console.error('Error tracking interaction:', error);
    throw error;
  }

  // Invalidate cache for this user
  userProfileCache.delete(userId);
}

/**
 * Get user's category preference vector
 */
export async function getUserProfileVector(userId: string): Promise<UserProfileVector> {
  // Check cache first
  const cached = userProfileCache.get(userId);
  if (cached && Date.now() - cached.timestamp < SCORING_THRESHOLDS.CACHE_DURATION_MS) {
    return cached.profile;
  }

  // Fetch from database using the security definer function
  const { data, error } = await supabase.rpc('get_user_category_weights', {
    target_user_id: userId,
  });

  if (error) {
    console.error('Error fetching user profile:', error);
    return {
      categoryWeights: new Map(),
      totalInteractions: 0,
      lastUpdated: new Date(),
    };
  }

  const categoryWeights = new Map<string, number>();
  let totalWeight = 0;

  (data as CategoryWeight[]).forEach((item) => {
    const weight = Number(item.weight);
    categoryWeights.set(item.category, weight);
    totalWeight += weight;
  });

  // Normalize to percentages
  if (totalWeight > 0) {
    categoryWeights.forEach((weight, category) => {
      categoryWeights.set(category, weight / totalWeight);
    });
  }

  const profile: UserProfileVector = {
    categoryWeights,
    totalInteractions: totalWeight,
    lastUpdated: new Date(),
  };

  // Cache the profile
  userProfileCache.set(userId, {
    profile,
    timestamp: Date.now(),
  });

  return profile;
}

/**
 * Get friend influence data for locations
 */
async function getFriendInfluence(userId: string, locationIds: string[]): Promise<Map<string, FriendInfluence>> {
  if (locationIds.length === 0) return new Map();

  // Get user's following list
  const { data: followData } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId);

  const followingIds = followData?.map((f) => f.following_id) || [];

  if (followingIds.length === 0) return new Map();

  // Get friend interactions with these locations (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: friendInteractions } = await supabase
    .from('interactions')
    .select('location_id, user_id, profiles!inner(avatar_url)')
    .in('location_id', locationIds)
    .in('user_id', followingIds)
    .gte('created_at', thirtyDaysAgo.toISOString());

  const influenceMap = new Map<string, FriendInfluence>();

  (friendInteractions || []).forEach((item: any) => {
    const existing = influenceMap.get(item.location_id);
    const avatar = item.profiles?.avatar_url;

    if (existing) {
      existing.friendCount += 1;
      if (avatar && existing.friendAvatars.length < 3 && !existing.friendAvatars.includes(avatar)) {
        existing.friendAvatars.push(avatar);
      }
    } else {
      influenceMap.set(item.location_id, {
        locationId: item.location_id,
        friendCount: 1,
        friendAvatars: avatar ? [avatar] : [],
      });
    }
  });

  return influenceMap;
}

/**
 * Get trending data for locations
 */
async function getTrendingData(): Promise<Map<string, number>> {
  const { data, error } = await supabase.rpc('get_trending_data');

  if (error) {
    console.error('Error fetching trending data:', error);
    return new Map();
  }

  const trendMap = new Map<string, number>();

  (data || []).forEach((item: any) => {
    trendMap.set(item.location_id, Number(item.trend_ratio) || 1.0);
  });

  return trendMap;
}

/**
 * Score a location for a specific user
 */
export async function scoreLocationForUser(
  userId: string,
  locationId: string,
  location: {
    category: string;
    likes_count?: number;
    saves_count?: number;
    created_at?: string;
    updated_at?: string;
  },
  userProfile: UserProfileVector,
  friendInfluence: Map<string, FriendInfluence>,
  trendData: Map<string, number>
): Promise<LocationScore> {
  // 1. Personal match (category preference)
  const categoryPreference = userProfile.categoryWeights.get(location.category) || 0;
  const personalMatch = categoryPreference * 100;

  // 2. Friend boost (log-scaled)
  const friendData = friendInfluence.get(locationId);
  const friendCount = friendData?.friendCount || 0;
  const friendBoost = friendCount > 0 ? Math.log10(friendCount + 1) * 10 : 0;

  // 3. Trend boost
  const trendRatio = trendData.get(locationId) || 1.0;
  const isTrending = trendRatio >= SCORING_THRESHOLDS.TRENDING_RATIO;
  const trendBoost = isTrending ? (trendRatio - 1) * 50 : 0;

  // 4. Recency boost (locations created/updated in last 2 weeks get bonus)
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const updatedDate = location.updated_at ? new Date(location.updated_at) : new Date(location.created_at || 0);
  const isRecent = updatedDate > twoWeeksAgo;
  const daysSinceUpdate = Math.max(0, (Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24));
  const recencyBoost = isRecent ? Math.max(0, 10 - daysSinceUpdate / 2) : 0;

  // Calculate weighted score
  const score =
    personalMatch * RECOMMENDATION_WEIGHTS.PERSONAL_MATCH +
    friendBoost * RECOMMENDATION_WEIGHTS.FRIEND_BOOST +
    trendBoost * RECOMMENDATION_WEIGHTS.TREND_BOOST +
    recencyBoost * RECOMMENDATION_WEIGHTS.RECENCY;

  // Determine badge
  let badge: 'offer' | 'popular' | 'recommended' | 'trending' | null = null;
  if (isTrending) {
    badge = 'trending';
  } else if (isRecent) {
    badge = 'offer';
  } else if (categoryPreference > 0.1 || friendCount > 0) {
    badge = 'recommended';
  }

  return {
    locationId,
    score,
    personalMatch,
    friendBoost,
    trendBoost,
    recencyBoost,
    badge,
  };
}

/**
 * Get recommended locations for a user using precomputed recommendations
 */
export async function getRecommendedLocations(
  userId: string,
  city?: string,
  limit: number = 10,
  categoryFilter?: string | null
): Promise<
  Array<{
    id: string;
    name: string;
    category: string;
    address: string;
    city: string;
    latitude: number;
    longitude: number;
    image_url: string | null;
    description: string | null;
    score: number;
    badge: 'offer' | 'popular' | 'recommended' | 'trending' | null;
    friends_saved: number;
    friend_avatars: string[];
  }>
> {
  // Fetch precomputed recommendations from the user_recommendations table
  let query = supabase
    .from('user_recommendations')
    .select(`
      score,
      friends_saved,
      category,
      locations!inner (
        id,
        name,
        category,
        address,
        city,
        latitude,
        longitude,
        image_url,
        description
      )
    `)
    .eq('user_id', userId)
    .order('score', { ascending: false });

  // Apply category filter if provided
  if (categoryFilter) {
    query = query.eq('category', categoryFilter);
  }

  const { data, error } = await query.limit(limit);

  if (error) {
    console.error('Error fetching recommendations:', error);
    // Fallback to basic recommendations if user_recommendations is empty
    return await getFallbackRecommendations(userId, city, limit, categoryFilter);
  }

  if (!data || data.length === 0) {
    // No precomputed recommendations, use fallback
    return await getFallbackRecommendations(userId, city, limit, categoryFilter);
  }

  // Get friend avatars for locations
  const locationIds = data.map((rec: any) => rec.locations.id);
  const friendInfluence = await getFriendInfluence(userId, locationIds);

  // Transform and enrich the data
  const recommendations = data
    .filter((rec: any) => {
      // Apply city filter if provided
      if (city && !rec.locations.city?.toLowerCase().includes(city.toLowerCase())) {
        return false;
      }
      return true;
    })
    .map((rec: any) => {
      const location = rec.locations;
      const friendData = friendInfluence.get(location.id);

      // Determine badge based on score
      let badge: 'offer' | 'popular' | 'recommended' | 'trending' | null = null;
      if (rec.score > 0.7) {
        badge = 'recommended';
      } else if (rec.friends_saved > 5) {
        badge = 'trending';
      }

      return {
        id: location.id,
        name: location.name,
        category: location.category,
        address: location.address || '',
        city: location.city || '',
        latitude: location.latitude,
        longitude: location.longitude,
        image_url: location.image_url,
        description: location.description,
        score: rec.score,
        badge,
        friends_saved: rec.friends_saved,
        friend_avatars: friendData?.friendAvatars || [],
      };
    });

  return recommendations.slice(0, limit);
}

/**
 * Fallback recommendations when user_recommendations table is empty
 */
async function getFallbackRecommendations(
  userId: string,
  city?: string,
  limit: number = 10,
  categoryFilter?: string | null
): Promise<any[]> {
  // Get popular locations from the current city
  let query = supabase
    .from('locations')
    .select(`
      id,
      name,
      category,
      address,
      city,
      latitude,
      longitude,
      image_url,
      description,
      user_saved_locations(count)
    `)
    .order('created_at', { ascending: false });

  if (city) {
    query = query.ilike('city', `%${city}%`);
  }

  if (categoryFilter) {
    query = query.eq('category', categoryFilter);
  }

  const { data: locations } = await query.limit(limit);

  if (!locations) return [];

  return locations.map((loc: any) => ({
    id: loc.id,
    name: loc.name,
    category: loc.category,
    address: loc.address || '',
    city: loc.city || '',
    latitude: loc.latitude,
    longitude: loc.longitude,
    image_url: loc.image_url,
    description: loc.description,
    score: 0.5,
    badge: 'recommended' as const,
    friends_saved: 0,
    friend_avatars: [],
  }));
}

/**
 * Refresh trending locations cache (call this periodically via cron)
 */
export async function refreshTrendingCache(): Promise<void> {
  const { error } = await supabase.rpc('refresh_trending_locations');

  if (error) {
    console.error('Error refreshing trending cache:', error);
    throw error;
  }
}
