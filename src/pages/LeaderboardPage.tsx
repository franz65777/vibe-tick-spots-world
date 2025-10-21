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
        {/* Header */}
        <div className="bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-primary-foreground/10 backdrop-blur-sm flex items-center justify-center">
                <Trophy className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Leaderboard</h1>
                <p className="text-primary-foreground/80 text-sm mt-0.5">Top explorers this week</p>
              </div>
            </div>
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
                className={`cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md ${getRankStyle(champion.rank)}`}
              >
                <div className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Rank Badge */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center text-base font-bold shadow-sm">
                      {getRankBadge(champion.rank)}
                    </div>

                    {/* Avatar */}
                    <Avatar className="w-14 h-14 border-2 border-background shadow-sm">
                      <AvatarImage src={champion.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/80 to-accent/80 text-primary-foreground font-bold text-lg">
                        {champion.username?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-foreground truncate mb-1">
                        @{champion.username}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {champion.posts_count} places
                        </span>
                        <span>•</span>
                        <span>{champion.follower_count} followers</span>
                      </div>
                    </div>

                    {/* Weekly Stats */}
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-2xl font-bold text-primary">{champion.weekly_likes}</span>
                        <span className="text-xl">❤️</span>
                      </div>
                      <div className="text-xs text-muted-foreground font-medium">this week</div>
                      {champion.rank <= 3 && (
                        <Badge variant="secondary" className="mt-2 text-xs">
                          Level {Math.floor(champion.posts_count / 10) + 1}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Bottom CTA */}
        <div className="max-w-4xl mx-auto px-4 mt-8">
          <Card className="p-6 text-center bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 border-border">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent mx-auto mb-4 flex items-center justify-center">
              <Trophy className="w-8 h-8 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-foreground">Want to join the leaderboard?</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Explore amazing places, share your discoveries, and climb the ranks!
            </p>
            <Button 
              onClick={() => navigate('/explore')} 
              size="lg"
              className="rounded-xl font-semibold"
            >
              Start Exploring
            </Button>
          </Card>
        </div>
      </div>
    </>
  );
};

export default LeaderboardPage;
