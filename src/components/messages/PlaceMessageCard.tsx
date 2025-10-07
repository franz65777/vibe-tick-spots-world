
import React from 'react';
import { MapPin, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCategoryIcon, getCategoryColor } from '@/utils/categoryIcons';
import CityLabel from '@/components/common/CityLabel';

interface PlaceMessageCardProps {
  placeData: {
    id?: string;
    place_id?: string;
    name: string;
    category: string;
    address?: string;
    city?: string;
    image?: string;
    coordinates?: { lat: number; lng: number };
    google_place_id?: string;
  };
  onViewPlace: (place: any) => void;
}

const PlaceMessageCard = ({ placeData, onViewPlace }: PlaceMessageCardProps) => {
  const CategoryIconComponent = getCategoryIcon(placeData.category);
  const categoryColor = getCategoryColor(placeData.category);

  return (
    <div 
      onClick={() => onViewPlace(placeData)}
      className="bg-background/80 backdrop-blur-sm border rounded-lg p-3 cursor-pointer hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${categoryColor.replace('text-', 'bg-').replace('-500', '-100').replace('-600', '-100')} flex items-center justify-center shrink-0`}>
          <CategoryIconComponent className={`w-5 h-5 ${categoryColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-foreground truncate">{placeData.name}</h4>
          {(placeData.city || placeData.address || placeData.coordinates) && (
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <CityLabel 
                id={placeData.google_place_id || placeData.id}
                city={placeData.city}
                address={placeData.address}
                coordinates={placeData.coordinates}
              />
            </p>
          )}
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="w-full mt-2 h-8 text-xs"
        onClick={(e) => {
          e.stopPropagation();
          onViewPlace(placeData);
        }}
      >
        <ExternalLink className="w-3 h-3 mr-1" />
        Open in Search
      </Button>
    </div>
  );
};

export default PlaceMessageCard;
