import React from 'react';
import { Star } from 'lucide-react';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import CityLabel from '@/components/common/CityLabel';
import { useLocationStats } from '@/hooks/useLocationStats';
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

  return <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all duration-200" onClick={onCardClick}>
      <div className="flex items-center gap-3">
        <div className="shrink-0 bg-gray-50 rounded-xl p-1.5">
          <CategoryIcon category={place.category} className="w-8 h-8" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-sm truncate mb-0.5">
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
              <div className="flex items-center gap-1 bg-yellow-50 px-1.5 py-0.5 rounded-full shrink-0">
                <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                <span className="text-xs font-semibold text-yellow-700">{stats.averageRating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>;
};
export default MinimalLocationCard;