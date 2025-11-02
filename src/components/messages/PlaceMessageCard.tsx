
import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCategoryIcon, getCategoryColor } from '@/utils/categoryIcons';
import CityLabel from '@/components/common/CityLabel';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const CategoryIconComponent = getCategoryIcon(placeData.category);
  const categoryColor = getCategoryColor(placeData.category);

  return (
    <div 
      onClick={() => onViewPlace(placeData)}
      className="bg-card border border-border rounded-2xl overflow-hidden cursor-pointer hover:bg-accent/30 transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
    >
      {placeData.image && (
        <div className="w-full h-32 overflow-hidden bg-muted">
          <img 
            src={placeData.image} 
            alt={placeData.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <div className="p-3">
        <div className="flex items-start gap-2.5">
          <div className={`w-9 h-9 rounded-xl ${categoryColor.replace('text-', 'bg-').replace('-500', '-100').replace('-600', '-100')} flex items-center justify-center shrink-0`}>
            <CategoryIconComponent className={`w-4 h-4 ${categoryColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-[13px] text-foreground leading-tight mb-1">{placeData.name}</h4>
            {(placeData.city || placeData.address || placeData.coordinates) && (
              <p className="text-[11px] text-muted-foreground truncate">
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
          variant="ghost"
          className="w-full mt-2.5 h-8 text-[12px] font-medium text-primary hover:bg-primary/10"
          onClick={(e) => {
            e.stopPropagation();
            onViewPlace(placeData);
          }}
        >
          <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
          {t('viewLocation', { ns: 'messages' })}
        </Button>
      </div>
    </div>
  );
};

export default PlaceMessageCard;
