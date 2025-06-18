
import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMapsAPI, isGoogleMapsLoaded } from '@/lib/googleMaps';
import { Place } from '@/types/place';

interface GoogleMapsSetupProps {
  places: Place[];
  onPinClick: (place: Place) => void;
  mapCenter?: { lat: number; lng: number };
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeMap = async () => {
      console.log('Initializing Google Maps...');
      
      try {
        await loadGoogleMapsAPI();
        console.log('Google Maps loaded successfully');

        if (mapRef.current && !mapInstanceRef.current && isGoogleMapsLoaded()) {
          console.log('Creating map instance...');
          
          const defaultCenter = mapCenter || { lat: 37.7749, lng: -122.4194 };
          console.log('Using map center:', defaultCenter);

          mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
            center: defaultCenter,
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
            zoomControl: true,
            zoomControlOptions: {
              position: window.google.maps.ControlPosition.RIGHT_BOTTOM
            }
          });

          // Add right-click listener for adding new locations
          if (onMapRightClick) {
            mapInstanceRef.current.addListener('rightclick', (event: google.maps.MapMouseEvent) => {
              if (event.latLng) {
                const coords = {
                  lat: event.latLng.lat(),
                  lng: event.latLng.lng()
                };
                onMapRightClick(coords);
              }
            });
          }

          console.log('Map is fully loaded and ready');
          setIsLoaded(true);
          setError(null);
        }
      } catch (error) {
        console.error('Error loading Google Maps:', error);
        setError('Failed to load Google Maps. Please check your internet connection.');
      }
    };

    initializeMap();
  }, [mapCenter, onMapRightClick]);

  // Update map center when it changes
  useEffect(() => {
    if (mapInstanceRef.current && mapCenter && isLoaded) {
      console.log('Updating map center to:', mapCenter);
      mapInstanceRef.current.setCenter(mapCenter);
    }
  }, [mapCenter, isLoaded]);

  // Update markers when places change
  useEffect(() => {
    if (mapInstanceRef.current && isLoaded && window.google) {
      console.log('Updating markers for', places.length, 'places');
      
      // Clear existing markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];

      // Add new markers
      places.forEach((place) => {
        if (place.coordinates) {
          const marker = new window.google.maps.Marker({
            position: place.coordinates,
            map: mapInstanceRef.current,
            title: place.name,
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="16" r="8" fill="#3B82F6" stroke="white" stroke-width="2"/>
                  <circle cx="16" cy="16" r="3" fill="white"/>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(32, 32),
              anchor: new window.google.maps.Point(16, 16)
            }
          });

          marker.addListener('click', () => {
            onPinClick(place);
          });

          markersRef.current.push(marker);
        }
      });

      console.log('Markers updated, total:', markersRef.current.length);
    }
  }, [places, onPinClick, isLoaded]);

  // Handle selected place highlighting
  useEffect(() => {
    if (mapInstanceRef.current && selectedPlace && isLoaded && window.google) {
      // Find the marker for the selected place and highlight it
      const selectedMarker = markersRef.current.find((marker, index) => {
        return places[index]?.id === selectedPlace.id;
      });

      if (selectedMarker) {
        // Update marker icon to highlight selected state
        selectedMarker.setIcon({
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="12" fill="#EF4444" stroke="white" stroke-width="3"/>
              <circle cx="20" cy="20" r="6" fill="white"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(40, 40),
          anchor: new window.google.maps.Point(20, 20)
        });

        // Pan to the selected marker
        if (selectedPlace.coordinates) {
          mapInstanceRef.current.panTo(selectedPlace.coordinates);
        }
      }
    }
  }, [selectedPlace, isLoaded, places]);

  if (error) {
    return (
      <div className="w-full h-full min-h-[400px] rounded-lg bg-red-50 border border-red-200 flex items-center justify-center">
        <div className="text-center p-6">
          <div className="text-red-600 text-lg font-medium mb-2">Map Loading Error</div>
          <div className="text-red-500 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[400px]">
      <div ref={mapRef} className="w-full h-full rounded-lg" />
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-gray-600">Loading map...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleMapsSetup;
