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
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-bold text-gray-900">Community Champions</h3>
          <div className="ml-auto bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-semibold">
            This Week
          </div>
        </div>

        <div className="space-y-3">
          {champions.map((champion) => (
            <div
              key={champion.id}
              onClick={() => onUserClick(champion.id)}
              className={`relative overflow-hidden rounded-xl p-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-md bg-gradient-to-r ${getRankColor(champion.rank)}`}
            >
              <div className="flex items-center gap-3">
                {/* Rank Badge */}
                <div className="flex-shrink-0">
                  {getRankIcon(champion.rank)}
                </div>

                {/* Avatar */}
                <div className="relative">
                  {champion.avatar_url ? (
                    <img 
                      src={champion.avatar_url}
                      alt={champion.username}
                      className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold text-sm border-2 border-white shadow-sm">
                      {champion.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  {champion.rank <= 3 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-bold">{champion.rank}</span>
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900 truncate">@{champion.username}</h4>
                    {champion.rank === 1 && <span className="text-xs">👑</span>}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Camera className="w-3 h-3" />
                      <span>{champion.posts_count} posts</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      <span>{champion.follower_count} followers</span>
                    </div>
                  </div>
                </div>

                {/* Weekly Likes */}
                <div className="text-right">
                  <div className="flex items-center gap-1 text-red-500">
                    <Heart className="w-4 h-4 fill-current" />
                    <span className="font-bold text-gray-900">{champion.weekly_likes}</span>
                  </div>
                  <span className="text-xs text-gray-500">this week</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 text-center space-y-2">
          <p className="text-sm text-gray-600">
            Share amazing locations to join the leaderboard! 🚀
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/leaderboard')}
            className="w-full"
          >
            View Full Leaderboard
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default CommunityChampions;