import { memo } from 'react';
import MapSection from './MapSection';
import { Place } from '@/types/place';

interface HomeMapContainerProps {
  mapCenter: { lat: number; lng: number };
  currentCity: string;
  isExpanded: boolean;
  isSearchOverlayOpen: boolean;
  onToggleExpand: () => void;
  initialSelectedPlace: Place | null;
  onClearInitialPlace: () => void;
  recenterToken: number;
  onCitySelect?: (city: string, coords: { lat: number; lng: number }) => void;
}

const HomeMapContainer = memo((props: HomeMapContainerProps) => {
  const { isExpanded, isSearchOverlayOpen, onCitySelect, ...mapProps } = props;
  
  return (
    <div className={isExpanded ? "fixed inset-0 z-50" : isSearchOverlayOpen ? "hidden" : "w-full h-full"}>
      <MapSection
        mapCenter={mapProps.mapCenter}
        currentCity={mapProps.currentCity}
        isExpanded={isExpanded}
        onToggleExpand={mapProps.onToggleExpand}
        initialSelectedPlace={mapProps.initialSelectedPlace}
        onClearInitialPlace={mapProps.onClearInitialPlace}
        recenterToken={mapProps.recenterToken}
        onCitySelect={onCitySelect}
      />
    </div>
  );
});

HomeMapContainer.displayName = 'HomeMapContainer';

export default HomeMapContainer;
