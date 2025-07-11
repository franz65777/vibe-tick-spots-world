import React from 'react';
import { Crown, Star, Trophy, Zap } from 'lucide-react';
import { useSuperUser } from '@/hooks/useSuperUser';

const SuperUserBadge = () => {
  const { superUser, isElite, levelProgress } = useSuperUser();

  if (!superUser) return null;

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
    <div className="relative">
      <div className={`bg-gradient-to-r ${getBadgeColor()} text-white px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium`}>
        <Icon className="w-4 h-4" />
        <span>Level {superUser.level}</span>
        <span className="text-xs opacity-90">{superUser.points}pts</span>
      </div>
      
      {/* Level progress bar */}
      <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
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
  );
};

export default SuperUserBadge;