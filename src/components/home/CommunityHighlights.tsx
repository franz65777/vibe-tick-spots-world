import React from 'react';
import { MapPin, Heart, Users, Star, Crown, Sparkles, TrendingUp } from 'lucide-react';
import { useNearbyLocations } from '@/hooks/useNearbyLocations';
import { cn } from '@/lib/utils';

interface CommunityHighlightsProps {
  currentCity: string;
  userLocation: { lat: number; lng: number } | null;
  topLocation?: any;
  onLocationClick: (locationId: string, coordinates?: { lat: number; lng: number }) => void;
  onUserClick: (userId: string) => void;
  onMapLocationClick: (coordinates: { lat: number; lng: number }) => void;
  onTopLocationClick?: () => void;
}

// Mock data for nearby featured locations - in real app this would come from API
const getMockFeaturedLocations = (city: string) => [
  {
    id: '1',
    name: 'Artisan Coffee Co.',
    type: 'business_offer',
    description: '20% off this week',
    image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=80&h=80&fit=crop&crop=center',
    stats: { saves: 12, followers: 8 },
    badge: '20% OFF'
  },
  {
    id: '2', 
    name: 'Central Park',
    type: 'popular',
    description: 'Saved by 15 people you follow',
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=80&h=80&fit=crop&crop=center',
    stats: { saves: 15, followers: 15 },
    badge: 'Popular'
  },
  {
    id: '3',
    name: 'Luna Rooftop',
    type: 'weekly_winner',
    description: 'This week\'s most loved spot',
    image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=80&h=80&fit=crop&crop=center',
    stats: { saves: 24, followers: 10 },
    badge: 'Featured'
  }
];

const CommunityHighlights = ({ 
  currentCity, 
  userLocation,
  topLocation,
  onLocationClick, 
  onUserClick, 
  onMapLocationClick,
  onTopLocationClick
}: CommunityHighlightsProps) => {
  // Use the mock data for now
  const locations = getMockFeaturedLocations(currentCity);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-5 px-4 text-center">
        <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 bg-clip-text text-transparent mb-2">
          Discover {currentCity}
        </h2>
        <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mx-auto"></div>
      </div>

      {/* Cards */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide px-4 snap-x snap-mandatory">
        {/* Top Location Card */}
        {topLocation && (
          <div 
            className="min-w-[200px] max-w-[200px] bg-white/95 backdrop-blur-xl rounded-xl border-2 border-yellow-200 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group snap-start"
            onClick={onTopLocationClick}
          >
            <div className="relative h-32 overflow-hidden">
              <img
                src={topLocation.image || 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=250&fit=crop'}
                alt={topLocation.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <div className="absolute top-2 right-2">
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-1 rounded-full text-[9px] font-bold flex items-center gap-1 shadow-lg">
                  <Crown className="w-3 h-3" />
                  Top Spot
                </div>
              </div>
              <div className="absolute bottom-2 left-2 right-2">
                <h3 className="text-white text-sm font-bold mb-1 drop-shadow-lg truncate">
                  {topLocation.name}
                </h3>
                <div className="flex items-center gap-2 text-white/90 text-[10px]">
                  <div className="flex items-center gap-0.5">
                    <Heart className="w-3 h-3" />
                    <span>{topLocation.likes || 0}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{topLocation.city || currentCity}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Regular Location Cards */}
        {locations.map((location) => (
          <div 
            key={location.id}
            className="min-w-[130px] max-w-[130px] bg-white/95 backdrop-blur-xl rounded-xl border border-gray-100 overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer group snap-start"
            onClick={() => onLocationClick(location.id)}
          >
            <div className="relative">
              {/* Premium Gradient Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/10"></div>
              
              <div className="relative p-3">
                {/* Image */}
                <div className="relative w-full h-20 overflow-hidden rounded-lg bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 shadow-sm mb-2.5">
                  <img
                    src={location.image}
                    alt={location.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>

                {/* Details */}
                <h3 className="font-bold text-sm text-gray-900 truncate group-hover:text-blue-600 transition-colors mb-2">
                  {location.name}
                </h3>

                {/* Footer */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-xs font-medium text-gray-600">{location.stats.saves}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-xs font-medium text-gray-600">{location.stats.followers}</span>
                  </div>
                  {location.badge && (
                    <div className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 shadow-sm",
                      location.type === 'business_offer' && "bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 border border-emerald-200",
                      location.type === 'popular' && "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border border-blue-200", 
                      location.type === 'weekly_winner' && "bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border border-purple-200"
                    )}>
                      {location.badge}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommunityHighlights;