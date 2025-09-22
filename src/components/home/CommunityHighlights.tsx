import React from 'react';
import WeeklyWinner from './WeeklyWinner';
import CommunityChampions from './CommunityChampions';
import BusinessSpotlight from './BusinessSpotlight';
import { useWeeklyWinner } from '@/hooks/useWeeklyWinner';
import { useCommunityChampions } from '@/hooks/useCommunityChampions';

interface CommunityHighlightsProps {
  currentCity: string;
  onLocationClick: (locationId: string) => void;
  onUserClick: (userId: string) => void;
  onMapLocationClick: (coordinates: { lat: number; lng: number }) => void;
}

const CommunityHighlights = ({ 
  currentCity, 
  onLocationClick, 
  onUserClick, 
  onMapLocationClick 
}: CommunityHighlightsProps) => {
  const { location: weeklyWinner, loading: winnerLoading } = useWeeklyWinner(currentCity);
  const { champions, loading: championsLoading } = useCommunityChampions(currentCity);

  // Always show something engaging - prioritize weekly winner, then champion, then placeholder
  if (weeklyWinner && !winnerLoading) {
    return (
      <div className="px-4 py-2">
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-3 border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">🏆</span>
              </div>
              <div>
                <p className="text-sm font-semibold">Week's Most Loved</p>
                <p className="text-xs text-muted-foreground">{weeklyWinner.name} • {weeklyWinner.total_likes} likes</p>
              </div>
            </div>
            <button 
              onClick={() => onLocationClick(weeklyWinner.id)}
              className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-full hover:bg-primary/90 transition-colors"
            >
              View
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (champions.length > 0 && !championsLoading) {
    const topChampion = champions[0];
    return (
      <div className="px-4 py-2">
        <div className="bg-gradient-to-r from-secondary/10 to-secondary/5 rounded-lg p-3 border border-secondary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">⭐</span>
              </div>
              <div>
                <p className="text-sm font-semibold">Community Champion</p>
                <p className="text-xs text-muted-foreground">{topChampion.username} • {topChampion.weekly_likes} likes this week</p>
              </div>
            </div>
            <button 
              onClick={() => onUserClick(topChampion.id)}
              className="text-xs bg-secondary text-secondary-foreground px-3 py-1 rounded-full hover:bg-secondary/90 transition-colors"
            >
              Follow
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show engaging placeholder when no data is available
  return (
    <div className="px-4 py-2">
      <div className="bg-gradient-to-r from-accent/10 to-accent/5 rounded-lg p-3 border border-accent/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">🚀</span>
            </div>
            <div>
              <p className="text-sm font-semibold">Start Your Journey</p>
              <p className="text-xs text-muted-foreground">Be the first to discover amazing places in {currentCity || 'your city'}</p>
            </div>
          </div>
          <button 
            onClick={() => {/* Add location action */}}
            className="text-xs bg-accent text-accent-foreground px-3 py-1 rounded-full hover:bg-accent/90 transition-colors"
          >
            Explore
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommunityHighlights;