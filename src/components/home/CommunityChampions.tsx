import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
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
    <Button
      onClick={() => navigate('/leaderboard')}
      variant="outline"
      className="w-full rounded-xl border-border bg-background hover:bg-muted/50 h-12 font-semibold text-base"
    >
      {t('leaderboard', { ns: 'common' })}
    </Button>
  );
};
export default CommunityChampions;