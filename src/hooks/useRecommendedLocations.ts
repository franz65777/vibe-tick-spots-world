import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Recommendation scoring weights - adjust these to tune the algorithm
const GLOBAL_POPULARITY_WEIGHT = 0.3;
const CATEGORY_MATCH_WEIGHT = 0.5;
const FRIEND_SCORE_WEIGHT = 0.2;
const TREND_BOOST = 1.2;
const RECENCY_WEIGHT = 0.1;
const TREND_THRESHOLD_PERCENT = 20; // % increase to qualify as trending

interface RecommendedLocation {
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
  is_promoted?: boolean;
  discount_text?: string;
}

interface UseRecommendedLocationsProps {
  currentCity?: string;
  userId?: string;
  limit?: number;
}

export const useRecommendedLocations = ({ 
  currentCity, 
  userId, 
  limit = 10
}: UseRecommendedLocationsProps) => {
  const [locations, setLocations] = useState<RecommendedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!userId) {
        setLocations([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // 1. Get user's following list
        const { data: followData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', userId);

        const followingIds = followData?.map(f => f.following_id) || [];
        const allUserIds = [userId, ...followingIds];

        // 2. Get user and friends' saved locations to determine preferred categories
        const { data: savedData } = await supabase
          .from('user_saved_locations')
          .select('location_id, locations!inner(category)')
          .in('user_id', allUserIds);

        // Count category frequencies
        const categoryFrequency: Record<string, number> = {};
        (savedData || []).forEach((item: any) => {
          const category = item.locations?.category;
          if (category) {
            categoryFrequency[category] = (categoryFrequency[category] || 0) + 1;
          }
        });

        const totalCategories = Object.values(categoryFrequency).reduce((a, b) => a + b, 0);
        const categoryPreferences: Record<string, number> = {};
        Object.entries(categoryFrequency).forEach(([cat, count]) => {
          categoryPreferences[cat] = count / (totalCategories || 1);
        });

        // 3. Fetch all locations with their metrics
        let locationsQuery = supabase
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
            location_likes(count),
            user_saved_locations(count)
          `);

        if (currentCity) {
          locationsQuery = locationsQuery.ilike('city', `%${currentCity}%`);
        }

        const { data: locationsData, error: locError } = await locationsQuery;

        if (locError) throw locError;

        // 4. Get friends who saved each location
        const locationIds = locationsData?.map(l => l.id) || [];
        const { data: friendSavesData } = await supabase
          .from('user_saved_locations')
          .select('location_id, user_id, profiles!inner(avatar_url)')
          .in('location_id', locationIds)
          .in('user_id', followingIds);

        const friendSavesMap = new Map<string, { count: number; avatars: string[] }>();
        (friendSavesData || []).forEach((item: any) => {
          const existing = friendSavesMap.get(item.location_id);
          const avatar = item.profiles?.avatar_url;
          if (existing) {
            existing.count += 1;
            if (avatar && existing.avatars.length < 3) {
              existing.avatars.push(avatar);
            }
          } else {
            friendSavesMap.set(item.location_id, {
              count: 1,
              avatars: avatar ? [avatar] : []
            });
          }
        });

        // 5. Check for active business promotions
        const { data: promotionsData } = await supabase
          .from('promoted_posts')
          .select(`
            media_id,
            business_profiles!inner(id, verification_status)
          `)
          .eq('is_active', true)
          .gte('expires_at', new Date().toISOString());

        const promotedBusinessIds = new Set(
          (promotionsData || [])
            .filter((p: any) => p.business_profiles?.verification_status === 'verified')
            .map((p: any) => p.business_profiles.id)
        );

        // 6. Get business locations with offers
        const { data: businessLocationsData } = await supabase
          .from('location_claims')
          .select('location_id, business_id')
          .in('business_id', Array.from(promotedBusinessIds))
          .eq('verification_status', 'verified');

        const locationsWithOffers = new Set(
          (businessLocationsData || []).map(l => l.location_id)
        );

        // 7. Get user's interaction history to determine recency
        const { data: userInteractions } = await supabase
          .from('user_saved_locations')
          .select('location_id')
          .eq('user_id', userId);
        
        const interactedLocationIds = new Set(
          (userInteractions || []).map(i => i.location_id)
        );

        // 8. Calculate trend data (last 7 days vs previous 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        const { data: recentActivity } = await supabase
          .from('user_saved_locations')
          .select('location_id, created_at')
          .in('location_id', locationIds)
          .gte('created_at', fourteenDaysAgo.toISOString());

        const trendMap = new Map<string, { recent: number; previous: number }>();
        (recentActivity || []).forEach((item: any) => {
          const existing = trendMap.get(item.location_id) || { recent: 0, previous: 0 };
          const itemDate = new Date(item.created_at);
          if (itemDate >= sevenDaysAgo) {
            existing.recent += 1;
          } else {
            existing.previous += 1;
          }
          trendMap.set(item.location_id, existing);
        });

        // 9. Calculate scores for each location
        const scoredLocations = (locationsData || []).map((loc: any) => {
          const likesCount = Array.isArray(loc.location_likes) ? loc.location_likes.length : 0;
          const savesCount = Array.isArray(loc.user_saved_locations) ? loc.user_saved_locations.length : 0;
          const globalPopularity = likesCount + savesCount * 2;

          const categoryMatch = categoryPreferences[loc.category] || 0;
          
          const friendSaves = friendSavesMap.get(loc.id);
          const friendScore = friendSaves ? friendSaves.count : 0;

          // Calculate recency boost
          const hasInteracted = interactedLocationIds.has(loc.id);
          const recencyBoost = hasInteracted ? 0 : RECENCY_WEIGHT * 100;

          // Calculate trend boost
          const trendData = trendMap.get(loc.id) || { recent: 0, previous: 0 };
          const trendGrowth = trendData.previous > 0 
            ? ((trendData.recent - trendData.previous) / trendData.previous) * 100 
            : 0;
          const isTrending = trendGrowth > TREND_THRESHOLD_PERCENT;

          // Base score calculation
          let score = 
            (globalPopularity * GLOBAL_POPULARITY_WEIGHT) + 
            (categoryMatch * 100 * CATEGORY_MATCH_WEIGHT) + 
            (friendScore * FRIEND_SCORE_WEIGHT) +
            recencyBoost;

          // Apply trend boost
          if (isTrending) {
            score *= TREND_BOOST;
          }

          // Badge assignment with priority
          let badge: 'offer' | 'popular' | 'recommended' | 'trending' | null = null;
          if (locationsWithOffers.has(loc.id)) {
            badge = 'offer';
          } else if (isTrending) {
            badge = 'trending';
          } else if (globalPopularity > 30) {
            badge = 'popular';
          } else if (categoryMatch > 0.1 || friendScore > 0) {
            badge = 'recommended';
          }

          return {
            id: loc.id,
            name: loc.name,
            category: loc.category,
            address: loc.address || '',
            city: loc.city || '',
            latitude: loc.latitude,
            longitude: loc.longitude,
            image_url: loc.image_url,
            description: loc.description,
            score,
            badge,
            friends_saved: friendScore,
            friend_avatars: friendSaves?.avatars || [],
            is_promoted: locationsWithOffers.has(loc.id)
          };
        });

        // Sort by score and take top N
        const topLocations = scoredLocations
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);

        setLocations(topLocations);
      } catch (err: any) {
        console.error('Error fetching recommendations:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [currentCity, userId, limit]);

  return { locations, loading, error };
};
