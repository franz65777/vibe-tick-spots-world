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
        className="h-11 px-5 rounded-full font-semibold text-base
                   bg-background dark:bg-slate-800
                   shadow-md hover:shadow-lg
                   border border-border/50
                   text-foreground
                   transition-all duration-200 ease-out
                   hover:scale-[1.02] active:scale-[0.98]
                   flex items-center justify-center gap-2"
      >
        <img 
          src={leaderboardTrophy} 
          alt="" 
          className="w-7 h-7" 
        />
        <span>{t('leaderboard', { ns: 'common' })}</span>
      </button>
    </div>
  );
};

export default CommunityChampions;
