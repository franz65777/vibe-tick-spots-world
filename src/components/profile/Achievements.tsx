
import { useState } from 'react';
import { useUserBadges } from '@/hooks/useUserBadges';
import AchievementDetailModal from './AchievementDetailModal';
import { useTranslation } from 'react-i18next';

interface AchievementsProps {
  userId?: string;
}

const Achievements = ({ userId }: AchievementsProps) => {
  const { t } = useTranslation();
  const { badges, getBadgeStats, loading } = useUserBadges(userId);
  const { earned, total } = getBadgeStats();
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Show all badges with progress indicators
  const displayBadges = badges.slice(0, 6); // Show first 6 badges

  const handleBadgeClick = (badge) => {
    setSelectedBadge(badge);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="px-4 py-4 bg-[#5c6b7d]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">{t('achievements', { ns: 'profile' })}</h2>
          <div className="w-16 h-4 bg-muted rounded animate-pulse"></div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col items-center p-4 rounded-xl border-2 border-border bg-muted/30">
              <div className="w-10 h-10 bg-muted rounded-full animate-pulse mb-2"></div>
              <div className="w-20 h-3 bg-muted rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 py-4 bg-[#5c6b7d]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">{t('achievements', { ns: 'profile' })}</h2>
          <span className="text-sm text-white/80 font-medium">{earned}/{total} {t('earned', { ns: 'profile' })}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 overflow-y-auto scrollbar-hide">
          {displayBadges.map((badge) => (
            <div 
              key={badge.id} 
              onClick={() => handleBadgeClick(badge)}
              className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 cursor-pointer ${
                badge.earned 
                  ? `bg-gradient-to-br ${badge.gradient} border-transparent shadow-md`
                  : 'bg-muted/30 border-border hover:border-border/60'
              }`}
              title={badge.description}
            >
              <div className="text-3xl mb-2 relative">
                <span className={badge.earned ? 'filter-none' : 'filter grayscale opacity-60'}>
                  {badge.icon}
                </span>
                {badge.earned && (
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-sm ${
                    badge.level === 'bronze' ? 'bg-orange-500' :
                    badge.level === 'silver' ? 'bg-gray-400' :
                    badge.level === 'gold' ? 'bg-yellow-500' : 
                    'bg-purple-500'
                  }`}>
                    <span className="text-xs font-bold text-white">
                      {badge.level === 'bronze' ? 'B' : 
                       badge.level === 'silver' ? 'S' : 
                       badge.level === 'gold' ? 'G' : 'P'}
                    </span>
                  </div>
                )}
              </div>
              <span className={`text-sm font-medium text-center leading-tight ${
                badge.earned ? 'text-white' : 'text-muted-foreground'
              }`}>
                {badge.name}
              </span>
              
              {/* Progress indicator for unearned badges */}
              {!badge.earned && badge.progress !== undefined && badge.maxProgress && (
                <div className="w-full mt-2">
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div 
                      className="bg-primary h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${(badge.progress / badge.maxProgress) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1 block">
                    {badge.progress}/{badge.maxProgress}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <AchievementDetailModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        badge={selectedBadge}
        allBadges={badges}
      />
    </>
  );
};

export default Achievements;
