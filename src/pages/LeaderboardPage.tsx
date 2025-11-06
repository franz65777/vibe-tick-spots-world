import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import { useLeaderboardMetrics, LeaderboardMetric, LeaderboardFilter } from '@/hooks/useLeaderboardMetrics';

const LeaderboardPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [metric, setMetric] = useState<LeaderboardMetric>('saved');
  const [filter, setFilter] = useState<LeaderboardFilter>('all');
  const [city, setCity] = useState<string>('all');
  const { users, loading } = useLeaderboardMetrics(metric, filter, city === 'all' ? undefined : city);

  const getMetricLabel = (metric: LeaderboardMetric) => {
    switch (metric) {
      case 'saved': return t('savedPlaces', { ns: 'leaderboard' });
      case 'invited': return t('invitedUsers', { ns: 'leaderboard' });
      case 'posts': return t('postsWithLocation', { ns: 'leaderboard' });
      case 'reviews': return t('reviewsLeft', { ns: 'leaderboard' });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Minimal Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Button
              onClick={() => navigate(-1)}
              variant="ghost"
              size="icon"
              className="rounded-full"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Leaderboard</h1>
          </div>

          {/* Top Filters */}
          <div className="flex gap-2 mb-3">
            <Select value={filter} onValueChange={(v) => setFilter(v as LeaderboardFilter)}>
              <SelectTrigger className="flex-1 rounded-xl border-border bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Members</SelectItem>
                <SelectItem value="following">Following</SelectItem>
              </SelectContent>
            </Select>

            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="flex-1 rounded-xl border-border bg-background">
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                <SelectItem value="dublin">Dublin</SelectItem>
                <SelectItem value="paris">Paris</SelectItem>
                <SelectItem value="london">London</SelectItem>
                <SelectItem value="new-york">New York</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Metric Tabs */}
          <Tabs value={metric} onValueChange={(v) => setMetric(v as LeaderboardMetric)} className="w-full">
            <TabsList className="w-full grid grid-cols-4 h-auto bg-muted/50 p-1 rounded-xl">
              <TabsTrigger 
                value="saved" 
                className="rounded-lg py-2 px-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                Saved
              </TabsTrigger>
              <TabsTrigger 
                value="invited" 
                className="rounded-lg py-2 px-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                Invited
              </TabsTrigger>
              <TabsTrigger 
                value="posts" 
                className="rounded-lg py-2 px-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                Posts
              </TabsTrigger>
              <TabsTrigger 
                value="reviews" 
                className="rounded-lg py-2 px-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                Reviews
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="max-w-4xl mx-auto px-4 pt-4">
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
            <p className="text-muted-foreground text-sm">No data available for this metric</p>
            <Button 
              onClick={() => navigate('/explore')} 
              variant="outline"
              className="mt-4 rounded-full"
            >
              Start Exploring
            </Button>
          </div>
        ) : (
          <div className="space-y-0 divide-y divide-border">
            {users.map((user) => (
              <div
                key={user.id}
                onClick={() => navigate(`/profile/${user.id}`)}
                className="flex items-center gap-3 py-3 cursor-pointer hover:bg-muted/30 transition-colors px-3 -mx-3 rounded-lg"
              >
                {/* Rank */}
                <div className="w-8 text-center">
                  <span className="text-base font-semibold text-muted-foreground">
                    {user.rank}
                  </span>
                </div>

                {/* Avatar */}
                <Avatar className="w-12 h-12">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {user.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Username */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    @{user.username}
                  </p>
                </div>

                {/* Score */}
                <div className="text-right">
                  <span className="text-xl font-bold text-foreground">{user.score}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;
