
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { loadGoogleMapsAPI } from '@/lib/googleMaps';
import { Place } from '@/types/place';
import LocationDetailSheet from './LocationDetailSheet';

interface GoogleMapsSetupProps {
  places: Place[];
  onPinClick?: (place: Place) => void;
  mapCenter: { lat: number; lng: number };
  selectedPlace?: Place | null;
  onCloseSelectedPlace?: () => void;
  onMapRightClick?: (coords: { lat: number; lng: number }) => void;
}

const GoogleMapsSetup = ({ 
  places, 
  onPinClick, 
  mapCenter, 
  selectedPlace,
  onCloseSelectedPlace,
  onMapRightClick 
}: GoogleMapsSetupProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedLocationName, setSelectedLocationName] = useState<string>('');
  const [selectedLocationAddress, setSelectedLocationAddress] = useState<string>('');

  // Initialize map
  useEffect(() => {
    const initMap = async () => {
      try {
        await loadGoogleMapsAPI();
        
        if (!mapRef.current) return;

        const map = new google.maps.Map(mapRef.current, {
          center: mapCenter,
          zoom: 13,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ],
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        mapInstanceRef.current = map;

        // Add right-click listener for adding new locations
        if (onMapRightClick) {
          map.addListener('rightclick', (event: google.maps.MapMouseEvent) => {
            if (event.latLng) {
              onMapRightClick({
                lat: event.latLng.lat(),
                lng: event.latLng.lng()
              });
            }
          });
        }

        setIsLoaded(true);
      } catch (error) {
        console.error('Error initializing Google Maps:', error);
      }
    };

    initMap();
  }, []);

  // Update map center when it changes
  useEffect(() => {
    if (mapInstanceRef.current && isLoaded) {
      console.log('Updating map center to:', mapCenter);
      mapInstanceRef.current.setCenter(mapCenter);
      mapInstanceRef.current.setZoom(13);
    }
  }, [mapCenter, isLoaded]);

  // Clear existing markers
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
  }, []);

  // Add markers for places
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return;

    clearMarkers();

    places.forEach(place => {
      const marker = new google.maps.Marker({
        position: place.coordinates,
        map: mapInstanceRef.current,
        title: place.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: place.isFollowing ? '#3B82F6' : '#10B981',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
      });

      // Add click listener to marker
      marker.addListener('click', () => {
        console.log('Pin clicked:', place.name);
        setSelectedLocationId(place.id);
        setSelectedLocationName(place.name);
        setSelectedLocationAddress(place.address || '');
        if (onPinClick) {
          onPinClick(place);
        }
      });

      markersRef.current.push(marker);
    });
  }, [places, isLoaded, onPinClick, clearMarkers]);

  // Handle selected place highlight
  useEffect(() => {
    if (!selectedPlace || !mapInstanceRef.current) return;

    // Find the marker for the selected place and highlight it
    const selectedMarker = markersRef.current.find((marker, index) => 
      places[index]?.id === selectedPlace.id
    );

    if (selectedMarker) {
      selectedMarker.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: '#EF4444',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 3,
      });

      // Center map on selected place
      mapInstanceRef.current.setCenter(selectedPlace.coordinates);
    }
  }, [selectedPlace, places]);

  return (
    <>
      <div ref={mapRef} className="w-full h-full min-h-[500px] rounded-lg overflow-hidden" />
      
      {selectedLocationId && (
        <LocationDetailSheet
          locationId={selectedLocationId}
          locationName={selectedLocationName}
          locationAddress={selectedLocationAddress}
          isOpen={!!selectedLocationId}
          onClose={() => {
            setSelectedLocationId(null);
            setSelectedLocationName('');
            setSelectedLocationAddress('');
            if (onCloseSelectedPlace) {
              onCloseSelectedPlace();
            }
          }}
        />
      )}
    </>
  );
};

export default GoogleMapsSetup;
