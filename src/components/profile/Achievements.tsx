
import { useState } from 'react';
import { useUserBadges } from '@/hooks/useUserBadges';
import { useSuperUser } from '@/hooks/useSuperUser';
import AchievementDetailModal from './AchievementDetailModal';
import { useTranslation } from 'react-i18next';
import { Coins } from 'lucide-react';
import fireIcon from '@/assets/fire-icon-3d.png';

interface AchievementsProps {
  userId?: string;
}

const Achievements = ({ userId }: AchievementsProps) => {
  const { t } = useTranslation();
  const { badges, getBadgeStats, loading } = useUserBadges(userId);
  const { superUser } = useSuperUser();
  const { earned, total } = getBadgeStats();
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Show first 6 badges (2 columns x 3 rows)
  const displayBadges = badges.slice(0, 6);

  const handleBadgeClick = (badge) => {
    setSelectedBadge(badge);
    setIsModalOpen(true);
  };

  const currentStreak = superUser?.current_streak || 0;
  const longestStreak = superUser?.longest_streak || 0;
  const points = superUser?.points || 0;

  if (loading) {
    return (
      <div className="px-4 py-4 bg-background">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">{t('achievements', { ns: 'profile' })}</h2>
          <div className="w-16 h-4 bg-muted rounded animate-pulse"></div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
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
      <div className="px-4 py-4 bg-background">
        {/* Header with Streak & Coins */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">{t('achievements', { ns: 'profile' })}</h2>
            
            {/* Weekly Streak Badge */}
            {currentStreak > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold shadow-sm">
                <img src={fireIcon} alt="streak" className="w-4 h-4" style={{ transform: 'scaleX(0.85)' }} />
                <span>{currentStreak}w</span>
              </div>
            )}
          </div>
          <span className="text-sm text-primary font-medium">{earned}/{total} {t('earned', { ns: 'profile' })}</span>
        </div>

        {/* Streak & Coins Row */}
        <div className="flex items-center gap-3 mb-4">
          {/* Streak Card */}
          <div className="flex-1 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border border-orange-200/50 dark:border-orange-800/30 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <img src={fireIcon} alt="streak" className="w-8 h-8" style={{ transform: 'scaleX(0.85)' }} />
              <div>
                <p className="text-xs text-muted-foreground">{t('weeklyStreak', { ns: 'profile', defaultValue: 'Weekly Streak' })}</p>
                <p className="text-lg font-bold text-foreground">
                  {currentStreak} {t('weeks', { ns: 'profile', defaultValue: 'weeks' })}
                </p>
                {longestStreak > currentStreak && (
                  <p className="text-[10px] text-muted-foreground">
                    {t('best', { ns: 'profile', defaultValue: 'Best' })}: {longestStreak}w
                  </p>
                )}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {t('streakHint', { ns: 'profile', defaultValue: 'Save 1+ place/week to keep streak!' })}
            </p>
          </div>

          {/* Coins Card */}
          <div className="flex-1 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 border border-yellow-200/50 dark:border-yellow-800/30 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-sm">
                <Coins className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('coins', { ns: 'profile', defaultValue: 'Coins' })}</p>
                <p className="text-lg font-bold text-foreground">{points.toLocaleString()}</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {t('coinsHint', { ns: 'profile', defaultValue: 'Earn coins, unlock rewards!' })}
            </p>
          </div>
        </div>
        
        {/* Badges Grid - 2 columns x 3 rows */}
        <div className="grid grid-cols-2 gap-3">
          {displayBadges.map((badge) => {
            const currentLevel = badge.currentLevel || 0;
            const nextLevel = badge.levels?.[currentLevel] || badge.levels?.[0];
            const progress = badge.progress || 0;
            const maxProgress = nextLevel?.requirement || 1;
            const progressPercent = Math.min((progress / maxProgress) * 100, 100);
            
            return (
              <div 
                key={badge.id} 
                onClick={() => handleBadgeClick(badge)}
                className={`flex flex-col p-3 rounded-xl border-2 transition-all duration-200 hover:scale-[1.02] cursor-pointer ${
                  badge.earned 
                    ? `bg-gradient-to-br ${badge.gradient} border-transparent shadow-md`
                    : 'bg-muted/30 border-border hover:border-border/60'
                }`}
                title={badge.description}
              >
                <div className="flex items-start gap-3">
                  {/* Badge Icon */}
                  <div className={`text-2xl flex-shrink-0 ${badge.earned ? '' : 'filter grayscale opacity-60'}`}>
                    {badge.icon}
                  </div>
                  
                  {/* Badge Info */}
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-semibold leading-tight block truncate ${
                      badge.earned ? 'text-white' : 'text-foreground'
                    }`}>
                      {badge.name}
                    </span>
                    
                    {/* Level indicator */}
                    {badge.levels && (
                      <div className="flex items-center gap-1 mt-1">
                        {badge.levels.map((level, idx) => (
                          <div 
                            key={idx}
                            className={`w-2 h-2 rounded-full ${
                              level.earned 
                                ? badge.earned ? 'bg-white' : 'bg-primary'
                                : badge.earned ? 'bg-white/30' : 'bg-muted-foreground/30'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar for unearned or partially earned badges */}
                {!badge.earned && badge.progress !== undefined && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                      <span>{progress}/{maxProgress}</span>
                      <span>{Math.round(progressPercent)}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Show level name for earned badges */}
                {badge.earned && badge.currentLevel && badge.currentLevel > 0 && (
                  <div className="mt-2 text-[10px] text-white/80 font-medium">
                    {badge.levels?.[badge.currentLevel - 1]?.name || 'Bronze'}
                  </div>
                )}
              </div>
            );
          })}
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
