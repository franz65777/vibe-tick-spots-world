
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'explorer' | 'social' | 'foodie' | 'engagement' | 'streak' | 'milestone';
  level: 'bronze' | 'silver' | 'gold' | 'platinum';
  gradient: string;
  earned: boolean;
  progress?: number;
  maxProgress?: number;
  earnedDate?: string;
}

interface UserStats {
  postsCount: number;
  followersCount: number;
  followingCount: number;
  citiesCount: number;
  savedPlacesCount: number;
  likesReceived: number;
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
    likesReceived: 0
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

      const stats: UserStats = {
        postsCount: profile?.posts_count || 0,
        followersCount: profile?.follower_count || 0,
        followingCount: profile?.following_count || 0,
        citiesCount: uniqueCities,
        savedPlacesCount: savedPlaces?.length || 0,
        likesReceived: totalLikes
      };

      setUserStats(stats);
      calculateBadges(stats);

    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateBadges = (stats: UserStats) => {
    const calculatedBadges: Badge[] = [
      // Explorer Badges
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
        earnedDate: stats.citiesCount >= 3 ? new Date().toISOString() : undefined
      },
      {
        id: 'globe-trotter',
        name: 'Globe Trotter',
        description: 'Save locations in 5 different cities',
        icon: '✈️',
        category: 'explorer',
        level: 'silver',
        gradient: 'from-blue-400 to-purple-500',
        earned: stats.citiesCount >= 5,
        progress: stats.citiesCount,
        maxProgress: 5,
        earnedDate: stats.citiesCount >= 5 ? new Date().toISOString() : undefined
      },

      // Milestone Badges
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
        earnedDate: stats.savedPlacesCount >= 10 ? new Date().toISOString() : undefined
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
        earnedDate: stats.savedPlacesCount >= 50 ? new Date().toISOString() : undefined
      },

      // Social Badges
      {
        id: 'influencer',
        name: 'Influencer',
        description: 'Get 50+ likes on your posts',
        icon: '⭐',
        category: 'social',
        level: 'gold',
        gradient: 'from-yellow-400 to-orange-500',
        earned: stats.likesReceived >= 50,
        progress: stats.likesReceived,
        maxProgress: 50,
        earnedDate: stats.likesReceived >= 50 ? new Date().toISOString() : undefined
      },
      {
        id: 'social-butterfly',
        name: 'Social Butterfly',
        description: 'Have 25+ followers',
        icon: '🦋',
        category: 'social',
        level: 'silver',
        gradient: 'from-pink-400 to-purple-500',
        earned: stats.followersCount >= 25,
        progress: stats.followersCount,
        maxProgress: 25,
        earnedDate: stats.followersCount >= 25 ? new Date().toISOString() : undefined
      },

      // Content Badges
      {
        id: 'content-creator',
        name: 'Content Creator',
        description: 'Create 10+ posts',
        icon: '📸',
        category: 'engagement',
        level: 'bronze',
        gradient: 'from-purple-400 to-pink-500',
        earned: stats.postsCount >= 10,
        progress: stats.postsCount,
        maxProgress: 10,
        earnedDate: stats.postsCount >= 10 ? new Date().toISOString() : undefined
      },
      {
        id: 'prolific-poster',
        name: 'Prolific Poster',
        description: 'Create 50+ posts',
        icon: '🎬',
        category: 'engagement',
        level: 'gold',
        gradient: 'from-yellow-500 to-red-500',
        earned: stats.postsCount >= 50,
        progress: stats.postsCount,
        maxProgress: 50,
        earnedDate: stats.postsCount >= 50 ? new Date().toISOString() : undefined
      }
    ];

    setBadges(calculatedBadges);
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
