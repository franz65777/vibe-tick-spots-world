import React from 'react';
import { useNormalizedCity } from '@/hooks/useNormalizedCity';
import { useTranslation } from 'react-i18next';
import { translateCityName } from '@/utils/cityTranslations';

interface CityLabelProps {
  id?: string;
  city?: string | null;
  name?: string | null;
  coordinates?: { lat?: number; lng?: number } | null;
  address?: string | null;
  className?: string;
}

const CityLabel: React.FC<CityLabelProps> = ({ id, city, name, coordinates, address, className }) => {
  const { cityLabel } = useNormalizedCity({ id, city, name, coordinates, address });
  const { i18n } = useTranslation();
  
  // Show actual city or Unknown City (don't show "Nearby" which is confusing)
  let displayCity = cityLabel && cityLabel !== 'Unknown' ? cityLabel : 'Unknown City';
  
  // Translate the city name if we have a translation
  if (displayCity !== 'Unknown City') {
    displayCity = translateCityName(displayCity, i18n.language);
  }
  
  return <span className={className}>{displayCity}</span>;
};

export default CityLabel;
