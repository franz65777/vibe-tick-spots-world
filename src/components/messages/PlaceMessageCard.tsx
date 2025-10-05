
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, ExternalLink } from 'lucide-react';
import { getCategoryColor } from '@/utils/categoryIcons';

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
  const handleViewPlace = () => {
    onViewPlace(placeData);
  };

  const getPlaceholderGradient = () => {
    const colors = [
      'bg-gradient-to-br from-blue-400 to-blue-600',
      'bg-gradient-to-br from-purple-400 to-purple-600',
      'bg-gradient-to-br from-green-400 to-green-600',
      'bg-gradient-to-br from-orange-400 to-orange-600',
      'bg-gradient-to-br from-pink-400 to-pink-600',
    ];
    const colorIndex = placeData.id.length % colors.length;
    return colors[colorIndex];
  };

  return (
    <Card className="max-w-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={handleViewPlace}>
      <div className="relative">
        {placeData.image ? (
          <div className="aspect-[16/10] overflow-hidden">
            <img
              src={placeData.image}
              alt={placeData.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className={`aspect-[16/10] ${getPlaceholderGradient()} flex items-center justify-center`}>
            <MapPin className="w-8 h-8 text-white/80" />
          </div>
        )}
        
        <div className="absolute top-2 left-2">
          <Badge className={`${getCategoryColor(placeData.category)} bg-white/95 backdrop-blur-sm text-xs px-2 py-1 rounded-md border-0 font-medium shadow-sm`}>
            {placeData.category?.charAt(0).toUpperCase() + placeData.category?.slice(1) || 'Place'}
          </Badge>
        </div>
      </div>

      <CardContent className="p-3">
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
            {placeData.name}
          </h3>
          
          {(placeData.city || placeData.address) && (
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <MapPin className="w-3 h-3 text-gray-400" />
              <span className="truncate">{placeData.city || placeData.address}</span>
            </div>
          )}

          <Button
            size="sm"
            variant="outline"
            className="w-full h-7 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              handleViewPlace();
            }}
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            Open in Search
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlaceMessageCard;
