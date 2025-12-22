import React from 'react';
import { Coins } from 'lucide-react';
import { useSuperUser } from '@/hooks/useSuperUser';
import fireIcon from '@/assets/fire-icon-3d.png';

const SuperUserBadge = () => {
  const { superUser } = useSuperUser();

  if (!superUser) return null;

  const currentStreak = superUser.current_streak || 0;
  const points = superUser.points || 0;

  return (
    <div className="flex items-center gap-2">
      {/* Weekly Streak */}
      {currentStreak > 0 && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full text-xs font-bold shadow-sm">
          <img src={fireIcon} alt="streak" className="w-4 h-4" style={{ transform: 'scaleX(0.85)' }} />
          <span>{currentStreak}w streak</span>
        </div>
      )}

      {/* Coins */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-white rounded-full text-xs font-bold shadow-sm">
        <Coins className="w-3.5 h-3.5" />
        <span>{points.toLocaleString()}</span>
      </div>
    </div>
  );
};

export default SuperUserBadge;