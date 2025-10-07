import React from 'react';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import CityLabel from '@/components/common/CityLabel';
interface MinimalLocationCardProps {
  place: {
    id: string;
    name: string;
    category: string;
    city: string;
    address?: string;
    google_place_id?: string;
    coordinates?: {
      lat: number;
      lng: number;
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
  return <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all duration-200" onClick={onCardClick}>
      <div className="flex items-center gap-3">
        <div className="shrink-0">
          <CategoryIcon category={place.category} className="w-12 h-12" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-sm truncate mb-0.5">
            {place.name}
          </h3>
          <div className="text-xs text-muted-foreground truncate">
            <CityLabel 
              id={place.google_place_id || place.id}
              city={place.city}
              address={place.address}
              coordinates={place.coordinates}
            />
          </div>
        </div>
      </div>
    </div>;
};
export default MinimalLocationCard;