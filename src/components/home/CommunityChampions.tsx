import React from 'react';
import { Trophy, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  return <Card className="bg-card border-border shadow-sm overflow-hidden rounded-xl">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground">{t('weeklyLeaderboard', { ns: 'leaderboard' })}</h3>
          <Button
            onClick={() => navigate('/leaderboard')}
            variant="outline"
            size="sm"
            className="rounded-full text-xs font-semibold hover:bg-primary/5 hover:text-primary hover:border-primary/20 flex items-center gap-1.5 h-8 px-3"
          >
            <TrendingUp className="w-3 h-3" />
            <span className="whitespace-nowrap">{t('thisWeek', { ns: 'common' })}</span>
          </Button>
        </div>
      </div>
    </Card>;
};
export default CommunityChampions;