import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef } from 'react';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'explorer' | 'social' | 'foodie' | 'engagement' | 'streak' | 'milestone' | 'planner';
  level: 'bronze' | 'silver' | 'gold' | 'platinum';
  gradient: string;
  earned: boolean;
  progress?: number;
  maxProgress?: number;
  earnedDate?: string;
  nextBadgeId?: string;
  currentLevel?: number;
  levels?: {
    level: number;
    name: string;
    requirement: number;
    earned: boolean;
    earnedDate?: string;
  }[];
}

interface UserStats {
  postsCount: number;
  followersCount: number;
  followingCount: number;
  citiesCount: number;
  savedPlacesCount: number;
  likesReceived: number;
  tripsCount: number;
  reviewsCount: number;
}

/**
 * Optimized user badges hook using React Query for caching
 * 
 * PERFORMANCE: Uses parallel queries and React Query caching
 * - Reduces redundant fetches across mounts
 * - 5 minute stale time since badges don't change frequently
 * - Parallel stats fetching
 */
export const useUserBadges = (userId?: string) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const targetUserId = userId || user?.id;
  const previousEarnedBadges = useRef<Set<string>>(new Set());

  // Hydrate previously notified badges on mount
  useEffect(() => {
    if (!targetUserId) return;
    try {
      const raw = localStorage.getItem(`badge_notified_${targetUserId}`);
      previousEarnedBadges.current = new Set(raw ? JSON.parse(raw) : []);
    } catch {}
  }, [targetUserId]);

  const { data: badgeData, isLoading, refetch } = useQuery({
    queryKey: ['user-badges', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return { badges: [], userStats: getEmptyStats() };

      // PARALLEL: All stats queries together
      const [profileRes, savedLocationsRes, postsRes, reviewsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('posts_count, follower_count, following_count, cities_visited, places_visited')
          .eq('id', targetUserId)
          .maybeSingle(),
        supabase
          .from('user_saved_locations')
          .select('id, location_id, locations!inner(city)')
          .eq('user_id', targetUserId),
        supabase
          .from('posts')
          .select('id, likes_count')
          .eq('user_id', targetUserId),
        supabase
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', targetUserId)
          .not('rating', 'is', null),
      ]);

      const profile = profileRes.data;
      const savedLocations = savedLocationsRes.data || [];
      const posts = postsRes.data || [];

      // Calculate unique cities
      const uniqueCities = new Set(
        savedLocations.map((l: any) => l.locations?.city).filter(Boolean)
      ).size;

      // Calculate total likes received
      const totalLikes = posts.reduce((sum, post) => sum + (post.likes_count || 0), 0);

      const stats: UserStats = {
        postsCount: profile?.posts_count || 0,
        followersCount: profile?.follower_count || 0,
        followingCount: profile?.following_count || 0,
        citiesCount: uniqueCities,
        savedPlacesCount: savedLocations.length,
        likesReceived: totalLikes,
        tripsCount: Math.floor(uniqueCities / 2), // Placeholder
        reviewsCount: reviewsRes.count || 0
      };

      const badges = calculateProgressiveBadges(stats, t, targetUserId, user?.id, previousEarnedBadges.current);

      // Cache badges for instant load
      try {
        localStorage.setItem(`badges_cache_${targetUserId}`, JSON.stringify(badges));
      } catch {}

      return { badges, userStats: stats };
    },
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000, // 5 minutes - badges don't change frequently
    gcTime: 30 * 60 * 1000,   // 30 minutes garbage collection
    placeholderData: () => {
      // Try to use cached data for instant UI
      try {
        const cached = localStorage.getItem(`badges_cache_${targetUserId}`);
        if (cached) {
          const badges = JSON.parse(cached);
          return { badges, userStats: getEmptyStats() };
        }
      } catch {}
      return undefined;
    },
  });

  const getTopBadges = (count: number = 3) => {
    const badges = badgeData?.badges || [];
    const earnedBadges = badges.filter(badge => badge.earned);
    const sortedBadges = earnedBadges.sort((a, b) => {
      const levelOrder = { bronze: 1, silver: 2, gold: 3, platinum: 4 };
      return levelOrder[b.level] - levelOrder[a.level];
    });
    return sortedBadges.slice(0, count);
  };

  const getBadgeStats = () => {
    const badges = badgeData?.badges || [];
    const earnedCount = badges.filter(badge => badge.earned).length;
    const totalCount = badges.length;
    return { earned: earnedCount, total: totalCount };
  };

  return {
    badges: badgeData?.badges || [],
    userStats: badgeData?.userStats || getEmptyStats(),
    loading: isLoading,
    getTopBadges,
    getBadgeStats,
    refetch
  };
};

