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

const LeaderboardPage = () => {
  const navigate = useNavigate();
  const [filterCity, setFilterCity] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const { champions, loading } = useCommunityChampions(filterCity === 'all' ? undefined : filterCity);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2: return <Medal className="w-6 h-6 text-gray-400" />;
      case 3: return <Award className="w-6 h-6 text-amber-600" />;
      default: return (
        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
          {rank}
        </div>
      );
    }
  };

  const getRankGradient = (rank: number) => {
    switch (rank) {
      case 1: return 'from-yellow-100 to-amber-100 border-yellow-300';
      case 2: return 'from-gray-100 to-slate-100 border-gray-300';
      case 3: return 'from-amber-100 to-orange-100 border-amber-300';
      default: return 'from-background to-muted border-border';
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-8 h-8" />
              <h1 className="text-3xl font-bold">Top Explorers</h1>
            </div>
            <p className="text-primary-foreground/90">See who's leading the way in exploration!</p>
          </div>
        </div>

        {/* Filters */}
        <div className="max-w-4xl mx-auto px-4 -mt-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-muted-foreground" />
              <div className="flex gap-3 flex-1">
                <Select value={filterCity} onValueChange={setFilterCity}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Cities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    <SelectItem value="dublin">Dublin</SelectItem>
                    <SelectItem value="paris">Paris</SelectItem>
                    <SelectItem value="london">London</SelectItem>
                    <SelectItem value="new-york">New York</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="restaurants">Restaurants</SelectItem>
                    <SelectItem value="culture">Culture</SelectItem>
                    <SelectItem value="nightlife">Nightlife</SelectItem>
                    <SelectItem value="outdoors">Outdoors</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </div>

        {/* Leaderboard */}
        <div className="max-w-4xl mx-auto px-4 mt-6 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Card key={i} className="p-4 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-6 h-6 bg-muted rounded-full"></div>
                    <div className="w-12 h-12 bg-muted rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/3"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : champions.length === 0 ? (
            <Card className="p-12 text-center">
              <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Champions Yet</h3>
              <p className="text-muted-foreground mb-4">Be the first to make the leaderboard!</p>
              <Button onClick={() => navigate('/explore')}>Start Exploring</Button>
            </Card>
          ) : (
            champions.map((champion) => (
              <Card
                key={champion.id}
                onClick={() => navigate(`/profile/${champion.id}`)}
                className={`cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg bg-gradient-to-r ${getRankGradient(champion.rank)}`}
              >
                <div className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className="flex-shrink-0">
                      {getRankIcon(champion.rank)}
                    </div>

                    {/* Avatar */}
                    <Avatar className="w-14 h-14 border-2 border-background shadow">
                      <AvatarImage src={champion.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold">
                        {champion.username?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg truncate">@{champion.username}</h3>
                        {champion.rank <= 3 && <span className="text-lg">🏆</span>}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {champion.posts_count} places
                        </span>
                        <span>•</span>
                        <span>{champion.follower_count} followers</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-2xl font-bold text-primary">{champion.weekly_likes}</div>
                      <div className="text-xs text-muted-foreground">likes this week</div>
                      <Badge variant="secondary" className="mt-1">Level {Math.floor(champion.posts_count / 10) + 1}</Badge>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Bottom CTA */}
        <div className="max-w-4xl mx-auto px-4 mt-8">
          <Card className="p-6 text-center bg-gradient-to-r from-primary/10 to-primary/5">
            <h3 className="text-lg font-semibold mb-2">Want to join the leaderboard?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Explore amazing places, share your discoveries, and climb the ranks!
            </p>
            <Button onClick={() => navigate('/explore')} size="lg">
              Start Exploring
            </Button>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default LeaderboardPage;
