import { memo } from 'react';
import CommunityHighlights from './CommunityHighlights';

interface HomeDiscoverSectionProps {
  currentCity: string;
  userLocation: { lat: number; lng: number } | null;
  onLocationClick: (locationId: string, coordinates?: { lat: number; lng: number }) => void;
  onUserClick: (userId: string) => void;
  onMapLocationClick: (coords: { lat: number; lng: number }) => void;
  onSwipeDiscoveryOpen: () => void;
  onSpotSelect: (spot: any) => void;
  onCitySelect?: (city: string) => void;
}

const HomeDiscoverSection = memo((props: HomeDiscoverSectionProps) => {
  return (
    <div className="h-[110px] flex-shrink-0 relative z-20">
      <CommunityHighlights {...props} />
    </div>
  );
});

HomeDiscoverSection.displayName = 'HomeDiscoverSection';

export default HomeDiscoverSection;
