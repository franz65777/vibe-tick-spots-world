
import React from 'react';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCategoryImage } from '@/utils/categoryIcons';
import CityLabel from '@/components/common/CityLabel';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const categoryImage = getCategoryImage(placeData.category);

  const handleViewLocation = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Navigate to explore with sharedPlace to open modal
    navigate('/explore', { 
      state: { 
        sharedPlace: placeData
      } 
    });
  };

  return (
    <div 
      onClick={handleViewLocation}
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
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
            <img 
              src={categoryImage} 
              alt={placeData.category}
              className="w-10 h-10 object-contain"
            />
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
        
        <div
          className="w-full mt-3 px-4 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer flex items-center justify-center gap-2"
          onClick={handleViewLocation}
        >
          <MapPin className="w-4 h-4 text-primary" />
          <span className="text-[13px] font-semibold text-primary">
            {t('viewLocation', { ns: 'messages' })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PlaceMessageCard;
