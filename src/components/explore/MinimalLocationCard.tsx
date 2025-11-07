import React from 'react';
import { Star } from 'lucide-react';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import CityLabel from '@/components/common/CityLabel';
import { useLocationStats } from '@/hooks/useLocationStats';
import { getCategoryIcon } from '@/utils/categoryIcons';
import { getRatingColor, getRatingFillColor } from '@/utils/ratingColors';
import { cn } from '@/lib/utils';
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

  return <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
      <div className="p-3 cursor-pointer" onClick={onCardClick}>
      <div className="flex items-center gap-3">
        <div className="shrink-0 bg-gray-50 rounded-xl p-1.5">
          <CategoryIcon category={place.category} className="w-8 h-8" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-sm truncate mb-0.5 text-left">
            {place.name}
          </h3>
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