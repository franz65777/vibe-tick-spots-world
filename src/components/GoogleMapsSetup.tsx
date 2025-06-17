
import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
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

  useEffect(() => {
    const initializeMap = async () => {
      console.log('Initializing Google Maps...');
      
      const loader = new Loader({
        apiKey: 'AIzaSyDGVKK3IvDz3N0vCDX7XHKa0wHkZl6kLOY',
        version: 'weekly',
        libraries: ['places', 'geometry']
      });

      try {
        const google = await loader.load();
        console.log('Google Maps loaded successfully');

        if (mapRef.current && !mapInstanceRef.current) {
          console.log('Creating map instance...');
          
          const defaultCenter = mapCenter || { lat: 37.7749, lng: -122.4194 };
          console.log('Using provided map center:', defaultCenter);

          mapInstanceRef.current = new google.maps.Map(mapRef.current, {
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
              position: google.maps.ControlPosition.RIGHT_BOTTOM
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
        }
      } catch (error) {
        console.error('Error loading Google Maps:', error);
      }
    };

    initializeMap();
  }, [mapCenter, onMapRightClick]);

  // Update map center when it changes
  useEffect(() => {
    if (mapInstanceRef.current && mapCenter && isLoaded) {
      console.log('Updating map center to:', mapCenter);
      mapInstanceRef.current.setCenter(mapCenter);
      mapInstanceRef.current.setZoom(15); // Zoom in when searching for a specific place
    }
  }, [mapCenter, isLoaded]);

  // Update markers when places change
  useEffect(() => {
    if (mapInstanceRef.current && isLoaded) {
      console.log('Updating markers for', places.length, 'places');
      
      // Clear existing markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];

      // Add new markers
      places.forEach((place) => {
        if (place.coordinates && window.google) {
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

  // Reset selected place marker appearance when selection changes
  useEffect(() => {
    if (mapInstanceRef.current && isLoaded) {
      // Reset all markers to default appearance
      markersRef.current.forEach((marker, index) => {
        const place = places[index];
        if (place) {
          const isSelected = selectedPlace && place.id === selectedPlace.id;
          marker.setIcon({
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="${isSelected ? '40' : '32'}" height="${isSelected ? '40' : '32'}" viewBox="0 0 ${isSelected ? '40' : '32'} ${isSelected ? '40' : '32'}" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="${isSelected ? '20' : '16'}" cy="${isSelected ? '20' : '16'}" r="${isSelected ? '12' : '8'}" fill="${isSelected ? '#EF4444' : '#3B82F6'}" stroke="white" stroke-width="${isSelected ? '3' : '2'}"/>
                <circle cx="${isSelected ? '20' : '16'}" cy="${isSelected ? '20' : '16'}" r="${isSelected ? '6' : '3'}" fill="white"/>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(isSelected ? 40 : 32, isSelected ? 40 : 32),
            anchor: new window.google.maps.Point(isSelected ? 20 : 16, isSelected ? 20 : 16)
          });
        }
      });

      // Pan to selected place if one is selected
      if (selectedPlace && selectedPlace.coordinates) {
        mapInstanceRef.current.panTo(selectedPlace.coordinates);
      }
    }
  }, [selectedPlace, isLoaded, places]);

  return (
    <div ref={mapRef} className="w-full h-full min-h-[400px] rounded-lg" />
  );
};

export default GoogleMapsSetup;
