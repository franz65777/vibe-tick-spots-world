import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import leaderboardTrophy from '@/assets/leaderboard-trophy.png';

interface Champion {
  id: string;
  username: string;
  avatar_url?: string;
  posts_count: number;
  follower_count: number;
  weekly_likes: number;
  rank: number;
}

interface CommunityChampionsProps {
  champions: Champion[];
  onUserClick: (userId: string) => void;
}

const CommunityChampions = ({
  champions,
  onUserClick
}: CommunityChampionsProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const getRankBadge = (rank: number) => {
    const badges = ['🥇', '🥈', '🥉'];
    return badges[rank - 1] || `#${rank}`;
  };
  
  if (champions.length === 0) {
    return null;
  }
  
  return (
    <div className="flex justify-center w-full">
      <button
        onClick={() => navigate('/leaderboard')}
        className="relative h-14 px-6 rounded-2xl font-bold text-lg
                   bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 
                   hover:from-amber-500 hover:via-yellow-500 hover:to-orange-500
                   shadow-lg shadow-amber-500/30 
                   border border-white/40
                   text-amber-900
                   transition-all duration-200 ease-out
                   hover:scale-105 hover:shadow-xl hover:shadow-amber-500/40
                   active:scale-95
                   flex items-center justify-center gap-2"
      >
        <img 
          src={leaderboardTrophy} 
          alt="" 
          className="w-10 h-10 drop-shadow-md animate-bounce-gentle" 
        />
        <span className="drop-shadow-sm">{t('leaderboard', { ns: 'common' })}</span>
      </button>
    </div>
  );
};

export default CommunityChampions;
