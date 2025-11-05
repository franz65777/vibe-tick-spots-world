import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Place } from '@/types/place';
import PinDetailCard from './explore/PinDetailCard';
import { useGeolocation } from '@/hooks/useGeolocation';
import { createCurrentLocationMarker, createLeafletCustomMarker } from '@/utils/leafletMarkerCreator';
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
  preventCenterUpdate?: boolean;
}

// Vanilla Leaflet implementation to avoid react-leaflet context crash
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
  fullScreen,
  preventCenterUpdate = true, // Default to true to prevent auto-recentering
}: LeafletMapSetupProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const currentLocationMarkerRef = useRef<L.Marker | null>(null);

  const { location } = useGeolocation();
  const { trackEvent } = useAnalytics();
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  // Keep latest handlers in refs to avoid re-initializing map on prop changes
  const onMapRightClickRef = useRef(onMapRightClick);
  const onMapClickRef = useRef(onMapClick);

  useEffect(() => {
    onMapRightClickRef.current = onMapRightClick;
    onMapClickRef.current = onMapClick;
  }, [onMapRightClick, onMapClick]);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [mapCenter.lat, mapCenter.lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: true,
      doubleClickZoom: false,
    });

    mapRef.current = map;

    // Use CartoDB Voyager for colorful parks and water
    const url = isDarkMode
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    const tile = L.tileLayer(url, {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap, &copy; CartoDB',
    });
    tile.addTo(map);
    tileLayerRef.current = tile;

    // Map events (handlers read latest refs)
    map.on('contextmenu', (e: L.LeafletMouseEvent) => {
      onMapRightClickRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
    map.on('click', (e: L.LeafletMouseEvent) => {
      onMapClickRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      tileLayerRef.current = null;
      currentLocationMarkerRef.current = null;
    };
  }, []);

  // Update tile layer on theme change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const url = isDarkMode
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const tile = L.tileLayer(url, {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap, &copy; CartoDB',
    });
    tile.addTo(map);
    tileLayerRef.current = tile;
  }, [isDarkMode]);

  // Update map center only on initial mount, never re-center automatically
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    
    // Only set the initial view
    const isInitialMount = !map.getZoom() || map.getZoom() === 0;
    if (isInitialMount) {
      console.log('🗺️ Initial map setup, centering to:', mapCenter);
      map.setView([mapCenter.lat, mapCenter.lng], 15);
    }
  }, []); // Empty deps - run only once on mount

  // Ensure tiles recalc when toggling fullscreen to avoid white map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Defer to next tick so container size is final
    setTimeout(() => {
      try { map.invalidateSize(); } catch {}
    }, 50);
  }, [fullScreen]);

  // Current location marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (location?.latitude && location?.longitude) {
      console.log('📍 Updating current location marker:', location);
      const icon = createCurrentLocationMarker();
      if (currentLocationMarkerRef.current) {
        currentLocationMarkerRef.current.setLatLng([location.latitude, location.longitude]);
        currentLocationMarkerRef.current.setIcon(icon);
      } else {
        currentLocationMarkerRef.current = L.marker([location.latitude, location.longitude], {
          icon,
          zIndexOffset: 2000,
        }).addTo(map);
      }
    }
  }, [location?.latitude, location?.longitude]);

  // Places markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove markers that no longer exist
    markersRef.current.forEach((marker, id) => {
      if (!places.find((p) => p.id === id)) {
        map.removeLayer(marker);
        markersRef.current.delete(id);
      }
    });

    // Add / update markers
    places.forEach((place) => {
      if (!place.coordinates?.lat || !place.coordinates?.lng) return;

      const icon = createLeafletCustomMarker({
        category: place.category || 'attraction',
        isSaved: place.isSaved,
        isRecommended: place.isRecommended,
        recommendationScore: place.recommendationScore,
        friendAvatars: [],
        isDarkMode,
      });

      let marker = markersRef.current.get(place.id);
      if (!marker) {
        marker = L.marker([place.coordinates.lat, place.coordinates.lng], {
          icon,
        }).addTo(map);
        marker.on('click', () => {
          // Simple bounce animation
          const el = marker!.getElement();
          if (el) {
            el.style.animation = 'bounce 0.7s ease-in-out';
            setTimeout(() => (el.style.animation = ''), 700);
          }
          trackEvent('map_pin_clicked', {
            place_id: place.id,
            category: place.category,
            source_tab: 'map',
          });
          onPinClick?.(place);
        });
        markersRef.current.set(place.id, marker);
      }
      marker.setIcon(icon);
      marker.setLatLng([place.coordinates.lat, place.coordinates.lng]);
    });
  }, [places, isDarkMode, onPinClick, trackEvent]);

  return (
    <>
      <div
        ref={containerRef}
        className={
          fullScreen
            ? 'relative w-full h-full rounded-2xl overflow-hidden bg-background'
            : 'relative w-full min-h-[60vh] rounded-lg overflow-hidden'
        }
        style={{ minHeight: fullScreen ? '100%' : '60vh' }}
      />

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          25% { transform: translateY(-10px); }
          50% { transform: translateY(-5px); }
          75% { transform: translateY(-8px); }
        }
        .leaflet-container { 
          background: ${isDarkMode ? '#1e293b' : '#f8fafc'}; 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .custom-leaflet-icon { background: transparent; border: none; }
        .leaflet-control-attribution { 
          background: rgba(255,255,255,0.9); 
          padding: 4px 8px; 
          font-size: 9px;
          border-radius: 4px;
          margin: 8px;
        }
        .dark .leaflet-control-attribution { 
          background: rgba(0,0,0,0.7); 
          color: rgba(255,255,255,0.8); 
        }
        .leaflet-tile { 
          filter: ${isDarkMode ? 'brightness(0.9) contrast(1.1)' : 'brightness(1.02) contrast(0.98)'}; 
        }
      `}</style>

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
            coordinates: selectedPlace.coordinates,
          }}
          onClose={() => onCloseSelectedPlace?.()}
        />
      )}
    </>
  );
};

export default LeafletMapSetup;
