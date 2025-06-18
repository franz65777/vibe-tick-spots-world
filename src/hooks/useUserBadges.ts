
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

  useEffect(() => {
    if (targetUserId) {
      fetchUserStats();
    }
  }, [targetUserId]);

  const fetchUserStats = async () => {
    if (!targetUserId) return;

    try {
      setLoading(true);
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
    const allBadges: Badge[] = [
      // Progressive Explorer Badges (City-based)
      {
        id: 'city-wanderer',
        name: 'City Wanderer',
        description: 'Save locations in 3 different cities',
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
        name: 'Globe Trotter',
        description: 'Save locations in 10 different cities',
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
        name: 'World Explorer',
        description: 'Save locations in 25 different cities',
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
        name: 'Trip Planner',
        description: 'Create your first trip plan',
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
        name: 'Master Planner',
        description: 'Create 5 different trip plans',
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
        name: 'Travel Architect',
        description: 'Create 15 detailed trip plans',
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
        name: 'Getting Started',
        description: 'Save 10 places total',
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
        name: 'Collector',
        description: 'Save 50 places total',
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
        name: 'Curator',
        description: 'Save 150 places total',
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
        name: 'Social Starter',
        description: 'Get 10+ likes on your posts',
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
        name: 'Influencer',
        description: 'Get 50+ likes on your posts',
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
        name: 'Viral Creator',
        description: 'Get 200+ likes on your posts',
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
        id: 'content-creator',
        name: 'Content Creator',
        description: 'Create 5+ posts',
        icon: '📸',
        category: 'engagement',
        level: 'bronze',
        gradient: 'from-purple-400 to-pink-500',
        earned: stats.postsCount >= 5,
        progress: stats.postsCount,
        maxProgress: 5,
        earnedDate: stats.postsCount >= 5 ? new Date().toISOString() : undefined,
        nextBadgeId: 'prolific-poster'
      },
      {
        id: 'prolific-poster',
        name: 'Prolific Poster',
        description: 'Create 25+ posts',
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
        name: 'Content Master',
        description: 'Create 100+ posts',
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

    // Filter badges to show only current level and next level for each category
    const filteredBadges = filterProgressiveBadges(allBadges);
    setBadges(filteredBadges);
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
