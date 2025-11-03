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
    
    // Only translate if reverse translation succeeded (found a mapping)
    // If reverse translation returns the same value, it means no mapping exists
    if (englishName !== displayCity) {
      // Then translate to target language (e.g., "Turin" -> "Torino" if Italian)
      displayCity = translateCityName(englishName, i18n.language);
    } else {
      // If no reverse translation found, check if it's non-Latin script
      const isNonLatin = /[^\u0000-\u007F\u0080-\u00FF\u0100-\u017F\u0180-\u024F]/.test(displayCity);
      if (isNonLatin) {
        // For non-Latin scripts without translation, use a fallback
        displayCity = 'City';
      }
    }
  }
  
  return <span className={className}>{displayCity}</span>;
};

export default CityLabel;
