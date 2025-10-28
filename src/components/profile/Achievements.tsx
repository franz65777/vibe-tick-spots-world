
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
      <div className="px-4 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{t('achievements', { ns: 'profile' })}</h2>
          <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col items-center p-4 rounded-xl border-2 border-gray-200 bg-gray-50">
              <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse mb-2"></div>
              <div className="w-20 h-3 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{t('achievements', { ns: 'profile' })}</h2>
          <span className="text-sm text-blue-600 font-medium">{earned}/{total} {t('earned', { ns: 'profile' })}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {displayBadges.map((badge) => (
            <div 
              key={badge.id} 
              onClick={() => handleBadgeClick(badge)}
              className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 cursor-pointer ${
                badge.earned 
                  ? `bg-gradient-to-br ${badge.gradient} border-transparent shadow-md`
                  : 'bg-gray-50 border-gray-200 hover:border-gray-300'
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
                badge.earned ? 'text-white' : 'text-gray-700'
              }`}>
                {badge.name}
              </span>
              
              {/* Progress indicator for unearned badges */}
              {!badge.earned && badge.progress !== undefined && badge.maxProgress && (
                <div className="w-full mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${(badge.progress / badge.maxProgress) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500 mt-1 block">
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
      />
    </>
  );
};

export default Achievements;
