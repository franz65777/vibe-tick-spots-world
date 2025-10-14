import React from 'react';
import { useNormalizedCity } from '@/hooks/useNormalizedCity';

interface CityLabelProps {
  id?: string;
  city?: string | null;
  coordinates?: { lat?: number; lng?: number } | null;
  address?: string | null;
  className?: string;
}

const CityLabel: React.FC<CityLabelProps> = ({ id, city, coordinates, address, className }) => {
  const { cityLabel } = useNormalizedCity({ id, city, coordinates, address });
  
  // Show actual city or Unknown City (don't show "Nearby" which is confusing)
  const displayCity = cityLabel && cityLabel !== 'Unknown' ? cityLabel : 'Unknown City';
  
  return <span className={className}>{displayCity}</span>;
};

export default CityLabel;
