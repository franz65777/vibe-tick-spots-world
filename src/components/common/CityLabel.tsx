import React from 'react';
import { useNormalizedCity } from '@/hooks/useNormalizedCity';
import { useTranslation } from 'react-i18next';
import { translateCityName, reverseTranslateCityName } from '@/utils/cityTranslations';

interface CityLabelProps {
  id?: string;
  city?: string | null;
  name?: string | null;
  coordinates?: { lat?: number; lng?: number } | null;
  address?: string | null;
  className?: string;
}

const CityLabel: React.FC<CityLabelProps> = ({ id, city, name, coordinates, address, className }) => {
  const { i18n } = useTranslation();
  const { cityLabel } = useNormalizedCity({ id, city, name, coordinates, address });
  
  // Normalize city name: reverse translate to English first, then translate to target language
  let displayCity = cityLabel && cityLabel !== 'Unknown' ? cityLabel : 'Unknown City';
  
  if (displayCity !== 'Unknown City') {
    // First, reverse translate to get English base name (e.g., "Torino" -> "Turin")
    const englishName = reverseTranslateCityName(displayCity);
    // Then translate to target language (e.g., "Turin" -> "Torino" if Italian)
    displayCity = translateCityName(englishName, i18n.language);
  }
  
  return <span className={className}>{displayCity}</span>;
};

export default CityLabel;
