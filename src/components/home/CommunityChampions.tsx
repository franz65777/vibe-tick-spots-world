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
  return <Card className="bg-card border-border shadow-sm overflow-hidden">
      <div className="bg-gradient-to-br from-primary/5 to-accent/5 px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-base font-bold text-foreground">{t('topContributors', { ns: 'home' })}</h3>
          </div>
          <div className="flex items-center gap-1.5 bg-background/80 backdrop-blur-sm px-2.5 py-1 rounded-full border border-border">
            <TrendingUp className="w-3 h-3 text-primary" />
            <span className="text-xs font-semibold text-foreground">{t('thisWeek', { ns: 'common' })}</span>
          </div>
        </div>
      </div>

      <div className="p-3 space-y-2">
        {champions.map(champion => <div key={champion.id} onClick={() => onUserClick(champion.id)} className="group flex items-center gap-3 p-3 rounded-xl bg-background hover:bg-accent/5 cursor-pointer transition-all duration-200 border border-transparent hover:border-border">
            {/* Rank Badge */}
            

            {/* Avatar */}
            <Avatar className="w-10 h-10 border-2 border-background shadow-sm">
              <AvatarImage src={champion.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-primary/80 to-accent/80 text-primary-foreground text-sm font-semibold">
                {champion.username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                @{champion.username}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span>{champion.follower_count} {t('followers', { ns: 'profile' })}</span>
                <span>•</span>
                <span>{champion.posts_count} {t('places', { ns: 'explore' })}</span>
              </div>
            </div>

            {/* Weekly Stats */}
            <div className="flex-shrink-0 text-right">
              <div className="flex items-center gap-1 text-primary font-bold text-sm">
                <span>❤️</span>
                <span>{champion.weekly_likes}</span>
              </div>
              <div className="text-xs text-muted-foreground">{t('thisWeek', { ns: 'common' })}</div>
            </div>
          </div>)}
      </div>

      <div className="px-3 pb-3">
        <Button onClick={() => navigate('/leaderboard')} variant="outline" size="sm" className="w-full rounded-xl font-semibold hover:bg-primary/5 hover:text-primary hover:border-primary/20">
          {t('viewFullLeaderboard', { ns: 'home' })}
        </Button>
      </div>
    </Card>;
};
export default CommunityChampions;