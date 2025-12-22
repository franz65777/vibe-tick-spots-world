import React from 'react';
import { Crown, Star, Trophy, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSuperUser } from '@/hooks/useSuperUser';
import fireIcon from '@/assets/fire-icon-3d.png';

const SuperUserBadge = () => {
  const { t } = useTranslation();
  const { superUser, isElite, levelProgress } = useSuperUser();

  if (!superUser) return null;

  const currentStreak = superUser.current_streak || 0;
  const longestStreak = superUser.longest_streak || 0;

  const getBadgeColor = () => {
    if (isElite) return 'from-purple-600 to-pink-600';
    if (superUser.level >= 5) return 'from-blue-600 to-indigo-600';
    if (superUser.level >= 3) return 'from-green-600 to-emerald-600';
    return 'from-orange-600 to-amber-600';
  };

  const getBadgeIcon = () => {
    if (isElite) return Crown;
    if (superUser.level >= 5) return Trophy;
    if (superUser.level >= 3) return Star;
    return Zap;
  };

  const Icon = getBadgeIcon();

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className={`bg-gradient-to-r ${getBadgeColor()} text-white px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium`}>
          <Icon className="w-4 h-4" />
          <span>{t('common:level', { defaultValue: 'Level' })} {superUser.level}</span>
          <span className="text-xs opacity-90">{superUser.points}{t('common:pts', { defaultValue: 'pts' })}</span>
        </div>
        
        {/* Level progress bar */}
        <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r ${getBadgeColor()} transition-all duration-300`}
            style={{ width: `${levelProgress}%` }}
          />
        </div>
        
        {/* Elite badge overlay */}
        {isElite && (
          <div className="absolute -top-1 -right-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full p-1">
            <Crown className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Streak Display */}
      {currentStreak > 0 && (
        <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full text-xs font-semibold shadow">
          <img src={fireIcon} alt="fire" className="w-4 h-4" style={{ transform: 'scaleX(0.85)' }} />
          <span>{t('common:dayStreak', { count: currentStreak, defaultValue: '{{count}} day streak' })}</span>
          {longestStreak > currentStreak && (
            <span className="opacity-75">• {t('common:best', { defaultValue: 'Best' })}: {longestStreak}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default SuperUserBadge;