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
    <section className="px-4 py-2">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Discover</h2>
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
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide scroll-smooth"
        style={{ scrollSnapType: 'x mandatory' }}
        onScroll={handleScroll}
      >
        {/* Top Spot Button - Compact */}
        {topLocation && (
          <button
            onClick={handleTopSpotClick}
            className="flex-shrink-0 snap-center min-w-[90px] h-[95px] rounded-lg bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 p-2 text-white hover:scale-[1.02] transition-transform shadow-xl flex flex-col items-center justify-center relative overflow-hidden group"
            aria-label="View top spot of the week"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-300/20 to-transparent group-hover:from-yellow-300/40 transition-all" />
            <Crown className="w-6 h-6 mb-1 drop-shadow-lg animate-pulse" />
            <span className="text-xs font-bold text-center drop-shadow-lg relative z-10">Top</span>
          </button>
        )}

        {/* Location Cards - Compact */}
        {locations.map((location) => {
          const badgeConfig = getBadgeConfig(location.badge);
          
          return (
            <button
              key={location.id}
              onClick={() => {
                onMapLocationClick({ lat: location.latitude, lng: location.longitude });
                onLocationClick(location.id, { lat: location.latitude, lng: location.longitude });
              }}
              className="flex-shrink-0 snap-center min-w-[113px] h-[95px] rounded-lg overflow-hidden hover:scale-[1.02] transition-transform shadow-lg relative group"
              aria-label={`View ${location.name}`}
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

              {/* Friend Avatars - Compact */}
              {location.friends_saved > 0 && location.friend_avatars.length > 0 && (
                <div className="absolute top-1 left-1 flex items-center z-10">
                  <div className="flex -space-x-1">
                    {location.friend_avatars.slice(0, 2).map((avatar, idx) => (
                      <Avatar key={idx} className="w-5 h-5 border border-white shadow-md">
                        <AvatarImage src={avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white text-[8px]">
                          {idx + 1}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  {location.friends_saved > 2 && (
                    <div className="ml-0.5 bg-white/90 backdrop-blur-sm rounded-full px-1 py-0 text-[8px] font-bold text-gray-900 shadow-md">
                      +{location.friends_saved - 2}
                    </div>
                  )}
                </div>
              )}

              {/* Badge - Compact */}
              {badgeConfig && (
                <div className={`absolute top-1 right-1 ${badgeConfig.className} px-1 py-0.5 rounded-full text-[8px] font-bold flex items-center gap-0.5 shadow-md backdrop-blur-sm z-10`}>
                  <badgeConfig.icon className="w-2 h-2" />
                  {badgeConfig.text}
                </div>
              )}

              {/* Location Info - Compact */}
              <div className="absolute bottom-0 left-0 right-0 p-2 z-10">
                <h3 className="text-white font-bold text-xs mb-0.5 line-clamp-1 drop-shadow-lg">
                  {location.name}
                </h3>
                <div className="flex items-center gap-0.5 text-white/90 text-[9px] mb-1">
                  <MapPin className="w-2 h-2" />
                  <span className="line-clamp-1 drop-shadow">{location.address}</span>
                </div>
                
                {/* Category badge */}
                <div className="inline-flex items-center gap-0.5 bg-white/20 backdrop-blur-md rounded-full px-1.5 py-0.5 text-white text-[8px] font-medium">
                  <span className="capitalize">{location.category}</span>
                </div>
              </div>
            </button>
          );
        })}

        {/* Empty state - Compact */}
        {locations.length === 0 && (
          <div className="w-full h-[95px] flex items-center justify-center text-gray-400 dark:text-gray-500">
            <div className="text-center">
              <MapPin className="w-6 h-6 mx-auto mb-1 opacity-50" />
              <p className="text-xs">No recommendations yet</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default CommunityHighlights;
