
import { useState } from 'react';
import { useUserBadges } from '@/hooks/useUserBadges';
import AchievementDetailModal from './AchievementDetailModal';

interface BadgeDisplayProps {
  userId?: string;
  onBadgesClick?: () => void;
}

const BadgeDisplay = ({ userId, onBadgesClick }: BadgeDisplayProps) => {
  const { badges, loading } = useUserBadges(userId);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleBadgeClick = (badge) => {
    setSelectedBadge(badge);
    setIsModalOpen(true);
  };
  
  const earnedBadges = badges.filter(b => b.earned);
  const displayBadges = earnedBadges.slice(0, 2);
  const remainingCount = earnedBadges.length - displayBadges.length;

  if (loading) {
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
