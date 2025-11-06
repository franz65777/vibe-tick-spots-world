import React, { useState } from 'react';
import { Trophy, Medal, Award, MapPin, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCommunityChampions } from '@/hooks/useCommunityChampions';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';

const LeaderboardPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [filterCity, setFilterCity] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const { champions, loading } = useCommunityChampions(filterCity === 'all' ? undefined : filterCity);

  const getRankBadge = (rank: number) => {
    const badges = ['🥇', '🥈', '🥉'];
    return badges[rank - 1] || `#${rank}`;
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200 shadow-sm';
      case 2: return 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200 shadow-sm';
      case 3: return 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 shadow-sm';
      default: return 'bg-card border-border';
    }
  };

  return (
    <>
      <div className="min-h-screen bg-background pb-20">
        {/* Header with Back Button */}
        <div className="bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground px-4 py-4">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => navigate(-1)}
              className="mb-3 flex items-center gap-2 text-primary-foreground/90 hover:text-primary-foreground transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">{t('back', { ns: 'common' })}</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary-foreground/10 backdrop-blur-sm flex items-center justify-center">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{t('leaderboard', { ns: 'leaderboard' })}</h1>
                <p className="text-primary-foreground/80 text-sm">{t('topExplorersThisWeek', { ns: 'leaderboard' })}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="max-w-4xl mx-auto px-4 mt-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Select value={filterCity} onValueChange={setFilterCity}>
              <SelectTrigger className="h-9 rounded-full border-border bg-card min-w-[140px]">
                <SelectValue placeholder={t('allCities', { ns: 'leaderboard' })} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allCities', { ns: 'leaderboard' })}</SelectItem>
                <SelectItem value="dublin">Dublin</SelectItem>
                <SelectItem value="paris">Paris</SelectItem>
                <SelectItem value="london">London</SelectItem>
                <SelectItem value="new-york">New York</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-9 rounded-full border-border bg-card min-w-[160px]">
                <SelectValue placeholder={t('allCategories', { ns: 'leaderboard' })} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allCategories', { ns: 'leaderboard' })}</SelectItem>
                <SelectItem value="restaurants">{t('restaurant', { ns: 'categories' })}</SelectItem>
                <SelectItem value="culture">{t('museum', { ns: 'categories' })}</SelectItem>
                <SelectItem value="nightlife">{t('bar', { ns: 'categories' })}</SelectItem>
                <SelectItem value="outdoors">{t('entertainment', { ns: 'categories' })}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="max-w-4xl mx-auto px-4 mt-4 space-y-2">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-card rounded-2xl p-4 animate-pulse border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-full"></div>
                    <div className="w-12 h-12 bg-muted rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/3"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : champions.length === 0 ? (
            <div className="bg-card rounded-2xl p-12 text-center border border-border">
              <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">{t('noChampionsYet', { ns: 'leaderboard' })}</h3>
              <p className="text-muted-foreground mb-4">{t('beTheFirst', { ns: 'leaderboard' })}</p>
              <Button onClick={() => navigate('/explore')} className="rounded-full">
                {t('startExploring', { ns: 'leaderboard' })}
              </Button>
            </div>
          ) : (
            champions.map((champion) => (
              <div
                key={champion.id}
                onClick={() => navigate(`/profile/${champion.id}`)}
                className={`cursor-pointer transition-all active:scale-[0.98] rounded-2xl border ${getRankStyle(champion.rank)}`}
              >
                <div className="p-3">
                  <div className="flex items-center gap-3">
                    {/* Rank Badge */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center text-base font-bold shadow-sm">
                      {getRankBadge(champion.rank)}
                    </div>

                    {/* Avatar */}
                    <Avatar className="w-12 h-12 border-2 border-background shadow-sm">
                      <AvatarImage src={champion.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/80 to-accent/80 text-primary-foreground font-bold">
                        {champion.username?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base text-foreground truncate">
                        @{champion.username}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {champion.posts_count}
                        </span>
                        <span>•</span>
                        <span>{champion.follower_count} {t('followers', { ns: 'common' })}</span>
                      </div>
                    </div>

                    {/* Weekly Stats */}
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="text-xl font-bold text-primary">{champion.weekly_likes}</span>
                        <span className="text-lg">❤️</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-medium uppercase">{t('thisWeek', { ns: 'common' })}</div>
                      {champion.rank <= 3 && (
                        <Badge variant="secondary" className="mt-1 text-[10px] h-5">
                          {t('level', { ns: 'gamification' })} {Math.floor(champion.posts_count / 10) + 1}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom CTA */}
        <div className="max-w-4xl mx-auto px-4 mt-6 mb-4">
          <div className="rounded-2xl p-6 text-center bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 border border-border">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent mx-auto mb-3 flex items-center justify-center">
              <Trophy className="w-7 h-7 text-primary-foreground" />
            </div>
            <h3 className="text-lg font-bold mb-2 text-foreground">{t('wantToJoin', { ns: 'leaderboard' })}</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
              {t('exploreAmazingPlaces', { ns: 'leaderboard' })}
            </p>
            <Button 
              onClick={() => navigate('/explore')} 
              size="lg"
              className="rounded-full font-semibold px-8"
            >
              {t('startExploring', { ns: 'leaderboard' })}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default LeaderboardPage;
