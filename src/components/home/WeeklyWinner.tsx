import React from 'react';
import { Crown, MapPin, Heart, Bookmark, TrendingUp, Star } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

interface WeeklyWinnerProps {
  location: {
    id: string;
    name: string;
    category: string;
    address?: string;
    image_url?: string;
    total_likes: number;
    total_saves: number;
    total_score: number;
  } | null;
  onLocationClick: (locationId: string) => void;
}

const WeeklyWinner = ({ location, onLocationClick }: WeeklyWinnerProps) => {
  const { t } = useTranslation();
  
  if (!location) {
    return (
      <Card className="relative overflow-hidden bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <div className="p-6 text-center">
          <Crown className="w-8 h-8 text-amber-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">{t('weeklyWinner', { ns: 'home' })}</h3>
          <p className="text-gray-600">{t('noTrendingLocations', { ns: 'home' })}</p>
          <p className="text-sm text-gray-500 mt-1">{t('beFirstToDiscover', { ns: 'home' })}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className="relative overflow-hidden bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
      onClick={() => onLocationClick(location.id)}
    >
      {/* Crown Badge */}
      <div className="absolute top-3 left-3 z-10">
        <div className="bg-amber-500 text-white rounded-full p-2 shadow-lg">
          <Crown className="w-4 h-4" />
        </div>
      </div>

      {/* Trending Badge */}
      <div className="absolute top-3 right-3 z-10">
        <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 shadow-sm">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-amber-600" />
            <span className="text-xs font-semibold text-amber-700">#{location.total_score} pts</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 p-6">
        {/* Location Image */}
        <div className="relative">
          {location.image_url ? (
            <img 
              src={location.image_url}
              alt={location.name}
              className="w-16 h-16 rounded-xl object-cover shadow-md"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-200 to-orange-300 flex items-center justify-center shadow-md">
              <MapPin className="w-8 h-8 text-amber-700" />
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-1">
            <Star className="w-3 h-3 fill-current" />
          </div>
        </div>

        {/* Location Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-gray-900 truncate">🏆 {location.name}</h3>
          </div>
          
          <p className="text-sm text-gray-600 capitalize mb-2">{location.category}</p>
          
          {location.address && (
            <p className="text-xs text-gray-500 truncate mb-3">{location.address}</p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4 text-red-500 fill-current" />
              <span className="text-sm font-semibold text-gray-700">{location.total_likes}</span>
            </div>
            <div className="flex items-center gap-1">
              <Bookmark className="w-4 h-4 text-blue-500 fill-current" />
              <span className="text-sm font-semibold text-gray-700">{location.total_saves}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Banner */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">🔥 This Week's Hottest Spot</span>
          <span className="text-xs opacity-90">Tap to explore →</span>
        </div>
      </div>
    </Card>
  );
};

export default WeeklyWinner;