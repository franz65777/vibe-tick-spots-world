
import { Badge } from '@/components/ui/badge';
import { useBadges } from '@/hooks/useBadges';
import { useState } from 'react';
import AchievementDetailModal from './AchievementDetailModal';

const BadgeDisplay = () => {
  const { getTopBadges } = useBadges();
  const topBadges = getTopBadges(3);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleBadgeClick = (badge) => {
    setSelectedBadge(badge);
    setIsModalOpen(true);
  };

  if (topBadges.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {topBadges.map((badge) => (
          <button
            key={badge.id}
            onClick={() => handleBadgeClick(badge)}
            className={`relative w-8 h-8 rounded-full bg-gradient-to-br ${badge.gradient} p-1 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-110 cursor-pointer`}
            title={`${badge.name}: ${badge.description}`}
          >
            <div className="w-full h-full rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="text-sm">{badge.icon}</span>
            </div>
            
            {/* Level indicator */}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
              <div className={`w-2 h-2 rounded-full ${
                badge.level === 'bronze' ? 'bg-orange-500' :
                badge.level === 'silver' ? 'bg-gray-400' :
                badge.level === 'gold' ? 'bg-yellow-500' : 
                'bg-purple-500'
              }`}></div>
            </div>
          </button>
        ))}
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
