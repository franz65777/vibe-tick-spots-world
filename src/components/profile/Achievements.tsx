
import { useState } from 'react';
import { useUserBadges } from '@/hooks/useUserBadges';
import { useSuperUser } from '@/hooks/useSuperUser';
import AchievementDetailModal from './AchievementDetailModal';
import { useTranslation } from 'react-i18next';
import { Progress } from '@/components/ui/progress';
import { Zap, Trophy, Crown, Star } from 'lucide-react';

interface AchievementsProps {
  userId?: string;
}

const Achievements = ({ userId }: AchievementsProps) => {
  const { t } = useTranslation();
  const { badges, getBadgeStats, loading } = useUserBadges(userId);
  const { superUser, levelProgress, isElite } = useSuperUser();
  const { earned, total } = getBadgeStats();
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Show first 6 badges (2 columns x 3 rows)
  const displayBadges = badges.slice(0, 6);

  const handleBadgeClick = (badge) => {
    setSelectedBadge(badge);
    setIsModalOpen(true);
  };

  const getLevelIcon = () => {
    const level = superUser?.level || 1;
    if (isElite || level >= 10) return <Crown className="w-4 h-4" />;
    if (level >= 7) return <Trophy className="w-4 h-4" />;
    if (level >= 4) return <Star className="w-4 h-4" />;
    return <Zap className="w-4 h-4" />;
  };

  const getLevelGradient = () => {
    const level = superUser?.level || 1;
    if (isElite || level >= 10) return 'from-amber-500 to-yellow-400';
    if (level >= 7) return 'from-purple-500 to-indigo-500';
    if (level >= 4) return 'from-blue-500 to-cyan-400';
    return 'from-green-500 to-emerald-400';
  };

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
        {/* Header with Level Progress */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">{t('achievements', { ns: 'profile' })}</h2>
            {superUser && (
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r ${getLevelGradient()} text-white text-xs font-bold shadow-sm`}>
                {getLevelIcon()}
                <span>{t('level', { ns: 'profile', defaultValue: 'Lv' })} {superUser.level || 1}</span>
              </div>
            )}
          </div>
          <span className="text-sm text-primary font-medium">{earned}/{total} {t('earned', { ns: 'profile' })}</span>
        </div>

        {/* Level Progress Bar */}
        {superUser && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>{superUser.points || 0} {t('points', { ns: 'profile', defaultValue: 'pts' })}</span>
              <span>{100 - levelProgress} {t('toNextLevel', { ns: 'profile', defaultValue: 'pts to next level' })}</span>
            </div>
            <Progress 
              value={levelProgress} 
              className="h-2"
            />
          </div>
        )}
        
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
