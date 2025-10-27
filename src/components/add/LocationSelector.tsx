import React, { useState } from 'react';
import { MapPin, AlertCircle } from 'lucide-react';
import OpenStreetMapAutocomplete from '@/components/OpenStreetMapAutocomplete';
import { useTranslation } from 'react-i18next';
// Category selection removed per latest UX

interface LocationSelectorProps {
  selectedLocation: any;
  onLocationSelect: (location: any) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  selectedLocation,
  onLocationSelect,
  selectedCategory,
  onCategoryChange
}) => {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-foreground">
        <MapPin className="w-5 h-5 text-destructive" />
        <h3 className="font-semibold">{t('add.addLocation')}</h3>
        <span className="text-xs text-destructive">{t('common.required')}</span>
      </div>

      {!selectedLocation ? (
        <div className="space-y-3">
          <OpenStreetMapAutocomplete
            onPlaceSelect={onLocationSelect}
            placeholder={t('add.searchForPlace')}
            className="w-full"
          />
          <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              {t('add.youMustTagLocation')}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="p-4 bg-primary/10 rounded-xl space-y-2">
            <div>
              <p className="font-semibold text-foreground">{selectedLocation.name}</p>
              <p className="text-sm text-muted-foreground">{selectedLocation.formatted_address || selectedLocation.address}</p>
            </div>
            <button
              onClick={() => {
                onLocationSelect(null);
                onCategoryChange('');
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('add.changeLocation')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
