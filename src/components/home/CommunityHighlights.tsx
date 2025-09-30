import React from 'react';
import { MapPin, Users, Crown, Sparkles, TrendingUp, Tag } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRecommendedLocations } from '@/hooks/useRecommendedLocations';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface CommunityHighlightsProps {
  currentCity: string;
  userLocation: { lat: number; lng: number } | null;
  topLocation: any;
  onLocationClick: (locationId: string, coordinates?: { lat: number; lng: number }) => void;
  onUserClick: (userId: string) => void;
  onMapLocationClick: (coords: { lat: number; lng: number }) => void;
  onTopLocationClick: () => void;
}

const getBadgeConfig = (badge: string | null) => {
  switch (badge) {
    case 'offer':
      return {
        icon: <Tag className="w-3 h-3" />,
        text: 'OFFERTA',
        className: 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
      };
    case 'popular':
      return {
        icon: <TrendingUp className="w-3 h-3" />,
        text: 'POPOLARE',
        className: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
      };
    case 'recommended':
      return {
        icon: <Sparkles className="w-3 h-3" />,
        text: 'CONSIGLIATO',
        className: 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
      };
    default:
      return null;
  }
};

const CommunityHighlights = ({
  currentCity,
  userLocation,
  topLocation,
  onLocationClick,
  onMapLocationClick,
  onTopLocationClick,
}: CommunityHighlightsProps) => {
  const { user } = useAuth();
  const { locations, loading } = useRecommendedLocations({
    currentCity,
    userId: user?.id,
    limit: 10
  });

  if (loading) {
    return (
      <div className="px-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-900">Scopri</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide">
          {[1, 2, 3].map((i) => (
            <div key={i} className="min-w-[160px] h-48 bg-gray-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Find the highest scored location for "Top Spot"
  const topSpot = topLocation || (locations.length > 0 ? locations[0] : null);

  return (
    <div className="px-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-900">Scopri</h2>
        </div>
        {topSpot && (
          <button
            onClick={onTopLocationClick}
            className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full text-xs font-bold hover:scale-105 transition-transform shadow-md"
          >
            <Crown className="w-3.5 h-3.5" />
            Top Spot
          </button>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2">
        {locations.map((location) => {
          const badgeConfig = getBadgeConfig(location.badge);
          
          return (
            <button
              key={location.id}
              onClick={() => onLocationClick(location.id, {
                lat: location.latitude,
                lng: location.longitude
              })}
              className="min-w-[160px] h-52 relative rounded-2xl overflow-hidden snap-start group cursor-pointer hover:scale-[1.02] transition-transform shadow-lg"
            >
              {/* Image */}
              <div className="absolute inset-0">
                {location.image_url ? (
                  <img
                    src={location.image_url}
                    alt={location.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400" />
                )}
              </div>

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

              {/* Badge */}
              {badgeConfig && (
                <div className="absolute top-2 right-2 z-10">
                  <Badge className={`${badgeConfig.className} flex items-center gap-1 px-2 py-1 text-[10px] font-bold shadow-lg`}>
                    {badgeConfig.icon}
                    {badgeConfig.text}
                  </Badge>
                </div>
              )}

              {/* Friends Saved Indicator */}
              {location.friends_saved > 0 && (
                <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
                  <div className="flex -space-x-1">
                    {location.friend_avatars.slice(0, 3).map((avatar, idx) => (
                      <Avatar key={idx} className="w-5 h-5 border-2 border-white">
                        <AvatarImage src={avatar} />
                        <AvatarFallback className="text-[8px]">F</AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  {location.friends_saved > 3 && (
                    <span className="text-[10px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded-full">
                      +{location.friends_saved - 3}
                    </span>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
                <div className="flex items-start gap-2 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-white mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-sm leading-tight line-clamp-2 mb-1">
                      {location.name}
                    </h3>
                    {location.description && (
                      <p className="text-white/80 text-[11px] leading-tight line-clamp-1">
                        {location.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-white/70 text-[10px]">{location.category}</span>
                      {location.city && (
                        <>
                          <span className="text-white/40 text-[10px]">•</span>
                          <span className="text-white/70 text-[10px]">{location.city}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </button>
          );
        })}

        {locations.length === 0 && !loading && (
          <div className="min-w-[160px] h-52 flex items-center justify-center bg-gray-100 rounded-2xl">
            <div className="text-center px-4">
              <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Nessun luogo trovato</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityHighlights;
