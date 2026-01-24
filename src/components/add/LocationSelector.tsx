import React, { memo, useCallback } from 'react';
import { MapPin, AlertCircle } from 'lucide-react';
import OpenStreetMapAutocomplete from '@/components/OpenStreetMapAutocomplete';
import { useTranslation } from 'react-i18next';

interface LocationSelectorProps {
  selectedLocation: any;
  onLocationSelect: (location: any) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  disabled?: boolean;
}

export const LocationSelector = memo(({
  selectedLocation,
  onLocationSelect,
  selectedCategory,
  onCategoryChange,
  disabled = false
}: LocationSelectorProps) => {
  const { t } = useTranslation();
  
  const handleClearLocation = useCallback(() => {
    onLocationSelect(null);
    onCategoryChange('');
  }, [onLocationSelect, onCategoryChange]);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-foreground">
        <MapPin className="w-5 h-5 text-destructive" />
        <h3 className="font-semibold">{t('addLocation', { ns: 'add' })}</h3>
        <span className="text-xs text-destructive">{t('required', { ns: 'common' })}</span>
      </div>

      {!selectedLocation ? (
        <div className="space-y-3">
          <OpenStreetMapAutocomplete
            onPlaceSelect={onLocationSelect}
            placeholder={t('searchForPlace', { ns: 'add' })}
            className="w-full"
          />
          <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              {t('youMustTagLocation', { ns: 'add' })}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="p-4 bg-primary/10 border-2 border-primary/20 rounded-xl">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-primary shrink-0 mt-1" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{selectedLocation.name}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {selectedLocation.city ? `${selectedLocation.city}, ` : ''}
                  {selectedLocation.formatted_address || selectedLocation.address}
                </p>
              </div>
              <button
                onClick={handleClearLocation}
                className="text-sm text-primary hover:text-primary/80 transition-colors font-medium shrink-0"
              >
                {t('changeLocation', { ns: 'add' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

LocationSelector.displayName = 'LocationSelector';
