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
  return <span className={className}>{cityLabel || 'Unknown'}</span>;
};

export default CityLabel;
