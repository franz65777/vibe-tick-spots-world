import React from 'react';
import PopularSpots from './PopularSpots';

interface CommunityHighlightsProps {
  currentCity?: string;
  userLocation: { lat: number; lng: number } | null;
  onLocationClick: (locationId: string, coordinates?: { lat: number; lng: number }) => void;
  onUserClick: (userId: string) => void;
  onMapLocationClick: (coords: { lat: number; lng: number }) => void;
  onSwipeDiscoveryOpen?: () => void;
  onSpotSelect?: (spot: any) => void;
}

const CommunityHighlights: React.FC<CommunityHighlightsProps> = ({
  currentCity,
  userLocation,
  onLocationClick,
  onUserClick,
  onMapLocationClick,
  onSwipeDiscoveryOpen,
  onSpotSelect,
}) => {
  return (
    <div className="h-full">
      <PopularSpots
        currentCity={currentCity}
        onLocationClick={onMapLocationClick}
        onSwipeDiscoveryOpen={onSwipeDiscoveryOpen}
        onSpotSelect={onSpotSelect}
      />
    </div>
  );
};

export default CommunityHighlights;
