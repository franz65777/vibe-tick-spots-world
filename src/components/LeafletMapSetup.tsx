import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Place } from '@/types/place';
import PinDetailCard from './explore/PinDetailCard';
import { useGeolocation } from '@/hooks/useGeolocation';
import { createLeafletCustomMarker, createCurrentLocationMarker } from '@/utils/leafletMarkerCreator';
import { useAnalytics } from '@/hooks/useAnalytics';

interface LeafletMapSetupProps {
  places: Place[];
  onPinClick?: (place: Place) => void;
  onPinShare?: (place: Place) => void;
  mapCenter: { lat: number; lng: number };
  selectedPlace?: Place | null;
  onCloseSelectedPlace?: () => void;
  onMapRightClick?: (coords: { lat: number; lng: number }) => void;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
  activeFilter?: string;
  fullScreen?: boolean;
}

// Component to handle map events
const MapEventHandler = ({ 
  onMapRightClick, 
  onMapClick 
}: { 
  onMapRightClick?: (coords: { lat: number; lng: number }) => void;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
}) => {
  useMapEvents({
    contextmenu: (e) => {
      onMapRightClick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
    click: (e) => {
      onMapClick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
};

// Component to update map center
const MapCenterUpdater = ({ center }: { center: { lat: number; lng: number } }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView([center.lat, center.lng], 13);
  }, [center.lat, center.lng, map]);
  
  return null;
};

// Component for dark mode tile layer
const DarkModeTileLayer = ({ isDarkMode }: { isDarkMode: boolean }) => {
  return (
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      url={isDarkMode 
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      }
      maxZoom={19}
    />
  );
};

const LeafletMapSetup = ({
  places,
  onPinClick,
  onPinShare,
  mapCenter,
  selectedPlace,
  onCloseSelectedPlace,
  onMapRightClick,
  onMapClick,
  activeFilter,
  fullScreen
}: LeafletMapSetupProps) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { location } = useGeolocation();
  const { trackEvent } = useAnalytics();
  const markerRefs = useRef<Map<string, L.Marker>>(new Map());

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  // Handle marker bounce animation
  const bounceMarker = (placeId: string) => {
    const marker = markerRefs.current.get(placeId);
    if (marker) {
      const element = marker.getElement();
      if (element) {
        element.style.animation = 'bounce 0.7s ease-in-out';
        setTimeout(() => {
          element.style.animation = '';
        }, 700);
      }
    }
  };

  const handleMarkerClick = (place: Place) => {
    bounceMarker(place.id);
    
    trackEvent('map_pin_clicked', {
      place_id: place.id,
      category: place.category,
      source_tab: 'map',
    });
    
    onPinClick?.(place);
  };

  return (
    <>
      <div className={fullScreen ? 'relative w-full h-full rounded-2xl overflow-hidden bg-background' : 'relative w-full min-h-[60vh] rounded-lg overflow-hidden'}>
        <MapContainer
          center={[mapCenter.lat, mapCenter.lng]}
          zoom={13}
          style={{ height: '100%', width: '100%', minHeight: fullScreen ? '100%' : '60vh' }}
          zoomControl={false}
          attributionControl={true}
        >
          <DarkModeTileLayer isDarkMode={isDarkMode} />
          <MapEventHandler 
            onMapRightClick={onMapRightClick}
            onMapClick={onMapClick}
          />
          <MapCenterUpdater center={mapCenter} />

          {/* Current location marker */}
          {location?.latitude && location?.longitude && (
            <Marker
              position={[location.latitude, location.longitude]}
              icon={createCurrentLocationMarker()}
              zIndexOffset={2000}
            />
          )}

          {/* Place markers */}
          {places.map((place) => {
            if (!place.coordinates?.lat || !place.coordinates?.lng) return null;

            const icon = createLeafletCustomMarker({
              category: place.category || 'attraction',
              isSaved: place.isSaved,
              isRecommended: place.isRecommended,
              recommendationScore: place.recommendationScore,
              friendAvatars: [],
              isDarkMode,
            });

            return (
              <Marker
                key={place.id}
                position={[place.coordinates.lat, place.coordinates.lng]}
                icon={icon}
                eventHandlers={{
                  click: () => handleMarkerClick(place),
                }}
                ref={(ref) => {
                  if (ref) {
                    markerRefs.current.set(place.id, ref);
                  }
                }}
              />
            );
          })}
        </MapContainer>

        <style>{`
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            25% { transform: translateY(-10px); }
            50% { transform: translateY(-5px); }
            75% { transform: translateY(-8px); }
          }
          
          .leaflet-container {
            background: ${isDarkMode ? '#1a1a1a' : '#f0f0f0'};
          }
          
          .custom-leaflet-icon {
            background: transparent;
            border: none;
          }
          
          .leaflet-control-attribution {
            background: rgba(255, 255, 255, 0.8);
            padding: 2px 5px;
            font-size: 10px;
          }
          
          .dark .leaflet-control-attribution {
            background: rgba(0, 0, 0, 0.8);
            color: white;
          }
        `}</style>
      </div>

      {/* Location detail card */}
      {selectedPlace && (
        <PinDetailCard
          place={{
            id: selectedPlace.id,
            name: selectedPlace.name,
            category: selectedPlace.category,
            address: selectedPlace.address,
            city: selectedPlace.city,
            google_place_id: selectedPlace.google_place_id,
            coordinates: selectedPlace.coordinates
          }}
          onClose={() => onCloseSelectedPlace?.()}
        />
      )}
    </>
  );
};

export default LeafletMapSetup;
