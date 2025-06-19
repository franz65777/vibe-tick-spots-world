
import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMapsAPI, isGoogleMapsLoaded } from '@/lib/googleMaps';
import { Place } from '@/types/place';
import { MapPin, AlertTriangle } from 'lucide-react';

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
    let mounted = true;
    
    const initializeMap = async () => {
      try {
        setError(null);
        console.log('Starting Google Maps initialization...');
        
        await loadGoogleMapsAPI();
        
        if (!mounted) return;

        // Ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 100));

        if (mapRef.current && !mapInstanceRef.current && isGoogleMapsLoaded()) {
          console.log('Creating Google Maps instance...');
          
          const defaultCenter = mapCenter || { lat: 40.7589, lng: -73.9851 };

          const mapOptions: google.maps.MapOptions = {
            center: defaultCenter,
            zoom: 13,
            styles: [
              {
                featureType: 'poi.business',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
              }
            ],
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: true,
            gestureHandling: 'greedy'
          };

          mapInstanceRef.current = new window.google.maps.Map(mapRef.current, mapOptions);

          // Add right-click listener
          if (onMapRightClick) {
            mapInstanceRef.current.addListener('rightclick', (event: google.maps.MapMouseEvent) => {
              if (event.latLng) {
                onMapRightClick({
                  lat: event.latLng.lat(),
                  lng: event.latLng.lng()
                });
              }
            });
          }

          console.log('Google Maps initialized successfully');
          setIsLoaded(true);
          
          // Add places if available
          if (places && places.length > 0) {
            addMarkersToMap(places);
          }
        }
      } catch (error) {
        console.error('Error initializing Google Maps:', error);
        if (mounted) {
          setError('Failed to load Google Maps. Please check your API key.');
        }
      }
    };

    initializeMap();

    return () => {
      mounted = false;
    };
  }, [mapCenter, onMapRightClick]);

  const addMarkersToMap = (placesToAdd: Place[]) => {
    if (!mapInstanceRef.current || !isLoaded || !window.google) {
      console.log('Map not ready for markers');
      return;
    }

    console.log('Adding markers to map:', placesToAdd.length);

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    placesToAdd.forEach((place, index) => {
      if (place.coordinates && place.coordinates.lat && place.coordinates.lng) {
        try {
          const marker = new window.google.maps.Marker({
            position: place.coordinates,
            map: mapInstanceRef.current,
            title: place.name,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: '#3B82F6',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
              scale: 8
            },
            zIndex: 1000 + index
          });

          marker.addListener('click', () => {
            onPinClick(place);
          });

          markersRef.current.push(marker);
        } catch (error) {
          console.error(`Error adding marker for ${place.name}:`, error);
        }
      }
    });

    // Fit map to show all markers if there are any
    if (markersRef.current.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      markersRef.current.forEach(marker => {
        const position = marker.getPosition();
        if (position) bounds.extend(position);
      });
      mapInstanceRef.current.fitBounds(bounds);
      
      // Don't zoom in too close if there's only one marker
      if (markersRef.current.length === 1) {
        mapInstanceRef.current.setZoom(Math.min(mapInstanceRef.current.getZoom() || 13, 15));
      }
    }
  };

  // Update markers when places change
  useEffect(() => {
    if (isLoaded && places && places.length > 0) {
      console.log('Places updated, refreshing markers:', places.length);
      addMarkersToMap(places);
    }
  }, [places, isLoaded, onPinClick]);

  if (error) {
    return (
      <div className="w-full h-full min-h-[280px] rounded-lg bg-red-50 border border-red-200 flex items-center justify-center">
        <div className="text-center p-4">
          <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-3" />
          <div className="text-red-600 text-sm font-medium mb-2">Map Error</div>
          <div className="text-red-500 text-xs mb-3">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[280px]">
      <div ref={mapRef} className="w-full h-full rounded-lg" />
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center z-10">
          <div className="text-center">
            <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-gray-700 text-sm font-medium mb-1">Loading map...</div>
            <div className="text-gray-500 text-xs">This may take a few seconds</div>
            <div className="mt-3 text-xs text-gray-400">
              Places to show: {places?.length || 0}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleMapsSetup;
