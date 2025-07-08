
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { loadGoogleMapsAPI } from '@/lib/googleMaps';
import { Place } from '@/types/place';
import LocationDetailSheet from './LocationDetailSheet';
import { useGeolocation } from '@/hooks/useGeolocation';

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
  const currentLocationMarkerRef = useRef<google.maps.Marker | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedLocationName, setSelectedLocationName] = useState<string>('');
  const [selectedLocationAddress, setSelectedLocationAddress] = useState<string>('');
  const { location, getCurrentLocation } = useGeolocation();

  // Initialize map
  useEffect(() => {
    const initMap = async () => {
      try {
        console.log('Starting Google Maps initialization...');
        await loadGoogleMapsAPI();
        
        if (!mapRef.current) {
          console.log('Map container not ready');
          return;
        }

        console.log('Creating Google Maps instance...');
        const map = new google.maps.Map(mapRef.current, {
          center: mapCenter,
          zoom: 13,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            },
            {
              featureType: 'transit',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ],
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: 'greedy',
          backgroundColor: '#f0f0f0'
        });

        mapInstanceRef.current = map;
        console.log('Google Maps instance created successfully');

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
        console.log('Map initialization complete');
        
        // Get current location when map is loaded
        getCurrentLocation();
      } catch (error) {
        console.error('Error initializing Google Maps:', error);
        setIsLoaded(false);
      }
    };

    // Add delay to ensure DOM is ready
    const timer = setTimeout(initMap, 100);
    return () => clearTimeout(timer);
  }, [getCurrentLocation, onMapRightClick]);

  // Update map center when it changes
  useEffect(() => {
    if (mapInstanceRef.current && isLoaded) {
      console.log('Updating map center to:', mapCenter);
      mapInstanceRef.current.setCenter(mapCenter);
      mapInstanceRef.current.setZoom(13);
    }
  }, [mapCenter, isLoaded]);

  // Add current location marker
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded || !location?.latitude || !location?.longitude) return;

    // Remove existing current location marker
    if (currentLocationMarkerRef.current) {
      currentLocationMarkerRef.current.setMap(null);
    }

    // Add current location marker with pulsing effect
    const currentLocationMarker = new google.maps.Marker({
      position: { lat: location.latitude, lng: location.longitude },
      map: mapInstanceRef.current,
      title: 'Your Current Location',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#4285F4',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 3,
      },
      zIndex: 2000,
    });

    currentLocationMarkerRef.current = currentLocationMarker;

    // Add pulsing circle around current location
    const pulseCircle = new google.maps.Circle({
      strokeColor: '#4285F4',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#4285F4',
      fillOpacity: 0.1,
      map: mapInstanceRef.current,
      center: { lat: location.latitude, lng: location.longitude },
      radius: 100,
    });

    // Animate the pulse
    let radius = 100;
    let growing = true;
    const pulseAnimation = setInterval(() => {
      if (growing) {
        radius += 5;
        if (radius >= 200) growing = false;
      } else {
        radius -= 5;
        if (radius <= 100) growing = true;
      }
      pulseCircle.setRadius(radius);
    }, 100);

    // Cleanup animation on unmount
    return () => {
      clearInterval(pulseAnimation);
      pulseCircle.setMap(null);
    };
  }, [location, isLoaded]);

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
      // Create a more visually appealing custom pin
      const pinColor = place.isFollowing ? '#3B82F6' : '#10B981';
      const pinSize = place.isNew ? 12 : 10;
      
      const marker = new google.maps.Marker({
        position: place.coordinates,
        map: mapInstanceRef.current,
        title: place.name,
        icon: {
          path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: pinSize,
          fillColor: pinColor,
          fillOpacity: 0.9,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
          rotation: 180,
          anchor: new google.maps.Point(0, 0),
        },
        zIndex: place.isNew ? 1000 : 100,
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

      // Add hover effects
      marker.addListener('mouseover', () => {
        marker.setIcon({
          path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: pinSize + 2,
          fillColor: pinColor,
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 3,
          rotation: 180,
          anchor: new google.maps.Point(0, 0),
        });
      });

      marker.addListener('mouseout', () => {
        marker.setIcon({
          path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: pinSize,
          fillColor: pinColor,
          fillOpacity: 0.9,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
          rotation: 180,
          anchor: new google.maps.Point(0, 0),
        });
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
      <div 
        ref={mapRef} 
        className="w-full h-full min-h-[500px] rounded-lg overflow-hidden relative bg-gray-100"
        style={{ minHeight: '500px' }}
      >
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading map...</p>
            </div>
          </div>
        )}
      </div>
      
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
