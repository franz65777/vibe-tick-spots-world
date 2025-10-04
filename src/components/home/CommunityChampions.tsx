import React from 'react';
import { Trophy, Medal, Award, Heart, Camera, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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

const CommunityChampions = ({ champions, onUserClick }: CommunityChampionsProps) => {
  const navigate = useNavigate();
  
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2: return <Medal className="w-5 h-5 text-gray-400" />;
      case 3: return <Award className="w-5 h-5 text-amber-600" />;
      default: return <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-600">{rank}</div>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'from-yellow-50 to-amber-50 border-yellow-200';
      case 2: return 'from-gray-50 to-slate-50 border-gray-200';
      case 3: return 'from-amber-50 to-orange-50 border-amber-200';
      default: return 'from-blue-50 to-indigo-50 border-blue-200';
    }
  };

  if (champions.length === 0) {
    return (
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="p-6 text-center">
          <Trophy className="w-8 h-8 text-blue-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">Community Champions</h3>
          <p className="text-gray-600">No champions this week yet!</p>
          <p className="text-sm text-gray-500 mt-1">Share amazing locations to make the leaderboard</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-gray-200">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5 text-blue-600" />
          <h3 className="text-base font-bold text-gray-900">Top Contributors</h3>
          <div className="ml-auto bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">
            This Week
          </div>
        </div>

        <div className="space-y-2">
          {champions.map((champion) => (
            <div
              key={champion.id}
              onClick={() => onUserClick(champion.id)}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              {/* Rank Badge */}
              <div className="flex-shrink-0 w-6 flex justify-center">
                {getRankIcon(champion.rank)}
              </div>

              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {champion.avatar_url ? (
                  <img 
                    src={champion.avatar_url}
                    alt={champion.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold text-sm">
                    {champion.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-gray-900 truncate">
                  @{champion.username}
                  {champion.rank === 1 && <span className="ml-1">👑</span>}
                </h4>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{champion.posts_count} posts</span>
                  <span>•</span>
                  <span>{champion.follower_count} followers</span>
                </div>
              </div>

              {/* Weekly Likes */}
              <div className="flex items-center gap-1 text-red-500">
                <Heart className="w-3.5 h-3.5 fill-current" />
                <span className="font-bold text-sm text-gray-900">{champion.weekly_likes}</span>
              </div>
            </div>
          ))}
        </div>

        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/leaderboard')}
          className="w-full mt-3 text-sm"
        >
          View Full Leaderboard
        </Button>
      </div>
    </Card>
  );
};

export default CommunityChampions;