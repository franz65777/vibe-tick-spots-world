import React from 'react';
import { Star } from 'lucide-react';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import CityLabel from '@/components/common/CityLabel';
import { useLocationStats } from '@/hooks/useLocationStats';
import { getCategoryIcon } from '@/utils/categoryIcons';
import { getRatingColor, getRatingFillColor } from '@/utils/ratingColors';
import { cn } from '@/lib/utils';
import { useLocationShares } from '@/hooks/useLocationShares';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface MinimalLocationCardProps {
  place: {
    id: string;
    name: string;
    category: string;
    city: string;
    address?: string;
    google_place_id?: string;
    coordinates?: {
      lat?: number;
      lng?: number;
    };
    savedCount?: number;
    postsCount?: number;
  };
  onCardClick: () => void;
}
const MinimalLocationCard = ({
  place,
  onCardClick
}: MinimalLocationCardProps) => {
  const { stats } = useLocationStats(place.id, place.google_place_id);
  const { shares } = useLocationShares();
  const { user } = useAuth();

  // Get active shares for this location (excluding current user)
  const now = new Date();
  const activeSharesHere = shares.filter(s => {
    // Exclude current user's share
    if (user && s.user_id === user.id) return false;
    // Only active non-expired shares
    try {
      if (new Date(s.expires_at) <= now) return false;
    } catch {
      return false;
    }
    // Match by location_id or proximity
    if (s.location_id && place.id && s.location_id === place.id) return true;
    if (place.coordinates?.lat && place.coordinates?.lng) {
      const latDiff = Math.abs(parseFloat(s.latitude.toString()) - place.coordinates.lat);
      const lngDiff = Math.abs(parseFloat(s.longitude.toString()) - place.coordinates.lng);
      return latDiff < 0.003 && lngDiff < 0.003;
    }
    return false;
  });

  return <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
      <div className="p-3 cursor-pointer" onClick={onCardClick}>
      <div className="flex items-center gap-3">
        <div className="shrink-0 bg-gray-50 rounded-xl p-1.5">
          <CategoryIcon category={place.category} className="w-8 h-8" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-bold text-gray-900 text-sm truncate text-left">
              {place.name}
            </h3>
            {activeSharesHere.length > 0 && (
              <div className="flex -space-x-0.5 shrink-0">
                {activeSharesHere.slice(0, 2).map((share) => (
                  <Avatar key={share.id} className="w-4 h-4 border border-white ring-1 ring-purple-500">
                    <AvatarImage src={share.user.avatar_url || undefined} />
                    <AvatarFallback className="text-[6px] bg-purple-500 text-white">
                      {share.user.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {activeSharesHere.length > 2 && (
                  <div className="w-4 h-4 rounded-full bg-purple-500 text-white text-[6px] font-bold flex items-center justify-center border border-white">
                    +
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <div className="truncate">
              <CityLabel
                id={place.google_place_id || place.id}
                city={place.city}
                name={place.name}
                address={place.address}
                coordinates={place.coordinates}
              />
            </div>
            {stats.averageRating && (
              <div className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-full shrink-0", getRatingFillColor(stats.averageRating) + "/10")}>
                {(() => {
                  const CategoryIcon = place.category ? getCategoryIcon(place.category) : Star;
                  return <CategoryIcon className={cn("w-2.5 h-2.5", getRatingFillColor(stats.averageRating), getRatingColor(stats.averageRating))} />;
                })()}
                <span className={cn("text-xs font-semibold", getRatingColor(stats.averageRating))}>{stats.averageRating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>;
};
export default MinimalLocationCard;