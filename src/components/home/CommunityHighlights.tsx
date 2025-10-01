import React, { useState } from 'react';
import { useRecommendedLocations } from '@/hooks/useRecommendedLocations';
import { MapPin, TrendingUp, Tag, Flame, Sparkles, Crown, Filter } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';

interface CommunityHighlightsProps {
  currentCity?: string;
  userLocation: { lat: number; lng: number } | null;
  onLocationClick: (locationId: string, coordinates?: { lat: number; lng: number }) => void;
  onUserClick: (userId: string) => void;
  onMapLocationClick: (coords: { lat: number; lng: number }) => void;
}

const categories = [
  { value: null, label: 'All' },
  { value: 'restaurant', label: 'Restaurants' },
  { value: 'bar', label: 'Bars' },
  { value: 'cafe', label: 'Cafés' },
  { value: 'hotel', label: 'Hotels' },
  { value: 'museum', label: 'Museums' },
  { value: 'shopping', label: 'Shopping' },
];

const getBadgeConfig = (badge: string | null) => {
  switch (badge) {
    case 'offer':
      return { icon: Tag, text: 'Offer', className: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' };
    case 'trending':
      return { icon: Flame, text: 'Trending', className: 'bg-gradient-to-r from-orange-500 to-red-500 text-white' };
    case 'popular':
      return { icon: TrendingUp, text: 'Popular', className: 'bg-gradient-to-r from-red-500 to-pink-500 text-white' };
    case 'recommended':
      return { icon: Sparkles, text: 'For You', className: 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' };
    default:
      return null;
  }
};

const CommunityHighlights: React.FC<CommunityHighlightsProps> = ({
  currentCity,
  userLocation,
  onLocationClick,
  onUserClick,
  onMapLocationClick,
}) => {
  const { user } = useAuth();
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const { locations, loading } = useRecommendedLocations({
    currentCity,
    userId: user?.id,
    limit: 10,
    categoryFilter
  });

  const [scrollPosition, setScrollPosition] = useState(0);

  // Derive top location from highest scored location
  const topLocation = locations.length > 0 ? locations[0] : null;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollPercentage = (container.scrollLeft / (container.scrollWidth - container.clientWidth)) * 100;
    setScrollPosition(scrollPercentage);
  };

  const handleTopSpotClick = () => {
    if (topLocation) {
      onMapLocationClick({
        lat: topLocation.latitude,
        lng: topLocation.longitude
      });
      onLocationClick(topLocation.id, {
        lat: topLocation.latitude,
        lng: topLocation.longitude
      });
    }
  };

  if (loading) {
    return (
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Discover
          </h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex-shrink-0 min-w-[180px]">
              <Skeleton className="h-56 w-full rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Discover
        </h2>
        <div className="flex items-center gap-2">
          {/* Category Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="h-8 gap-1.5"
              >
                <Filter className="w-3.5 h-3.5" />
                <span className="text-xs">
                  {categories.find(c => c.value === categoryFilter)?.label || 'All'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {categories.map((category) => (
                <DropdownMenuItem
                  key={category.value || 'all'}
                  onClick={() => setCategoryFilter(category.value)}
                  className={categoryFilter === category.value ? 'bg-accent' : ''}
                >
                  {category.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Progress Dots - Larger and more visible */}
          {locations.length > 0 && (
            <div className="flex items-center gap-1.5">
              {[...Array(Math.min(10, locations.length))].map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    (scrollPosition / 100) * locations.length > i 
                      ? 'w-8 bg-gradient-to-r from-purple-500 to-pink-500 shadow-md' 
                      : 'w-2 bg-gray-300'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div 
        className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide scroll-smooth"
        style={{ scrollSnapType: 'x mandatory' }}
        onScroll={handleScroll}
      >
        {/* Top Spot Button */}
        {topLocation && (
          <button
            onClick={handleTopSpotClick}
            className="flex-shrink-0 snap-center min-w-[170px] h-[190px] rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 p-3 text-white hover:scale-[1.02] transition-transform shadow-xl flex flex-col items-center justify-center relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-300/20 to-transparent group-hover:from-yellow-300/40 transition-all" />
            <Crown className="w-10 h-10 mb-2 drop-shadow-lg animate-pulse" />
            <span className="text-base font-bold text-center drop-shadow-lg relative z-10">Top Spot</span>
            <span className="text-xs font-medium mt-1 opacity-90 relative z-10">Tap to explore</span>
          </button>
        )}

        {/* Location Cards */}
        {locations.map((location) => {
          const badgeConfig = getBadgeConfig(location.badge);
          
          return (
            <button
              key={location.id}
              onClick={() => {
                onMapLocationClick({ lat: location.latitude, lng: location.longitude });
                onLocationClick(location.id, { lat: location.latitude, lng: location.longitude });
              }}
              className="flex-shrink-0 snap-center min-w-[170px] h-[190px] rounded-2xl overflow-hidden hover:scale-[1.02] transition-transform shadow-lg relative group"
            >
              {/* Image with gradient overlay */}
              <div className="absolute inset-0">
                {location.image_url ? (
                  <img 
                    src={location.image_url} 
                    alt={location.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              </div>

              {/* Friend Avatars - Top Left */}
              {location.friends_saved > 0 && location.friend_avatars.length > 0 && (
                <div className="absolute top-3 left-3 flex items-center z-10">
                  <div className="flex -space-x-2">
                    {location.friend_avatars.slice(0, 3).map((avatar, idx) => (
                      <Avatar key={idx} className="w-8 h-8 border-2 border-white shadow-lg">
                        <AvatarImage src={avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white text-xs">
                          {idx + 1}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  {location.friends_saved > 3 && (
                    <div className="ml-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs font-bold text-gray-900 shadow-lg">
                      +{location.friends_saved - 3}
                    </div>
                  )}
                </div>
              )}

              {/* Badge - Top Right */}
              {badgeConfig && (
                <div className={`absolute top-3 right-3 ${badgeConfig.className} px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg backdrop-blur-sm z-10`}>
                  <badgeConfig.icon className="w-3 h-3" />
                  {badgeConfig.text}
                </div>
              )}

              {/* Location Info - Bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                <h3 className="text-white font-bold text-base mb-1 line-clamp-1 drop-shadow-lg">
                  {location.name}
                </h3>
                <div className="flex items-center gap-1 text-white/90 text-xs mb-2">
                  <MapPin className="w-3 h-3" />
                  <span className="line-clamp-1 drop-shadow">{location.address}</span>
                </div>
                
                {/* Category badge with icon */}
                <div className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-md rounded-full px-2 py-1 text-white text-xs font-medium">
                  <span className="capitalize">{location.category}</span>
                </div>
              </div>
            </button>
          );
        })}

        {/* Empty state */}
        {locations.length === 0 && (
          <div className="w-full h-[190px] flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MapPin className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recommendations yet</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityHighlights;
