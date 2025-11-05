
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

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
  nextBadgeId?: string; // For progressive badges
}

interface UserStats {
  postsCount: number;
  followersCount: number;
  followingCount: number;
  citiesCount: number;
  savedPlacesCount: number;
  likesReceived: number;
  tripsCount: number;
}

export const useUserBadges = (userId?: string) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const targetUserId = userId || user?.id;
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    postsCount: 0,
    followersCount: 0,
    followingCount: 0,
    citiesCount: 0,
    savedPlacesCount: 0,
    likesReceived: 0,
    tripsCount: 0
  });
  const [loading, setLoading] = useState(true);
const previousEarnedBadges = useRef<Set<string>>(new Set());

useEffect(() => {
  if (!targetUserId) return;
  // Hydrate previously notified badges
  try {
    const raw = localStorage.getItem(`badge_notified_${targetUserId}`);
    previousEarnedBadges.current = new Set(raw ? JSON.parse(raw) : []);
  } catch {}

  // Instant UI: hydrate cached badges if available
  let hasCache = false;
  try {
    const cached = localStorage.getItem(`badges_cache_${targetUserId}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        setBadges(parsed);
        setLoading(false);
        hasCache = true;
      }
    }
  } catch {}

  fetchUserStats(hasCache);
}, [targetUserId]);

const fetchUserStats = async (hasCache: boolean = false) => {
  if (!targetUserId) return;

  try {
    if (!hasCache) setLoading(true);
    console.log('Fetching user stats for badge calculation:', targetUserId);

      // Fetch user profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('posts_count, follower_count, following_count, cities_visited, places_visited')
        .eq('id', targetUserId)
        .single();

      // Fetch additional stats
      const { data: savedPlaces } = await supabase
        .from('user_saved_locations')
        .select('id')
        .eq('user_id', targetUserId);

      // Fetch unique cities from saved locations
      const { data: locations } = await supabase
        .from('user_saved_locations')
        .select('location_id, locations!inner(city)')
        .eq('user_id', targetUserId);

      const uniqueCities = new Set(
        locations?.map(l => l.locations?.city).filter(Boolean) || []
      ).size;

      // Count likes received on posts
      const { data: posts } = await supabase
        .from('posts')
        .select('id, likes_count')
        .eq('user_id', targetUserId);

      const totalLikes = posts?.reduce((sum, post) => sum + (post.likes_count || 0), 0) || 0;

      // For trips count, we'll use a placeholder since trips table doesn't exist yet
      // In a real implementation, you'd create a trips table and count user's trips
      const tripsCount = Math.floor(uniqueCities / 2); // Placeholder logic

      const stats: UserStats = {
        postsCount: profile?.posts_count || 0,
        followersCount: profile?.follower_count || 0,
        followingCount: profile?.following_count || 0,
        citiesCount: uniqueCities,
        savedPlacesCount: savedPlaces?.length || 0,
        likesReceived: totalLikes,
        tripsCount: tripsCount
      };

      setUserStats(stats);
      calculateProgressiveBadges(stats);

    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgressiveBadges = (stats: UserStats) => {
    const currentEarnedIds = new Set<string>();
    const allBadges: Badge[] = [
      // Progressive Explorer Badges (City-based)
      {
        id: 'city-wanderer',
        name: t('cityWanderer', { ns: 'badges' }),
        description: t('cityWandererDesc', { ns: 'badges' }),
        icon: '🌍',
        category: 'explorer',
        level: 'bronze',
        gradient: 'from-green-400 to-teal-500',
        earned: stats.citiesCount >= 3,
        progress: stats.citiesCount,
        maxProgress: 3,
        earnedDate: stats.citiesCount >= 3 ? new Date().toISOString() : undefined,
        nextBadgeId: 'globe-trotter'
      },
      {
        id: 'globe-trotter',
        name: t('globeTrotter', { ns: 'badges' }),
        description: t('globeTrotterDesc', { ns: 'badges' }),
        icon: '🌎',
        category: 'explorer',
        level: 'silver',
        gradient: 'from-blue-400 to-purple-500',
        earned: stats.citiesCount >= 10,
        progress: stats.citiesCount,
        maxProgress: 10,
        earnedDate: stats.citiesCount >= 10 ? new Date().toISOString() : undefined,
        nextBadgeId: 'world-explorer'
      },
      {
        id: 'world-explorer',
        name: t('worldExplorer', { ns: 'badges' }),
        description: t('worldExplorerDesc', { ns: 'badges' }),
        icon: '🗺️',
        category: 'explorer',
        level: 'gold',
        gradient: 'from-yellow-400 to-orange-500',
        earned: stats.citiesCount >= 25,
        progress: stats.citiesCount,
        maxProgress: 25,
        earnedDate: stats.citiesCount >= 25 ? new Date().toISOString() : undefined
      },

      // Progressive Trip Planner Badges
      {
        id: 'trip-planner',
        name: t('tripPlanner', { ns: 'badges' }),
        description: t('tripPlannerDesc', { ns: 'badges' }),
        icon: '📋',
        category: 'planner',
        level: 'bronze',
        gradient: 'from-purple-400 to-pink-500',
        earned: stats.tripsCount >= 1,
        progress: stats.tripsCount,
        maxProgress: 1,
        earnedDate: stats.tripsCount >= 1 ? new Date().toISOString() : undefined,
        nextBadgeId: 'master-planner'
      },
      {
        id: 'master-planner',
        name: t('masterPlanner', { ns: 'badges' }),
        description: t('masterPlannerDesc', { ns: 'badges' }),
        icon: '🗓️',
        category: 'planner',
        level: 'silver',
        gradient: 'from-indigo-400 to-purple-600',
        earned: stats.tripsCount >= 5,
        progress: stats.tripsCount,
        maxProgress: 5,
        earnedDate: stats.tripsCount >= 5 ? new Date().toISOString() : undefined,
        nextBadgeId: 'travel-architect'
      },
      {
        id: 'travel-architect',
        name: t('travelArchitect', { ns: 'badges' }),
        description: t('travelArchitectDesc', { ns: 'badges' }),
        icon: '🏛️',
        category: 'planner',
        level: 'gold',
        gradient: 'from-yellow-500 to-red-500',
        earned: stats.tripsCount >= 15,
        progress: stats.tripsCount,
        maxProgress: 15,
        earnedDate: stats.tripsCount >= 15 ? new Date().toISOString() : undefined
      },

      // Progressive Milestone Badges (Places-based)
      {
        id: 'getting-started',
        name: t('gettingStarted', { ns: 'badges' }),
        description: t('gettingStartedDesc', { ns: 'badges' }),
        icon: '🎯',
        category: 'milestone',
        level: 'bronze',
        gradient: 'from-gray-400 to-gray-600',
        earned: stats.savedPlacesCount >= 10,
        progress: stats.savedPlacesCount,
        maxProgress: 10,
        earnedDate: stats.savedPlacesCount >= 10 ? new Date().toISOString() : undefined,
        nextBadgeId: 'collector'
      },
      {
        id: 'collector',
        name: t('collector', { ns: 'badges' }),
        description: t('collectorDesc', { ns: 'badges' }),
        icon: '📍',
        category: 'milestone',
        level: 'silver',
        gradient: 'from-blue-500 to-indigo-600',
        earned: stats.savedPlacesCount >= 50,
        progress: stats.savedPlacesCount,
        maxProgress: 50,
        earnedDate: stats.savedPlacesCount >= 50 ? new Date().toISOString() : undefined,
        nextBadgeId: 'curator'
      },
      {
        id: 'curator',
        name: t('curator', { ns: 'badges' }),
        description: t('curatorDesc', { ns: 'badges' }),
        icon: '🏆',
        category: 'milestone',
        level: 'gold',
        gradient: 'from-yellow-400 to-orange-600',
        earned: stats.savedPlacesCount >= 150,
        progress: stats.savedPlacesCount,
        maxProgress: 150,
        earnedDate: stats.savedPlacesCount >= 150 ? new Date().toISOString() : undefined
      },

      // Progressive Social Badges
      {
        id: 'social-starter',
        name: t('socialStarter', { ns: 'badges' }),
        description: t('socialStarterDesc', { ns: 'badges' }),
        icon: '⭐',
        category: 'social',
        level: 'bronze',
        gradient: 'from-pink-400 to-rose-500',
        earned: stats.likesReceived >= 10,
        progress: stats.likesReceived,
        maxProgress: 10,
        earnedDate: stats.likesReceived >= 10 ? new Date().toISOString() : undefined,
        nextBadgeId: 'influencer'
      },
      {
        id: 'influencer',
        name: t('influencer', { ns: 'badges' }),
        description: t('influencerDesc', { ns: 'badges' }),
        icon: '🌟',
        category: 'social',
        level: 'silver',
        gradient: 'from-yellow-400 to-orange-500',
        earned: stats.likesReceived >= 50,
        progress: stats.likesReceived,
        maxProgress: 50,
        earnedDate: stats.likesReceived >= 50 ? new Date().toISOString() : undefined,
        nextBadgeId: 'viral-creator'
      },
      {
        id: 'viral-creator',
        name: t('viralCreator', { ns: 'badges' }),
        description: t('viralCreatorDesc', { ns: 'badges' }),
        icon: '🔥',
        category: 'social',
        level: 'gold',
        gradient: 'from-red-400 to-pink-600',
        earned: stats.likesReceived >= 200,
        progress: stats.likesReceived,
        maxProgress: 200,
        earnedDate: stats.likesReceived >= 200 ? new Date().toISOString() : undefined
      },

      // Progressive Content Badges
      {
        id: 'photographer',
        name: t('photographer', { ns: 'badges' }),
        description: t('photographerDesc', { ns: 'badges' }),
        icon: '📸',
        category: 'engagement',
        level: 'bronze',
        gradient: 'from-indigo-400 to-purple-500',
        earned: stats.postsCount >= 10,
        progress: stats.postsCount,
        maxProgress: 10,
        earnedDate: stats.postsCount >= 10 ? new Date().toISOString() : undefined,
        nextBadgeId: 'local-guide'
      },
      {
        id: 'local-guide',
        name: t('localGuide', { ns: 'badges' }),
        description: t('localGuideDesc', { ns: 'badges' }),
        icon: '🗺️',
        category: 'engagement',
        level: 'silver',
        gradient: 'from-green-400 to-emerald-500',
        earned: stats.postsCount >= 20,
        progress: stats.postsCount,
        maxProgress: 20,
        earnedDate: stats.postsCount >= 20 ? new Date().toISOString() : undefined,
        nextBadgeId: 'content-creator'
      },
      {
        id: 'content-creator',
        name: t('contentCreator', { ns: 'badges' }),
        description: t('contentCreatorDesc', { ns: 'badges' }),
        icon: '🎥',
        category: 'engagement',
        level: 'gold',
        gradient: 'from-purple-400 to-pink-500',
        earned: stats.postsCount >= 30,
        progress: stats.postsCount,
        maxProgress: 30,
        earnedDate: stats.postsCount >= 30 ? new Date().toISOString() : undefined,
        nextBadgeId: 'prolific-poster'
      },
      {
        id: 'prolific-poster',
        name: t('prolificPoster', { ns: 'badges' }),
        description: t('prolificPosterDesc', { ns: 'badges' }),
        icon: '🎬',
        category: 'engagement',
        level: 'silver',
        gradient: 'from-indigo-500 to-purple-600',
        earned: stats.postsCount >= 25,
        progress: stats.postsCount,
        maxProgress: 25,
        earnedDate: stats.postsCount >= 25 ? new Date().toISOString() : undefined,
        nextBadgeId: 'content-master'
      },
      {
        id: 'content-master',
        name: t('contentMaster', { ns: 'badges' }),
        description: t('contentMasterDesc', { ns: 'badges' }),
        icon: '🎭',
        category: 'engagement',
        level: 'gold',
        gradient: 'from-yellow-500 to-red-500',
        earned: stats.postsCount >= 100,
        progress: stats.postsCount,
        maxProgress: 100,
        earnedDate: stats.postsCount >= 100 ? new Date().toISOString() : undefined
      }
    ];

    // Track earned badges for notifications (one-time)
    const storageKey = targetUserId ? `badge_notified_${targetUserId}` : '';
    let notified = new Set<string>();
    try {
      const raw = storageKey ? localStorage.getItem(storageKey) : null;
      notified = new Set(raw ? JSON.parse(raw) : []);
    } catch {}

    allBadges.forEach(badge => {
      if (badge.earned) {
        currentEarnedIds.add(badge.id);
        
        if (user?.id === targetUserId && !notified.has(badge.id)) {
          toast.success(`${badge.icon} ${t('newBadgeUnlocked', { ns: 'badges' })}: ${badge.name}`, {
            duration: 5000,
            description: badge.description
          });
          notified.add(badge.id);
        }
      }
    });

    // Persist notified set and update previous earned badges
    try {
      if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify(Array.from(notified)));
      }
    } catch {}
    previousEarnedBadges.current = currentEarnedIds;

    // Filter badges to show only current level and next level for each category
    const filteredBadges = filterProgressiveBadges(allBadges);
    setBadges(filteredBadges);

    // Cache computed badges for instant load next time
    try {
      if (targetUserId) {
        localStorage.setItem(`badges_cache_${targetUserId}`, JSON.stringify(filteredBadges));
      }
    } catch {}
  };

  const filterProgressiveBadges = (allBadges: Badge[]): Badge[] => {
    const badgeGroups: { [key: string]: Badge[] } = {};
    
    // Group badges by category
    allBadges.forEach(badge => {
      const key = badge.category;
      if (!badgeGroups[key]) badgeGroups[key] = [];
      badgeGroups[key].push(badge);
    });

    const filteredBadges: Badge[] = [];

    // For each category, show only the current level and next level
    Object.values(badgeGroups).forEach(categoryBadges => {
      // Sort by level (bronze -> silver -> gold -> platinum)
      const levelOrder = { bronze: 1, silver: 2, gold: 3, platinum: 4 };
      categoryBadges.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);

      let currentBadgeAdded = false;
      
      for (let i = 0; i < categoryBadges.length; i++) {
        const badge = categoryBadges[i];
        
        if (badge.earned) {
          // Always show earned badges
          filteredBadges.push(badge);
          currentBadgeAdded = true;
        } else if (!currentBadgeAdded) {
          // Show the first unearned badge (next goal)
          filteredBadges.push(badge);
          currentBadgeAdded = true;
        }
      }
    });

    return filteredBadges;
  };

  const getTopBadges = (count: number = 3) => {
    const earnedBadges = badges.filter(badge => badge.earned);
    const sortedBadges = earnedBadges.sort((a, b) => {
      const levelOrder = { bronze: 1, silver: 2, gold: 3, platinum: 4 };
      return levelOrder[b.level] - levelOrder[a.level];
    });
    return sortedBadges.slice(0, count);
  };

  const getBadgeStats = () => {
    const earnedCount = badges.filter(badge => badge.earned).length;
    const totalCount = badges.length;
    return { earned: earnedCount, total: totalCount };
  };

  return {
    badges,
    userStats,
    loading,
    getTopBadges,
    getBadgeStats,
    refetch: fetchUserStats
  };
};
