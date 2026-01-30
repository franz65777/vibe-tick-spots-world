import { useState } from 'react';
import { useUserBadges } from '@/hooks/useUserBadges';
import AchievementDetailModal from './AchievementDetailModal';

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

interface BadgeDisplayProps {
  // Option 1: Pass badges directly (used by ProfileHeader)
  badges?: Badge[];
  // Option 2: Fetch by userId (used by UserProfilePage)
  userId?: string;
  onBadgesClick?: () => void;
}

/**
 * BadgeDisplay - Supports both prop-based and fetch-based usage
 * 
 * PERFORMANCE: 
 * - When badges prop is provided, uses it directly (no fetch)
 * - When userId is provided, fetches badges via useUserBadges
 * - This allows ProfileHeader to pass badges from parent (eliminating duplicate queries)
 *   while UserProfilePage can still fetch independently
 */
const BadgeDisplay = ({ badges: badgesProp, userId, onBadgesClick }: BadgeDisplayProps) => {
  // Only fetch if badges not provided as prop
  const { badges: fetchedBadges, loading } = useUserBadges(userId);
  const badges = badgesProp || fetchedBadges;
  
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleBadgeClick = (badge: Badge) => {
    setSelectedBadge(badge);
    setIsModalOpen(true);
  };
  
  const earnedBadges = badges.filter(b => b.earned);
  const displayBadges = earnedBadges.slice(0, 2);
  const remainingCount = earnedBadges.length - displayBadges.length;

  // Show loading skeleton only when fetching (not when using props)
  if (!badgesProp && loading) {
    return (
      <div className="flex gap-0.5">
        <div className="w-8 h-8 bg-muted rounded-full animate-pulse"></div>
        <div className="w-8 h-8 bg-muted rounded-full animate-pulse"></div>
      </div>
    );
  }

  if (earnedBadges.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex gap-0.5 items-center">
        {displayBadges.map((badge) => (
          <button
            key={badge.id}
            onClick={() => handleBadgeClick(badge)}
            className={`relative w-8 h-8 rounded-full bg-gradient-to-br ${badge.gradient} p-1 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-110 cursor-pointer`}
            title={`${badge.name}: ${badge.description}`}
          >
            <div className="w-full h-full rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="text-sm">{badge.icon}</span>
            </div>
            
            {badge.level && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-background border border-primary rounded-full flex items-center justify-center shadow-sm">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  badge.level === 'bronze' ? 'bg-orange-500' :
                  badge.level === 'silver' ? 'bg-gray-400' :
                  badge.level === 'gold' ? 'bg-yellow-500' : 
                  'bg-purple-500'
                }`}></div>
              </div>
            )}
          </button>
        ))}
        
        {remainingCount > 0 && onBadgesClick && (
          <button
            onClick={onBadgesClick}
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold hover:scale-110 transition-transform bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 text-primary shadow-sm hover:shadow-md"
            title={`View all ${earnedBadges.length} badges`}
          >
            +{remainingCount}
          </button>
        )}
      </div>

      <AchievementDetailModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        badge={selectedBadge}
      />
    </>
  );
};

export default BadgeDisplay;
