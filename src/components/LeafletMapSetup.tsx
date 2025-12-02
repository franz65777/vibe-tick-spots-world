import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { Place } from '@/types/place';
import PinDetailCard from './explore/PinDetailCard';
import { PostDetailModalMobile } from './explore/PostDetailModalMobile';
import { useGeolocation } from '@/hooks/useGeolocation';
import { createCurrentLocationMarker, createLeafletCustomMarker } from '@/utils/leafletMarkerCreator';
import { useAnalytics } from '@/hooks/useAnalytics';
import { supabase } from '@/integrations/supabase/client';
import { useLocationShares } from '@/hooks/useLocationShares';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MapPin, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { LocationSharersModal } from './explore/LocationSharersModal';
import { useTranslation } from 'react-i18next';

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
  recenterToken?: number;
  onSharingStateChange?: (hasSharing: boolean) => void;
  onMapMove?: (center: { lat: number; lng: number }, bounds: L.LatLngBounds) => void;
  onCitySelect?: (city: string, coords: { lat: number; lng: number }) => void;
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
  recenterToken,
  onSharingStateChange,
  onMapMove,
  onCitySelect,
}: LeafletMapSetupProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const currentLocationMarkerRef = useRef<L.Marker | null>(null);
  const markerClusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const cityMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const [showCityLabels, setShowCityLabels] = useState(false);

  const { location } = useGeolocation();
  const { trackEvent } = useAnalytics();
  const { shares, refetch: refetchShares } = useLocationShares();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [userActiveShare, setUserActiveShare] = useState<any>(null);
  const [selectedSharersLocation, setSelectedSharersLocation] = useState<{ 
    name: string; 
    sharers: Array<{ id: string; username: string; avatar_url: string | null }> 
  } | null>(null);

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

  // Check if user has active share and notify parent
  useEffect(() => {
    if (user && shares.length > 0) {
      const activeShare = shares.find(share => share.user_id === user.id) || null;

      setUserActiveShare(prev => {
        const prevId = prev?.id;
        const newId = (activeShare as any)?.id;
        // Avoid state updates if nothing meaningfully changed to prevent render loops
        if (prevId === newId && (!!prev === !!activeShare)) {
          return prev;
        }
        return activeShare;
      });

      onSharingStateChangeRef.current?.(!!activeShare);
    } else {
      setUserActiveShare(prev => {
        if (prev === null) return prev;
        return null;
      });
      onSharingStateChangeRef.current?.(false);
    }
  }, [user, shares]);

  // Sharing controls always at same height as expand button
  const baseControlPosition = fullScreen 
    ? 'bottom-[calc(env(safe-area-inset-bottom)+1rem)]'
    : 'bottom-[calc(4rem+env(safe-area-inset-bottom)-1.75rem)]';

  // Keep latest handlers in refs to avoid re-initializing map on prop changes
  const onMapRightClickRef = useRef(onMapRightClick);
  const onMapClickRef = useRef(onMapClick);
  const onSharingStateChangeRef = useRef(onSharingStateChange);

  useEffect(() => {
    onMapRightClickRef.current = onMapRightClick;
    onMapClickRef.current = onMapClick;
    onSharingStateChangeRef.current = onSharingStateChange;
  }, [onMapRightClick, onMapClick, onSharingStateChange]);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [mapCenter.lat, mapCenter.lng],
      zoom: 15,
      minZoom: 3,
      zoomControl: false,
      attributionControl: false,
      doubleClickZoom: false,
    });

    mapRef.current = map;

    // Use navigation style for dark mode with better colors (gray base, dark blue water, green parks)
    const mapboxToken = (import.meta as any).env?.VITE_MAPBOX_TOKEN as string | undefined;
    const url = mapboxToken
      ? (isDarkMode
          ? `https://api.mapbox.com/styles/v1/mapbox/navigation-night-v1/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`
          : `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`)
      : (isDarkMode
          ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png');

    const tile = L.tileLayer(url, mapboxToken ? {
      maxZoom: 19,
      tileSize: 512,
      zoomOffset: -1,
      attribution: '&copy; OpenStreetMap, &copy; Mapbox'
    } : {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '&copy; OpenStreetMap, &copy; CartoDB'
    });
    tile.addTo(map);
    tileLayerRef.current = tile;

    // Initialize marker cluster group with custom icon
    const markerClusterGroup = L.markerClusterGroup({
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      spiderfyOnMaxZoom: true,
      removeOutsideVisibleBounds: true,
      maxClusterRadius: 80,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        let size = 'small';
        let clusterSize = 40;
        
        if (count > 100) {
          size = 'large';
          clusterSize = 60;
        } else if (count > 30) {
          size = 'medium';
          clusterSize = 50;
        }
        
        return L.divIcon({
          html: `<div class="cluster-inner ${size}">${count}</div>`,
          className: `custom-cluster-icon ${size}`,
          iconSize: L.point(clusterSize, clusterSize),
        });
      },
    });
    map.addLayer(markerClusterGroup);
    markerClusterGroupRef.current = markerClusterGroup;

    // Map events (handlers read latest refs)
    map.on('contextmenu', (e: L.LeafletMouseEvent) => {
      onMapRightClickRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
    map.on('click', (e: L.LeafletMouseEvent) => {
      onMapClickRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    // Map move event for dynamic loading
    map.on('moveend', () => {
      const center = map.getCenter();
      const bounds = map.getBounds();
      onMapMove?.({ lat: center.lat, lng: center.lng }, bounds);
    });

    // Map zoom event - check for city label display
    map.on('zoomend', () => {
      const center = map.getCenter();
      const bounds = map.getBounds();
      const zoom = map.getZoom();
      onMapMove?.({ lat: center.lat, lng: center.lng }, bounds);
      
      // Show city labels when zoomed out (zoom < 9)
      setShowCityLabels(zoom < 9);
    });

    return () => {
      if (markerClusterGroupRef.current) {
        map.removeLayer(markerClusterGroupRef.current);
        markerClusterGroupRef.current = null;
      }
      cityMarkersRef.current.forEach(marker => map.removeLayer(marker));
      cityMarkersRef.current.clear();
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

    const mapboxToken = (import.meta as any).env?.VITE_MAPBOX_TOKEN as string | undefined;
    const url = mapboxToken
      ? (isDarkMode
          ? `https://api.mapbox.com/styles/v1/mapbox/navigation-night-v1/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`
          : `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`)
      : (isDarkMode
          ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png');

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const tile = L.tileLayer(url, mapboxToken ? {
      maxZoom: 19,
      tileSize: 512,
      zoomOffset: -1,
      attribution: '&copy; OpenStreetMap, &copy; Mapbox'
    } : {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '&copy; OpenStreetMap, &copy; CartoDB'
    });
    tile.addTo(map);
    tileLayerRef.current = tile;
  }, [isDarkMode]);

  // Update map center when it changes (for selected place from cards)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || preventCenterUpdate) return;
    
    console.log('🗺️ Centering map to:', mapCenter, 'token:', recenterToken);
    map.setView([mapCenter.lat, mapCenter.lng], 15, { animate: true });
  }, [mapCenter.lat, mapCenter.lng, preventCenterUpdate, recenterToken]);

  // Center map when a place is selected from navigation (e.g., from feed)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedPlace) return;
    
    console.log('🗺️ Centering map to selected place:', selectedPlace.name);
    map.setView([selectedPlace.coordinates.lat, selectedPlace.coordinates.lng], 16, { 
      animate: true,
      duration: 0.8 
    });
  }, [selectedPlace?.id, selectedPlace?.coordinates.lat, selectedPlace?.coordinates.lng]);

  // Ensure tiles recalc when toggling fullscreen to avoid white map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Multiple invalidate attempts with increasing delays to fix white tiles
    const timeouts = [
      setTimeout(() => { try { map.invalidateSize(); } catch {} }, 50),
      setTimeout(() => { try { map.invalidateSize(); } catch {} }, 150),
      setTimeout(() => { try { map.invalidateSize(); } catch {} }, 300),
      setTimeout(() => { try { map.invalidateSize(); } catch {} }, 500),
    ];
    
    return () => timeouts.forEach(t => clearTimeout(t));
  }, [fullScreen]);

  // Observe container size changes and invalidate map to prevent white tiles
  useEffect(() => {
    const container = containerRef.current;
    const map = mapRef.current;
    if (!container || !map) return;

    const ro = new ResizeObserver(() => {
      // Use rAF + timeout to ensure layout settled
      requestAnimationFrame(() => {
        try { map.invalidateSize(); } catch {}
        setTimeout(() => { try { map.invalidateSize(); } catch {} }, 100);
      });
    });
    ro.observe(container);

    const onWindowResize = () => {
      try { map.invalidateSize(); } catch {}
    };
    window.addEventListener('orientationchange', onWindowResize);
    window.addEventListener('resize', onWindowResize);

    return () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', onWindowResize);
      window.removeEventListener('resize', onWindowResize);
    };
  }, []);

  // Current location marker with device orientation support
  const headingRef = useRef<number>(0);
  
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const getScaleForZoom = (zoom: number): number => {
      if (zoom >= 16) return 1.2;
      if (zoom >= 14) return 1;
      if (zoom >= 12) return 0.8;
      if (zoom >= 10) return 0.6;
      return 0.5;
    };

    const updateMarker = (heading?: number) => {
      if (!location?.latitude || !location?.longitude) return;
      
      const zoom = map.getZoom();
      const scale = getScaleForZoom(zoom);
      const icon = createCurrentLocationMarker(heading ?? headingRef.current, scale);
      
      if (currentLocationMarkerRef.current) {
        currentLocationMarkerRef.current.setLatLng([location.latitude, location.longitude]);
        currentLocationMarkerRef.current.setIcon(icon);
      } else {
        currentLocationMarkerRef.current = L.marker([location.latitude, location.longitude], {
          icon,
          zIndexOffset: 3000,
          pane: 'markerPane',
        }).addTo(map);
        currentLocationMarkerRef.current.setZIndexOffset(3000);
      }
    };

    // Device orientation handler
    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.alpha !== null) {
        headingRef.current = event.alpha;
        updateMarker(event.alpha);
      }
    };

    // Zoom handler for scaling
    const handleZoom = () => updateMarker();

    // Request permission for iOS 13+
    const requestOrientationPermission = async () => {
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        try {
          const permission = await (DeviceOrientationEvent as any).requestPermission();
          if (permission === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation);
          }
        } catch (e) {
          console.log('Device orientation permission denied');
        }
      } else {
        window.addEventListener('deviceorientation', handleOrientation);
      }
    };

    if (location?.latitude && location?.longitude) {
      console.log('📍 Updating current location marker:', location);
      updateMarker();
      requestOrientationPermission();
      map.on('zoomend', handleZoom);
    }

    return () => {
      map.off('zoomend', handleZoom);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [location?.latitude, location?.longitude]);

  // Places markers with campaign detection
  useEffect(() => {
    const map = mapRef.current;
    const clusterGroup = markerClusterGroupRef.current;
    if (!map || !clusterGroup) return;

    // Remove markers that no longer exist
    markersRef.current.forEach((marker, id) => {
      if (!places.find((p) => p.id === id)) {
        clusterGroup.removeLayer(marker);
        markersRef.current.delete(id);
      }
    });

    // Fetch active campaigns for all locations
    const fetchCampaigns = async () => {
      const locationIds = places.map(p => p.id).filter(Boolean);
      if (locationIds.length === 0) {
        // No places, render empty markers
        return;
      }

      try {
        const { data: campaigns } = await supabase
          .from('marketing_campaigns')
          .select('location_id')
          .in('location_id', locationIds)
          .eq('is_active', true)
          .gt('end_date', new Date().toISOString());

        const campaignLocationIds = new Set(campaigns?.map(c => c.location_id) || []);

        // Add / update markers
        const usedFallbackShareIds = new Set<string>();
        places.forEach((place) => {
          if (!place.coordinates?.lat || !place.coordinates?.lng) return;

          const hasCampaign = campaignLocationIds.has(place.id);

          // Find all users sharing location at this place (only active shares, excluding current user)
          const now = new Date();
          const activeShares = shares.filter(s => {
            // Exclude current user's share
            if (user && s.user_id === user.id) return false;
            // Only active non-expired shares
            try { return new Date(s.expires_at) > now; } catch { return false; }
          });
          const usersHere = activeShares.filter(share => {
            // Prefer exact location_id match when present
            if (share.location_id && place.id && share.location_id === place.id) return true;
            // Fallback to proximity check (~350m)
            const latDiff = Math.abs(parseFloat(share.latitude.toString()) - place.coordinates.lat);
            const lngDiff = Math.abs(parseFloat(share.longitude.toString()) - place.coordinates.lng);
            return latDiff < 0.003 && lngDiff < 0.003;
          });

          const sharedByUsers = usersHere.map(share => ({
            id: share.user.id,
            username: share.user.username,
            avatar_url: share.user.avatar_url
          }));

          const icon = createLeafletCustomMarker({
            category: place.category || 'attraction',
            isSaved: place.isSaved,
            isRecommended: place.isRecommended,
            recommendationScore: place.recommendationScore,
            friendAvatars: [],
            isDarkMode,
            hasCampaign,
            sharedByUsers: sharedByUsers.length > 0 ? sharedByUsers : undefined,
          });

        let marker = markersRef.current.get(place.id);
        if (!marker) {
          marker = L.marker([place.coordinates.lat, place.coordinates.lng], {
            icon,
          });
          marker.on('click', (e) => {
            // Check if clicked on the sharers badge
            const target = (e.originalEvent as any).target;
            if (target && target.closest('.location-sharers-badge') && sharedByUsers.length > 1) {
              e.originalEvent.stopPropagation();
              setSelectedSharersLocation({
                name: place.name,
                sharers: sharedByUsers
              });
              return;
            }

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
              has_campaign: hasCampaign,
            });
            onPinClick?.(place);
          });
          clusterGroup.addLayer(marker);
          markersRef.current.set(place.id, marker);
        }
        marker.setIcon(icon);
        marker.setLatLng([place.coordinates.lat, place.coordinates.lng]);
      });
      } catch (error) {
        console.error('Error fetching campaigns:', error);
      }
    };

    fetchCampaigns();
  }, [places, isDarkMode, onPinClick, trackEvent, shares, user]);

  // City labels - show when zoomed out
  useEffect(() => {
    const map = mapRef.current;
    const clusterGroup = markerClusterGroupRef.current;
    if (!map || !clusterGroup) return;

    // City coordinates database
    const cityCoords: Record<string, { lat: number; lng: number }> = {
      'dublin': { lat: 53.3498, lng: -6.2603 },
      'london': { lat: 51.5074, lng: -0.1278 },
      'paris': { lat: 48.8566, lng: 2.3522 },
      'amsterdam': { lat: 52.3676, lng: 4.9041 },
      'berlin': { lat: 52.5200, lng: 13.4050 },
      'rome': { lat: 41.9028, lng: 12.4964 },
      'milan': { lat: 45.4642, lng: 9.1900 },
      'barcelona': { lat: 41.3851, lng: 2.1734 },
      'madrid': { lat: 40.4168, lng: -3.7038 },
      'lisbon': { lat: 38.7223, lng: -9.1393 },
      'munich': { lat: 48.1351, lng: 11.5820 },
      'vienna': { lat: 48.2082, lng: 16.3738 },
      'prague': { lat: 50.0755, lng: 14.4378 },
      'budapest': { lat: 47.4979, lng: 19.0402 },
      'warsaw': { lat: 52.2297, lng: 21.0122 },
      'stockholm': { lat: 59.3293, lng: 18.0686 },
      'copenhagen': { lat: 55.6761, lng: 12.5683 },
      'brussels': { lat: 50.8503, lng: 4.3517 },
      'zurich': { lat: 47.3769, lng: 8.5417 },
      'athens': { lat: 37.9838, lng: 23.7275 },
      'new york': { lat: 40.7128, lng: -74.0060 },
      'san francisco': { lat: 37.7749, lng: -122.4194 },
      'los angeles': { lat: 34.0522, lng: -118.2437 },
      'chicago': { lat: 41.8781, lng: -87.6298 },
      'manchester': { lat: 53.4808, lng: -2.2426 },
      'edinburgh': { lat: 55.9533, lng: -3.1883 },
      'cork': { lat: 51.8985, lng: -8.4756 },
      'york': { lat: 53.9591, lng: -1.0815 },
      'cambridge': { lat: 52.2053, lng: 0.1218 },
      'bordeaux': { lat: 44.8378, lng: -0.5792 },
      'nantes': { lat: 47.2184, lng: -1.5536 },
      'rennes': { lat: 48.1173, lng: -1.6778 },
      'exeter': { lat: 50.7184, lng: -3.5339 },
      'truro': { lat: 50.2632, lng: -5.0510 },
    };

    // Get unique cities from places
    const citiesInPlaces = new Set<string>();
    places.forEach(place => {
      if (place.city) {
        citiesInPlaces.add(place.city.toLowerCase());
      }
    });

    if (showCityLabels) {
      // Hide cluster group
      if (clusterGroup.getLayers().length > 0) {
        map.removeLayer(clusterGroup);
      }

      // Create city markers
      citiesInPlaces.forEach(city => {
        if (cityMarkersRef.current.has(city)) return;
        
        const coords = cityCoords[city];
        if (!coords) return;

        const capitalizedCity = city.charAt(0).toUpperCase() + city.slice(1);
        const cityIcon = L.divIcon({
          html: `
            <div class="city-label" style="
              background: white;
              padding: 8px 16px;
              border-radius: 24px;
              font-weight: 700;
              font-size: 15px;
              color: #1a1a1a;
              box-shadow: 0 4px 12px rgba(0,0,0,0.2);
              white-space: nowrap;
              cursor: pointer;
              transition: transform 0.2s, box-shadow 0.2s;
              text-transform: capitalize;
            " onmouseover="this.style.transform='scale(1.08)'; this.style.boxShadow='0 6px 16px rgba(0,0,0,0.25)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.2)'">
              ${capitalizedCity}
            </div>
          `,
          className: 'city-marker-icon',
          iconSize: [100, 40],
          iconAnchor: [50, 20],
        });

        const marker = L.marker([coords.lat, coords.lng], { icon: cityIcon });
        marker.on('click', () => {
          // Zoom to city and call callback
          map.setView([coords.lat, coords.lng], 13, { animate: true });
          onCitySelect?.(city.charAt(0).toUpperCase() + city.slice(1), coords);
        });
        marker.addTo(map);
        cityMarkersRef.current.set(city, marker);
      });
    } else {
      // Show cluster group
      if (!map.hasLayer(clusterGroup)) {
        map.addLayer(clusterGroup);
      }

      // Remove city markers
      cityMarkersRef.current.forEach(marker => {
        map.removeLayer(marker);
      });
      cityMarkersRef.current.clear();
    }
  }, [showCityLabels, places, onCitySelect]);

  const [selectedPostFromPin, setSelectedPostFromPin] = useState<string | null>(null);

  const handleEndSharing = async () => {
    if (!userActiveShare) return;
    
    try {
      // Delete the location share
      const { error } = await supabase
        .from('user_location_shares')
        .delete()
        .eq('id', userActiveShare.id);

      if (error) throw error;
      
      // Update related notifications to change "si trova" to "si trovava"
      const { error: notifError } = await supabase
        .from('notifications')
        .update({ 
          message: userActiveShare.location?.name 
            ? `si trovava a ${userActiveShare.location.name}` 
            : 'si trovava in una posizione'
        })
        .eq('type', 'location_share')
        .contains('data', { location_id: userActiveShare.location_id });

      if (notifError) {
        console.error('Error updating notifications:', notifError);
      }
      
      toast.success('Condivisione posizione terminata');
      refetchShares();
      setUserActiveShare(null);
    } catch (error) {
      console.error('Error ending share:', error);
      toast.error('Errore terminando la condivisione');
    }
  };

  const handleUpdateLocation = () => {
    navigate('/share-location');
  };

  return (
    <>
      {/* Hide map when viewing a post */}
      <div
        ref={containerRef}
        className={
          fullScreen
            ? 'relative w-full h-full rounded-2xl overflow-hidden bg-background'
            : 'relative w-full h-full rounded-lg overflow-hidden'
        }
        style={{ 
          minHeight: '100%',
          visibility: selectedPostFromPin ? 'hidden' : 'visible',
          position: selectedPostFromPin ? 'absolute' : 'relative',
          pointerEvents: selectedPostFromPin ? 'none' : 'auto'
        }}
      />

      {/* Location sharing controls */}
      {userActiveShare && (
        <div className={`${fullScreen ? 'fixed' : 'absolute'} ${baseControlPosition} left-4 z-[1000] flex gap-2`}>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleEndSharing}
            className="shadow-lg rounded-full"
          >
            <X className="h-4 w-4 mr-1" />
            {t('endSharing', { ns: 'common', defaultValue: 'End' })}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleUpdateLocation}
            className="shadow-lg rounded-full"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            {t('updateLocation', { ns: 'common', defaultValue: 'Update' })}
          </Button>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          25% { transform: translateY(-10px); }
          50% { transform: translateY(-5px); }
          75% { transform: translateY(-8px); }
        }
        .leaflet-container {
          background: ${isDarkMode ? '#2a2f3a' : '#f8fafc'};
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
          background: rgba(42, 47, 58, 0.8);
          color: rgba(148, 163, 184, 0.9);
        }
        .leaflet-tile {
          filter: ${isDarkMode ? 'brightness(0.7) contrast(1.2) saturate(0.9) hue-rotate(180deg) invert(1)' : 'brightness(1.02) contrast(0.98)'};
        }
      `}</style>

      {/* Location detail card - hide when viewing post */}
      {selectedPlace && !selectedPostFromPin && (
        <PinDetailCard
          place={{
            id: selectedPlace.id,
            name: selectedPlace.name,
            category: selectedPlace.category,
            address: selectedPlace.address,
            city: selectedPlace.city,
            google_place_id: selectedPlace.google_place_id,
            coordinates: selectedPlace.coordinates,
            sourcePostId: (selectedPlace as any).sourcePostId,
          }}
          onClose={() => onCloseSelectedPlace?.()}
          onPostSelected={(postId) => setSelectedPostFromPin(postId)}
        />
      )}

      {/* Show post modal when post is selected from pin */}
      {selectedPostFromPin && selectedPlace && (
        <PostDetailModalMobile
          postId={selectedPostFromPin}
          locationId={selectedPlace.id}
          isOpen={true}
          onClose={() => {
            setSelectedPostFromPin(null);
            // Force map to reflow after becoming visible - use multiple attempts
            setTimeout(() => {
              if (mapRef.current) {
                mapRef.current.invalidateSize(true);
              }
            }, 50);
            setTimeout(() => {
              if (mapRef.current) {
                mapRef.current.invalidateSize(true);
              }
            }, 150);
            setTimeout(() => {
              if (mapRef.current) {
                mapRef.current.invalidateSize(true);
              }
            }, 300);
          }}
        />
      )}

      {/* Location sharers modal */}
      {selectedSharersLocation && (
        <LocationSharersModal
          isOpen={true}
          onClose={() => setSelectedSharersLocation(null)}
          sharers={selectedSharersLocation.sharers}
          locationName={selectedSharersLocation.name}
        />
      )}

      {/* Custom cluster styling */}
      <style>{`
        .custom-cluster-icon {
          background: transparent !important;
          border: none !important;
        }
        
        .cluster-inner {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transition: all 0.2s ease;
        }
        
        .cluster-inner.small {
          background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.8) 100%);
          font-size: 14px;
        }
        
        .cluster-inner.medium {
          background: linear-gradient(135deg, hsl(var(--accent)) 0%, hsl(var(--accent) / 0.8) 100%);
          font-size: 16px;
        }
        
        .cluster-inner.large {
          background: linear-gradient(135deg, hsl(var(--destructive)) 0%, hsl(var(--destructive) / 0.8) 100%);
          font-size: 18px;
        }
        
        .custom-cluster-icon:hover .cluster-inner {
          transform: scale(1.1);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
        }
      `}</style>
    </>
  );
};

export default LeafletMapSetup;
