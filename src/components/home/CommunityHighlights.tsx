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

  // Show a compact single row with the most engaging content
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

  // Show top community champion if no weekly winner
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

  return null; // Don't show anything if no data
};

export default CommunityHighlights;