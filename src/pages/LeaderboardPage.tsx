import React, { useState } from 'react';
import { ChevronLeft, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import { useLeaderboardMetrics, LeaderboardMetric, LeaderboardFilter } from '@/hooks/useLeaderboardMetrics';
import CitySelectionModal from '@/components/explore/CitySelectionModal';
import { translateCityName } from '@/utils/cityTranslations';
import { useAuth } from '@/contexts/AuthContext';

const LeaderboardPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [metric, setMetric] = useState<LeaderboardMetric>('saved');
  const [filter, setFilter] = useState<LeaderboardFilter>('all');
  const [city, setCity] = useState<string>('all');
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const { users, loading } = useLeaderboardMetrics(metric, filter, city === 'all' ? undefined : city);

  const getCityDisplayName = () => {
    if (city === 'all') return t('allCities', { ns: 'leaderboard' });
    return translateCityName(
      city.charAt(0).toUpperCase() + city.slice(1).replace('-', ' '),
      i18n.language
    );
  };

  return (
    <>
      <CitySelectionModal
        isOpen={isCityModalOpen}
        onClose={() => setIsCityModalOpen(false)}
        selectedCity={city}
        onSelectCity={setCity}
        metric={metric}
        filter={filter}
      />

      <div className="min-h-screen bg-background pb-safe">
        {/* Minimal Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border py-4 pt-safe">
          <div className="px-4">
            <div className="flex items-center gap-3 mb-4">
              <Button
                onClick={() => navigate('/explore', { state: { searchMode: 'users' } })}
                variant="ghost"
                size="icon"
                className="rounded-full"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-2xl font-bold text-foreground">{t('leaderboard', { ns: 'common' })}</h1>
            </div>

            {/* Top Filters */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setFilter(filter === 'all' ? 'following' : 'all')}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm font-medium hover:bg-muted/50 transition-colors text-left"
              >
                {filter === 'all' ? t('allMembers', { ns: 'leaderboard' }) : t('following', { ns: 'common' })}
              </button>

              <button
                onClick={() => setIsCityModalOpen(true)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm font-medium hover:bg-muted/50 transition-colors text-left"
              >
                {getCityDisplayName()}
              </button>
            </div>

            {/* Metric Tabs */}
            <Tabs value={metric} onValueChange={(v) => setMetric(v as LeaderboardMetric)} className="w-full">
              <TabsList className="w-full grid grid-cols-4 h-auto bg-muted/50 p-1 rounded-xl">
                <TabsTrigger 
                  value="saved" 
                  className="rounded-lg py-2 px-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  {t('saved', { ns: 'leaderboard' })}
                </TabsTrigger>
                <TabsTrigger 
                  value="invited" 
                  className="rounded-lg py-2 px-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  {t('invited', { ns: 'leaderboard' })}
                </TabsTrigger>
                <TabsTrigger 
                  value="posts" 
                  className="rounded-lg py-2 px-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  {t('posts', { ns: 'leaderboard' })}
                </TabsTrigger>
                <TabsTrigger 
                  value="reviews" 
                  className="rounded-lg py-2 px-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  {t('reviews', { ns: 'leaderboard' })}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

      {/* Leaderboard List */}
      <div className="pt-4 px-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <Skeleton className="w-8 h-6 rounded" />
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="w-12 h-6 rounded" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground text-sm mb-2">
              {t('noResultsTryDifferentFilter', { ns: 'leaderboard' })}
            </p>
            <Button 
              onClick={() => {
                setFilter('all');
                setCity('all');
              }} 
              variant="outline"
              className="mt-4 rounded-full"
            >
              {t('resetFilters', { ns: 'leaderboard' })}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((item) => {
              const isSelf = currentUser?.id === item.id;
              const rowClasses = `flex items-center gap-3 py-3 transition-colors rounded-lg ${isSelf ? 'cursor-default' : 'cursor-pointer hover:bg-muted/30'}`;
              const handleClick = () => { if (!isSelf) navigate(`/profile/${item.id}`); };
              return (
                <div
                  key={item.id}
                  onClick={handleClick}
                  aria-disabled={isSelf}
                  role={isSelf ? 'listitem' : 'button'}
                  className={rowClasses}
                >
                  {/* Rank */}
                  <div className="w-8 text-center flex-shrink-0">
                    <span className="text-base font-semibold text-muted-foreground">
                      {item.rank}
                    </span>
                  </div>

                  {/* Avatar + Username aligned left */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="w-12 h-12 flex-shrink-0">
                      <AvatarImage src={item.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {item.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <p className="font-semibold text-foreground truncate text-left">
                      @{item.username}
                    </p>
                  </div>

                  {/* Score */}
                  <div className="text-right flex-shrink-0">
                    <span className="text-xl font-bold text-foreground">{item.score}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </>
  );
};

export default LeaderboardPage;
