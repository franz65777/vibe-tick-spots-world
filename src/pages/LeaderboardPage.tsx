import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/common/BackButton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import { useLeaderboardMetrics, LeaderboardMetric, LeaderboardFilter } from '@/hooks/useLeaderboardMetrics';
import CitySelectionModal from '@/components/explore/CitySelectionModal';
import { translateCityName } from '@/utils/cityTranslations';
import { useAuth } from '@/contexts/AuthContext';
import leaderboardTrophy from '@/assets/leaderboard-trophy.png';
import FrostedGlassBackground from '@/components/common/FrostedGlassBackground';

interface LeaderboardPageProps {
  onClose?: () => void;
}

const LeaderboardPage = ({ onClose }: LeaderboardPageProps) => {
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

      <div className="relative h-screen flex flex-col">
        {/* Unified frosted glass background */}
        <FrostedGlassBackground className="fixed" />
        {/* Content wrapper */}
        <div className="relative z-10 flex flex-col h-full overflow-hidden">
        {/* Minimal Header */}
        <div 
          className="sticky top-0 z-10 pb-4"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
        >
          <div className="px-4">
            <div className="flex items-center gap-3 mb-4">
              <BackButton onClick={onClose || (() => navigate('/explore', { state: { searchMode: 'users' } }))} />
              <h1 className="text-2xl font-bold text-foreground">{t('leaderboard', { ns: 'common' })}</h1>
              <img src={leaderboardTrophy} alt="" className="w-10 h-10" />
            </div>

            {/* Top Filters */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setFilter(filter === 'all' ? 'following' : 'all')}
                className="flex-1 px-4 py-3 rounded-full text-foreground text-sm font-semibold 
                           bg-background dark:bg-slate-800 
                           shadow-md hover:shadow-lg
                           border border-border/30
                           transition-all duration-200 text-left"
              >
                {filter === 'all' ? t('allMembers', { ns: 'leaderboard' }) : t('following', { ns: 'common' })}
              </button>

              <button
                onClick={() => setIsCityModalOpen(true)}
                className="flex-1 px-4 py-3 rounded-full text-foreground text-sm font-semibold 
                           bg-background dark:bg-slate-800 
                           shadow-md hover:shadow-lg
                           border border-border/30
                           transition-all duration-200 text-left"
              >
                {getCityDisplayName()}
              </button>
            </div>

            {/* Metric Tabs */}
            <Tabs value={metric} onValueChange={(v) => setMetric(v as LeaderboardMetric)} className="w-full">
              <TabsList className="w-full grid grid-cols-4 h-auto bg-background dark:bg-slate-800 p-1.5 rounded-full shadow-md border border-border/30">
                <TabsTrigger 
                  value="saved" 
                  className="rounded-full py-2.5 px-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
                >
                  {t('saved', { ns: 'leaderboard' })}
                </TabsTrigger>
                <TabsTrigger 
                  value="invited" 
                  className="rounded-full py-2.5 px-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
                >
                  {t('invited', { ns: 'leaderboard' })}
                </TabsTrigger>
                <TabsTrigger 
                  value="posts" 
                  className="rounded-full py-2.5 px-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
                >
                  {t('posts', { ns: 'leaderboard' })}
                </TabsTrigger>
                <TabsTrigger 
                  value="reviews" 
                  className="rounded-full py-2.5 px-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
                >
                  {t('reviews', { ns: 'leaderboard' })}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

      {/* Leaderboard List - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 pb-safe">
        {loading ? (
          <div className="space-y-3 pt-4">
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
            <img src={leaderboardTrophy} alt="" className="w-16 h-16 mx-auto mb-4 opacity-50" />
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
          <div className="space-y-2 pt-4 pb-20">
            {users.map((item) => {
              const isSelf = currentUser?.id === item.id;
              const isTop3 = item.rank <= 3;
              
              // Podium styling for top 3
              const podiumStyles = item.rank === 1 
                ? "bg-gradient-to-r from-yellow-400/15 to-amber-500/10 border-l-4 border-l-yellow-400"
                : item.rank === 2 
                ? "bg-gradient-to-r from-gray-300/15 to-gray-400/10 border-l-4 border-l-gray-400"
                : item.rank === 3 
                ? "bg-gradient-to-r from-orange-400/15 to-amber-600/10 border-l-4 border-l-orange-400"
                : "";
              
              const handleClick = () => { if (!isSelf) navigate(`/profile/${item.id}`); };
              
              return (
                <div
                  key={item.id}
                  onClick={handleClick}
                  aria-disabled={isSelf}
                  role={isSelf ? 'listitem' : 'button'}
                  className={`flex items-center gap-3 py-3 px-2 transition-all duration-150 rounded-xl ${podiumStyles} ${isSelf ? 'cursor-default' : 'cursor-pointer active:bg-muted/50 active:scale-[0.98]'}`}
                >
                  {/* Rank Badge */}
                  <div className="w-8 text-center flex-shrink-0">
                    {isTop3 ? (
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md ${
                        item.rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-amber-500' :
                        item.rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                        'bg-gradient-to-br from-orange-400 to-amber-600'
                      }`}>
                        {item.rank}
                      </div>
                    ) : (
                      <span className="text-base font-semibold text-muted-foreground">
                        {item.rank}
                      </span>
                    )}
                  </div>

                  {/* Avatar + Username aligned left */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className={`flex-shrink-0 ${isTop3 ? 'w-14 h-14 ring-2 ring-offset-2 ring-offset-background' : 'w-12 h-12'} ${
                      item.rank === 1 ? 'ring-yellow-400' :
                      item.rank === 2 ? 'ring-gray-400' :
                      item.rank === 3 ? 'ring-orange-400' : ''
                    }`}>
                      <AvatarImage src={item.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {item.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <p className={`font-semibold text-foreground truncate text-left ${isTop3 ? 'text-base' : ''}`}>
                      @{item.username}
                    </p>
                  </div>

                  {/* Score */}
                  <div className="text-right flex-shrink-0">
                    <span className={`font-bold text-foreground ${isTop3 ? 'text-2xl' : 'text-xl'}`}>{item.score}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
        </div>
      </div>
    </>
  );
};

export default LeaderboardPage;
