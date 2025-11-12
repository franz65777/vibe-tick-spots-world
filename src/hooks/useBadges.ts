
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
  currentLevel?: number; // 0 = not started, 1 = bronze, 2 = silver, 3 = gold
  levels?: {
    level: number;
    name: string;
    requirement: number;
    earned: boolean;
    earnedDate?: string;
  }[];
}

export const useBadges = () => {
  const { getStats } = useSavedPlaces();
  const stats = getStats();
  
  const calculateLevel = (progress: number, levels: { requirement: number }[]) => {
    for (let i = levels.length - 1; i >= 0; i--) {
      if (progress >= levels[i].requirement) {
        return i + 1;
      }
    }
    return 0;
  };

  const [badges, setBadges] = useState<Badge[]>([
    // Explorer Badge - Progressive
    {
      id: 'explorer',
      name: 'Explorer',
      description: 'Save locations in different cities',
      icon: '🌍',
      category: 'explorer',
      level: 'bronze',
      gradient: 'from-green-400 to-teal-500',
      earned: stats.cities >= 3,
      progress: stats.cities,
      maxProgress: 3,
      currentLevel: calculateLevel(stats.cities, [
        { requirement: 3 },
        { requirement: 10 },
        { requirement: 25 }
      ]),
      levels: [
        { level: 1, name: 'Bronze', requirement: 3, earned: stats.cities >= 3, earnedDate: stats.cities >= 3 ? '2024-05-30' : undefined },
        { level: 2, name: 'Silver', requirement: 10, earned: stats.cities >= 10 },
        { level: 3, name: 'Gold', requirement: 25, earned: stats.cities >= 25 }
      ]
    },
    
    // Foodie Badge - Progressive
    {
      id: 'foodie',
      name: 'Foodie',
      description: 'Save restaurants',
      icon: '🍽️',
      category: 'foodie',
      level: 'bronze',
      gradient: 'from-orange-400 to-red-500',
      earned: true,
      progress: 12,
      maxProgress: 10,
      currentLevel: calculateLevel(12, [
        { requirement: 10 },
        { requirement: 30 },
        { requirement: 75 }
      ]),
      levels: [
        { level: 1, name: 'Bronze', requirement: 10, earned: true, earnedDate: '2024-05-25' },
        { level: 2, name: 'Silver', requirement: 30, earned: false },
        { level: 3, name: 'Gold', requirement: 75, earned: false }
      ]
    },
    
    // Culture Badge - Progressive
    {
      id: 'culture',
      name: 'Culture Vulture',
      description: 'Save museums and cultural venues',
      icon: '🏛️',
      category: 'foodie',
      level: 'bronze',
      gradient: 'from-purple-400 to-pink-500',
      earned: false,
      progress: 2,
      maxProgress: 5,
      currentLevel: calculateLevel(2, [
        { requirement: 5 },
        { requirement: 15 },
        { requirement: 40 }
      ]),
      levels: [
        { level: 1, name: 'Bronze', requirement: 5, earned: false },
        { level: 2, name: 'Silver', requirement: 15, earned: false },
        { level: 3, name: 'Gold', requirement: 40, earned: false }
      ]
    },
    
    // Social Badge - Progressive
    {
      id: 'influencer',
      name: 'Influencer',
      description: 'Get likes on saved places',
      icon: '⭐',
      category: 'social',
      level: 'gold',
      gradient: 'from-yellow-400 to-orange-500',
      earned: true,
      progress: 67,
      maxProgress: 50,
      currentLevel: calculateLevel(67, [
        { requirement: 50 },
        { requirement: 200 },
        { requirement: 500 }
      ]),
      levels: [
        { level: 1, name: 'Bronze', requirement: 50, earned: true, earnedDate: '2024-06-01' },
        { level: 2, name: 'Silver', requirement: 200, earned: false },
        { level: 3, name: 'Gold', requirement: 500, earned: false }
      ]
    },
    
    // Milestone Badge - Progressive
    {
      id: 'collector',
      name: 'Collector',
      description: 'Save places total',
      icon: '📍',
      category: 'milestone',
      level: 'bronze',
      gradient: 'from-blue-500 to-indigo-600',
      earned: stats.places >= 10,
      progress: stats.places,
      maxProgress: 10,
      currentLevel: calculateLevel(stats.places, [
        { requirement: 10 },
        { requirement: 50 },
        { requirement: 150 }
      ]),
      levels: [
        { level: 1, name: 'Bronze', requirement: 10, earned: stats.places >= 10, earnedDate: stats.places >= 10 ? '2024-05-20' : undefined },
        { level: 2, name: 'Silver', requirement: 50, earned: stats.places >= 50 },
        { level: 3, name: 'Gold', requirement: 150, earned: stats.places >= 150 }
      ]
    },
    
    // Streak Badge - Progressive
    {
      id: 'streak',
      name: 'Daily Saver',
      description: 'Save places consecutively',
      icon: '🔥',
      category: 'streak',
      level: 'bronze',
      gradient: 'from-red-400 to-orange-500',
      earned: false,
      progress: 3,
      maxProgress: 7,
      currentLevel: calculateLevel(3, [
        { requirement: 7 },
        { requirement: 30 },
        { requirement: 100 }
      ]),
      levels: [
        { level: 1, name: 'Bronze', requirement: 7, earned: false },
        { level: 2, name: 'Silver', requirement: 30, earned: false },
        { level: 3, name: 'Gold', requirement: 100, earned: false }
      ]
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