function getEmptyStats(): UserStats {
  return {
    postsCount: 0,
    followersCount: 0,
    followingCount: 0,
    citiesCount: 0,
    savedPlacesCount: 0,
    likesReceived: 0,
    tripsCount: 0,
    reviewsCount: 0
  };
}

function calculateLevel(progress: number, levels: { requirement: number }[]) {
  for (let i = levels.length - 1; i >= 0; i--) {
    if (progress >= levels[i].requirement) {
      return i + 1;
    }
  }
  return 0;
}

function calculateProgressiveBadges(
  stats: UserStats,
  t: (key: string, options?: any) => string,
  targetUserId: string,
  currentUserId: string | undefined,
  previousNotified: Set<string>
): Badge[] {
  const allBadges: Badge[] = [
    // Progressive Explorer Badge
    {
      id: 'explorer',
      name: t('cityWanderer', { ns: 'badges' }),
      description: t('cityWandererDesc', { ns: 'badges' }),
      icon: '🌍',
      category: 'explorer',
      level: 'bronze',
      gradient: 'from-green-400 to-teal-500',
      earned: stats.citiesCount >= 3,
      progress: stats.citiesCount,
      currentLevel: calculateLevel(stats.citiesCount, [
        { requirement: 3 },
        { requirement: 10 },
        { requirement: 25 }
      ]),
      levels: [
        { level: 1, name: 'Bronze', requirement: 3, earned: stats.citiesCount >= 3, earnedDate: stats.citiesCount >= 3 ? new Date().toISOString() : undefined },
        { level: 2, name: 'Silver', requirement: 10, earned: stats.citiesCount >= 10, earnedDate: stats.citiesCount >= 10 ? new Date().toISOString() : undefined },
        { level: 3, name: 'Gold', requirement: 25, earned: stats.citiesCount >= 25, earnedDate: stats.citiesCount >= 25 ? new Date().toISOString() : undefined }
      ]
    },
    // Progressive Milestone Badge (Places-based)
    {
      id: 'collector',
      name: t('collector', { ns: 'badges' }),
      description: t('collectorDesc', { ns: 'badges' }),
      icon: '📍',
      category: 'milestone',
      level: 'bronze',
      gradient: 'from-blue-500 to-indigo-600',
      earned: stats.savedPlacesCount >= 10,
      progress: stats.savedPlacesCount,
      currentLevel: calculateLevel(stats.savedPlacesCount, [
        { requirement: 10 },
        { requirement: 50 },
        { requirement: 150 }
      ]),
      levels: [
        { level: 1, name: 'Bronze', requirement: 10, earned: stats.savedPlacesCount >= 10, earnedDate: stats.savedPlacesCount >= 10 ? new Date().toISOString() : undefined },
        { level: 2, name: 'Silver', requirement: 50, earned: stats.savedPlacesCount >= 50, earnedDate: stats.savedPlacesCount >= 50 ? new Date().toISOString() : undefined },
        { level: 3, name: 'Gold', requirement: 150, earned: stats.savedPlacesCount >= 150, earnedDate: stats.savedPlacesCount >= 150 ? new Date().toISOString() : undefined }
      ]
    },
    // Progressive Social Badge
    {
      id: 'influencer',
      name: t('influencer', { ns: 'badges' }),
      description: t('influencerDesc', { ns: 'badges' }),
      icon: '⭐',
      category: 'social',
      level: 'bronze',
      gradient: 'from-yellow-400 to-orange-500',
      earned: stats.likesReceived >= 50,
      progress: stats.likesReceived,
      currentLevel: calculateLevel(stats.likesReceived, [
        { requirement: 50 },
        { requirement: 200 },
        { requirement: 500 }
      ]),
      levels: [
        { level: 1, name: 'Bronze', requirement: 50, earned: stats.likesReceived >= 50, earnedDate: stats.likesReceived >= 50 ? new Date().toISOString() : undefined },
        { level: 2, name: 'Silver', requirement: 200, earned: stats.likesReceived >= 200, earnedDate: stats.likesReceived >= 200 ? new Date().toISOString() : undefined },
        { level: 3, name: 'Gold', requirement: 500, earned: stats.likesReceived >= 500, earnedDate: stats.likesReceived >= 500 ? new Date().toISOString() : undefined }
      ]
    },
    // Progressive Post Creator Badge
    {
      id: 'contentCreator',
      name: t('contentCreator', { ns: 'badges' }),
      description: t('contentCreatorDesc', { ns: 'badges' }),
      icon: '📸',
      category: 'engagement',
      level: 'bronze',
      gradient: 'from-indigo-400 to-purple-500',
      earned: stats.postsCount >= 10,
      progress: stats.postsCount,
      currentLevel: calculateLevel(stats.postsCount, [
        { requirement: 10 },
        { requirement: 30 },
        { requirement: 100 }
      ]),
      levels: [
        { level: 1, name: 'Bronze', requirement: 10, earned: stats.postsCount >= 10, earnedDate: stats.postsCount >= 10 ? new Date().toISOString() : undefined },
        { level: 2, name: 'Silver', requirement: 30, earned: stats.postsCount >= 30, earnedDate: stats.postsCount >= 30 ? new Date().toISOString() : undefined },
        { level: 3, name: 'Gold', requirement: 100, earned: stats.postsCount >= 100, earnedDate: stats.postsCount >= 100 ? new Date().toISOString() : undefined }
      ]
    },
    // Progressive Reviews Badge  
    {
      id: 'localGuide',
      name: t('localGuide', { ns: 'badges' }),
      description: t('localGuideDesc', { ns: 'badges' }),
      icon: '🗺️',
      category: 'engagement',
      level: 'bronze',
      gradient: 'from-green-400 to-emerald-500',
      earned: stats.reviewsCount >= 5,
      progress: stats.reviewsCount,
      currentLevel: calculateLevel(stats.reviewsCount, [
        { requirement: 5 },
        { requirement: 20 },
        { requirement: 50 }
      ]),
      levels: [
        { level: 1, name: 'Bronze', requirement: 5, earned: stats.reviewsCount >= 5, earnedDate: stats.reviewsCount >= 5 ? new Date().toISOString() : undefined },
        { level: 2, name: 'Silver', requirement: 20, earned: stats.reviewsCount >= 20, earnedDate: stats.reviewsCount >= 20 ? new Date().toISOString() : undefined },
        { level: 3, name: 'Gold', requirement: 50, earned: stats.reviewsCount >= 50, earnedDate: stats.reviewsCount >= 50 ? new Date().toISOString() : undefined }
      ]
    },
    // Progressive Social Network Badge
    {
      id: 'socialNetwork',
      name: t('socialNetwork', { ns: 'badges' }),
      description: t('socialNetworkDesc', { ns: 'badges' }),
      icon: '👥',
      category: 'social',
      level: 'bronze',
      gradient: 'from-pink-400 to-rose-500',
      earned: stats.followersCount >= 10,
      progress: stats.followersCount,
      currentLevel: calculateLevel(stats.followersCount, [
        { requirement: 10 },
        { requirement: 50 },
        { requirement: 200 }
      ]),
      levels: [
        { level: 1, name: 'Bronze', requirement: 10, earned: stats.followersCount >= 10, earnedDate: stats.followersCount >= 10 ? new Date().toISOString() : undefined },
        { level: 2, name: 'Silver', requirement: 50, earned: stats.followersCount >= 50, earnedDate: stats.followersCount >= 50 ? new Date().toISOString() : undefined },
        { level: 3, name: 'Gold', requirement: 200, earned: stats.followersCount >= 200, earnedDate: stats.followersCount >= 200 ? new Date().toISOString() : undefined }
      ]
    }
  ];

  // Handle notifications for new badges (only for own profile)
  if (currentUserId === targetUserId) {
    const notified = new Set(previousNotified);
    
    allBadges.forEach(badge => {
      if (badge.earned && !notified.has(badge.id)) {
        toast.success(`${badge.icon} ${t('newBadgeUnlocked', { ns: 'badges' })}: ${badge.name}`, {
          duration: 5000,
          description: badge.description
        });
        notified.add(badge.id);
      }
    });

    // Persist notified set
    try {
      localStorage.setItem(`badge_notified_${targetUserId}`, JSON.stringify(Array.from(notified)));
    } catch {}
  }

  return allBadges;
}
