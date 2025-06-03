
import { useState, useEffect } from 'react';
import { useSavedPlaces } from './useSavedPlaces';

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

export const useBadges = () => {
  const { getStats } = useSavedPlaces();
  const stats = getStats();
  
  const [badges, setBadges] = useState<Badge[]>([
    // Explorer Badges
    {
      id: 'city-wanderer',
      name: 'City Wanderer',
      description: 'Save locations in 3 different cities',
      icon: '🌍',
      category: 'explorer',
      level: 'bronze',
      gradient: 'from-green-400 to-teal-500',
      earned: stats.cities >= 3,
      progress: stats.cities,
      maxProgress: 3,
      earnedDate: stats.cities >= 3 ? '2024-05-30' : undefined
    },
    {
      id: 'globe-trotter',
      name: 'Globe Trotter',
      description: 'Save locations in 5 different cities',
      icon: '✈️',
      category: 'explorer',
      level: 'silver',
      gradient: 'from-blue-400 to-purple-500',
      earned: stats.cities >= 5,
      progress: stats.cities,
      maxProgress: 5
    },
    
    // Foodie Badges
    {
      id: 'foodie',
      name: 'Foodie',
      description: 'Save 10+ restaurants',
      icon: '🍽️',
      category: 'foodie',
      level: 'bronze',
      gradient: 'from-orange-400 to-red-500',
      earned: true, // Demo: user has earned this
      progress: 12,
      maxProgress: 10,
      earnedDate: '2024-05-25'
    },
    {
      id: 'culture-vulture',
      name: 'Culture Vulture',
      description: 'Save 5+ museums or cultural venues',
      icon: '🏛️',
      category: 'foodie',
      level: 'bronze',
      gradient: 'from-purple-400 to-pink-500',
      earned: false,
      progress: 2,
      maxProgress: 5
    },
    
    // Social Badges
    {
      id: 'influencer',
      name: 'Influencer',
      description: 'Get 50+ likes on saved places',
      icon: '⭐',
      category: 'social',
      level: 'gold',
      gradient: 'from-yellow-400 to-orange-500',
      earned: true, // Demo: user has earned this
      progress: 67,
      maxProgress: 50,
      earnedDate: '2024-06-01'
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
      earned: stats.places >= 10,
      progress: stats.places,
      maxProgress: 10,
      earnedDate: stats.places >= 10 ? '2024-05-20' : undefined
    },
    {
      id: 'collector',
      name: 'Collector',
      description: 'Save 50 places total',
      icon: '📍',
      category: 'milestone',
      level: 'silver',
      gradient: 'from-blue-500 to-indigo-600',
      earned: false,
      progress: stats.places,
      maxProgress: 50
    },
    
    // Streak Badges
    {
      id: 'daily-saver',
      name: 'Daily Saver',
      description: 'Save places for 7 consecutive days',
      icon: '🔥',
      category: 'streak',
      level: 'bronze',
      gradient: 'from-red-400 to-orange-500',
      earned: false,
      progress: 3,
      maxProgress: 7
    }
  ]);

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
    getTopBadges,
    getBadgeStats
  };
};
