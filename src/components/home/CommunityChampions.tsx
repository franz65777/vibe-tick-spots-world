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
      <Button
        onClick={() => navigate('/leaderboard')}
        variant="outline"
        className="w-fit px-4 rounded-xl border-border bg-background hover:bg-muted/50 h-12 font-semibold text-base"
      >
        <img src={leaderboardTrophy} alt="" className="w-9 h-9 mr-2" />
        {t('leaderboard', { ns: 'common' })}
      </Button>
    </div>
  );
};

export default CommunityChampions;
