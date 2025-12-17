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
import { useMapFilter } from '@/contexts/MapFilterContext';

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
  filtersVisible?: boolean;
  hideSharingControls?: boolean;
  fromMessages?: boolean;
  onBackToMessages?: () => void;
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
  filtersVisible = true,
  hideSharingControls = false,
  fromMessages = false,
  onBackToMessages,
}: LeafletMapSetupProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const currentLocationMarkerRef = useRef<L.Marker | null>(null);
  const markerClusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const cityMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const [showCityLabels, setShowCityLabels] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(15);

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
    ? 'bottom-[calc(env(safe-area-inset-bottom)+4.5rem)]'
    : 'bottom-[calc(6.5rem+env(safe-area-inset-bottom))]';

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
      maxClusterRadius: 50,
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
    
    // Remove single tap handler to prevent trending section jumping
    // Single click does nothing now
    
    // Double tap/click to zoom in
    map.on('dblclick', (e: L.LeafletMouseEvent) => {
      e.originalEvent.preventDefault();
      map.setView(e.latlng, map.getZoom() + 1, { animate: true });
    });

    // Map move event for dynamic loading
    map.on('moveend', () => {
      const center = map.getCenter();
      const bounds = map.getBounds();
      onMapMove?.({ lat: center.lat, lng: center.lng }, bounds);
    });

    // Map zoom event - check for city label display
    const handleZoomEnd = () => {
      const center = map.getCenter();
      const bounds = map.getBounds();
      const zoom = map.getZoom();
      setCurrentZoom(zoom);
      onMapMove?.({ lat: center.lat, lng: center.lng }, bounds);
      
      // Show city labels when zoomed out (zoom < 9)
      const shouldShowCities = zoom < 9;
      setShowCityLabels(shouldShowCities);
      
      // Hide cluster group when zoomed out to prevent flickering
      if (markerClusterGroupRef.current) {
        if (shouldShowCities) {
          map.removeLayer(markerClusterGroupRef.current);
        } else {
          if (!map.hasLayer(markerClusterGroupRef.current)) {
            map.addLayer(markerClusterGroupRef.current);
          }
        }
      }
      
      // Force refresh city markers on zoom change
      if (shouldShowCities) {
        cityMarkersRef.current.forEach(marker => map.removeLayer(marker));
        cityMarkersRef.current.clear();
      }
    };
    
    map.on('zoomend', handleZoomEnd);
    
    // Also refresh city labels on pan when zoomed out
    map.on('moveend', () => {
      const zoom = map.getZoom();
      if (zoom < 9) {
        // Clear existing to refresh visible cities in new bounds
        cityMarkersRef.current.forEach(marker => map.removeLayer(marker));
        cityMarkersRef.current.clear();
        setShowCityLabels(prev => {
          // Toggle to force re-render
          setTimeout(() => setShowCityLabels(true), 10);
          return false;
        });
      }
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

    // Don't render pins when zoomed out (city labels mode) to prevent flickering
    const zoom = map.getZoom();
    if (zoom < 9) {
      // Clear all markers when zoomed out
      markersRef.current.forEach((marker) => {
        clusterGroup.removeLayer(marker);
      });
      markersRef.current.clear();
      return;
    }

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
          // Each share should only appear on ONE pin (exact match preferred, then closest)
          const now = new Date();
          const activeShares = shares.filter(s => {
            // Exclude current user's share
            if (user && s.user_id === user.id) return false;
            // Only active non-expired shares
            try { return new Date(s.expires_at) > now; } catch { return false; }
          });
          
          // Only match shares that haven't been used yet
          const usersHere = activeShares.filter(share => {
            // Skip if already used on another pin
            if (usedFallbackShareIds.has(share.id)) return false;
            
            // Exact location_id match - this is definitive
            if (share.location_id && place.id && share.location_id === place.id) {
              usedFallbackShareIds.add(share.id);
              return true;
            }
            
            // No exact match - don't use proximity fallback to prevent duplicates
            return false;
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

  // Keep selected marker visible outside clusters
  const selectedMarkerRef = useRef<L.Marker | null>(null);
  const selectedMarkerOriginalClusterRef = useRef<boolean>(false);
  const tempMarkerRef = useRef<L.Marker | null>(null);
  const tempMarkerSavedRef = useRef<boolean>(false);
  
  // Listen for location save events to update temp marker
  useEffect(() => {
    const handleSaveChange = (e: CustomEvent<{ locationId: string; isSaved: boolean; saveTag?: string }>) => {
      const map = mapRef.current;
      if (!map || !tempMarkerRef.current || !selectedPlace) return;
      
      // Check if this save event is for our temp location
      const isForTempLocation = 
        selectedPlace.id === e.detail.locationId ||
        selectedPlace.isTemporary;
      
      if (isForTempLocation && e.detail.isSaved) {
        tempMarkerSavedRef.current = true;
        
        // Update the temp marker icon to show it's saved
        const newIcon = createLeafletCustomMarker({
          category: selectedPlace.category || 'attraction',
          isSaved: true,
          isRecommended: false,
          recommendationScore: 0,
          friendAvatars: [],
          isDarkMode,
          hasCampaign: false,
          sharedByUsers: undefined,
        });
        
        tempMarkerRef.current.setIcon(newIcon);
      }
    };
    
    window.addEventListener('location-save-changed', handleSaveChange as EventListener);
    return () => {
      window.removeEventListener('location-save-changed', handleSaveChange as EventListener);
    };
  }, [selectedPlace, isDarkMode]);
  
  // Hide other markers and clusters when a place is selected
  useEffect(() => {
    const map = mapRef.current;
    const clusterGroup = markerClusterGroupRef.current;
    const mapContainer = containerRef.current;
    if (!clusterGroup || !mapContainer || !map) return;

    const selectedId = selectedPlace?.id;
    const selectedMarker = selectedId ? markersRef.current.get(selectedId) : null;

    // Only clean up temp marker if selectedPlace is null AND it wasn't saved
    if (!selectedPlace && tempMarkerRef.current && !tempMarkerSavedRef.current) {
      try {
        map.removeLayer(tempMarkerRef.current);
      } catch (e) {
        // Ignore errors during cleanup
      }
      tempMarkerRef.current = null;
    }

    // Restore previous selected marker to cluster if exists
    if (selectedMarkerRef.current && selectedMarkerOriginalClusterRef.current) {
      try {
        map.removeLayer(selectedMarkerRef.current);
        clusterGroup.addLayer(selectedMarkerRef.current);
      } catch (e) {
        // Ignore errors during cleanup
      }
      selectedMarkerRef.current = null;
      selectedMarkerOriginalClusterRef.current = false;
    }

    // If selected place exists but has no marker (new/temporary location), create a temporary marker
    if (selectedPlace && selectedPlace.coordinates?.lat && selectedPlace.coordinates?.lng && !selectedMarker && !tempMarkerRef.current) {
      tempMarkerSavedRef.current = false; // Reset saved state for new temp markers
      
      const icon = createLeafletCustomMarker({
        category: selectedPlace.category || 'attraction',
        isSaved: false,
        isRecommended: false,
        recommendationScore: 0,
        friendAvatars: [],
        isDarkMode,
        hasCampaign: false,
        sharedByUsers: undefined,
      });

      const tempMarker = L.marker([selectedPlace.coordinates.lat, selectedPlace.coordinates.lng], {
        icon,
        zIndexOffset: 5000,
      });
      
      tempMarker.addTo(map);
      tempMarkerRef.current = tempMarker;
      
      // Ensure it's visible
      const el = tempMarker.getElement();
      if (el) {
        el.style.opacity = '1';
        el.style.pointerEvents = 'auto';
        el.style.zIndex = '5000';
      }
    }

    // If we have a selected marker (from places array), remove it from cluster and add directly to map
    if (selectedMarker && selectedId) {
      try {
        // Check if marker is in cluster
        const isInCluster = clusterGroup.hasLayer(selectedMarker);
        if (isInCluster) {
          clusterGroup.removeLayer(selectedMarker);
          map.addLayer(selectedMarker);
          selectedMarkerRef.current = selectedMarker;
          selectedMarkerOriginalClusterRef.current = true;
          
          // Ensure it's visible and on top
          selectedMarker.setZIndexOffset(5000);
          const el = selectedMarker.getElement();
          if (el) {
            el.style.opacity = '1';
            el.style.pointerEvents = 'auto';
            el.style.zIndex = '5000';
          }
        }
      } catch (e) {
        console.warn('Error managing selected marker:', e);
      }
    }

    // Hide/show other individual markers (keep ONLY the selected pin visible)
    clusterGroup.eachLayer((layer: any) => {
      const isSelected = selectedMarker && layer === selectedMarker;
      const hasSelection = !!selectedId;
      const opacity = hasSelection ? (isSelected ? 1 : 0) : 1;

      if (typeof layer.setOpacity === 'function') {
        layer.setOpacity(opacity);
      }

      if (typeof layer.getElement === 'function') {
        const el = layer.getElement();
        if (el) {
          el.style.pointerEvents = hasSelection ? (isSelected ? 'auto' : 'none') : 'auto';
        }
      }
    });

    // Hide cluster icons whenever a pin is selected (post-open or map-open)
    if (selectedId) {
      mapContainer.classList.add('hide-clusters');
    } else {
      mapContainer.classList.remove('hide-clusters');
    }
  }, [selectedPlace, isDarkMode]);

  // Inject CSS for hiding clusters
  useEffect(() => {
    let styleEl = document.getElementById('cluster-hide-styles');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'cluster-hide-styles';
      styleEl.innerHTML = `
        .hide-clusters .marker-cluster,
        .hide-clusters .custom-cluster-icon {
          opacity: 0 !important;
          pointer-events: none !important;
          visibility: hidden !important;
        }
      `;
      document.head.appendChild(styleEl);
    }
    return () => {
      // Don't remove on cleanup - keep for future use
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const clusterGroup = markerClusterGroupRef.current;
    if (!map || !clusterGroup) return;

    // City coordinates database - major cities worldwide
    const cityCoords: Record<string, { lat: number; lng: number; displayName: string; priority: number }> = {
      // Europe
      'dublin': { lat: 53.3498, lng: -6.2603, displayName: 'Dublin', priority: 1 },
      'london': { lat: 51.5074, lng: -0.1278, displayName: 'London', priority: 1 },
      'paris': { lat: 48.8566, lng: 2.3522, displayName: 'Paris', priority: 1 },
      'amsterdam': { lat: 52.3676, lng: 4.9041, displayName: 'Amsterdam', priority: 2 },
      'berlin': { lat: 52.5200, lng: 13.4050, displayName: 'Berlin', priority: 1 },
      'rome': { lat: 41.9028, lng: 12.4964, displayName: 'Rome', priority: 1 },
      'milan': { lat: 45.4642, lng: 9.1900, displayName: 'Milan', priority: 2 },
      'barcelona': { lat: 41.3851, lng: 2.1734, displayName: 'Barcelona', priority: 1 },
      'madrid': { lat: 40.4168, lng: -3.7038, displayName: 'Madrid', priority: 1 },
      'lisbon': { lat: 38.7223, lng: -9.1393, displayName: 'Lisbon', priority: 2 },
      'munich': { lat: 48.1351, lng: 11.5820, displayName: 'Munich', priority: 3 },
      'vienna': { lat: 48.2082, lng: 16.3738, displayName: 'Vienna', priority: 2 },
      'prague': { lat: 50.0755, lng: 14.4378, displayName: 'Prague', priority: 2 },
      'budapest': { lat: 47.4979, lng: 19.0402, displayName: 'Budapest', priority: 2 },
      'warsaw': { lat: 52.2297, lng: 21.0122, displayName: 'Warsaw', priority: 2 },
      'stockholm': { lat: 59.3293, lng: 18.0686, displayName: 'Stockholm', priority: 2 },
      'copenhagen': { lat: 55.6761, lng: 12.5683, displayName: 'Copenhagen', priority: 2 },
      'brussels': { lat: 50.8503, lng: 4.3517, displayName: 'Brussels', priority: 3 },
      'zurich': { lat: 47.3769, lng: 8.5417, displayName: 'Zurich', priority: 3 },
      'athens': { lat: 37.9838, lng: 23.7275, displayName: 'Athens', priority: 2 },
      'edinburgh': { lat: 55.9533, lng: -3.1883, displayName: 'Edinburgh', priority: 3 },
      'cork': { lat: 51.8985, lng: -8.4756, displayName: 'Cork', priority: 3 },
      'manchester': { lat: 53.4808, lng: -2.2426, displayName: 'Manchester', priority: 3 },
      'moscow': { lat: 55.7558, lng: 37.6173, displayName: 'Moscow', priority: 1 },
      'istanbul': { lat: 41.0082, lng: 28.9784, displayName: 'Istanbul', priority: 1 },
      // Americas
      'new york': { lat: 40.7128, lng: -74.0060, displayName: 'New York', priority: 1 },
      'san francisco': { lat: 37.7749, lng: -122.4194, displayName: 'San Francisco', priority: 1 },
      'los angeles': { lat: 34.0522, lng: -118.2437, displayName: 'Los Angeles', priority: 1 },
      'chicago': { lat: 41.8781, lng: -87.6298, displayName: 'Chicago', priority: 2 },
      'miami': { lat: 25.7617, lng: -80.1918, displayName: 'Miami', priority: 2 },
      'toronto': { lat: 43.6532, lng: -79.3832, displayName: 'Toronto', priority: 1 },
      'vancouver': { lat: 49.2827, lng: -123.1207, displayName: 'Vancouver', priority: 2 },
      'mexico city': { lat: 19.4326, lng: -99.1332, displayName: 'Mexico City', priority: 1 },
      'sao paulo': { lat: -23.5505, lng: -46.6333, displayName: 'São Paulo', priority: 1 },
      'buenos aires': { lat: -34.6037, lng: -58.3816, displayName: 'Buenos Aires', priority: 1 },
      'rio de janeiro': { lat: -22.9068, lng: -43.1729, displayName: 'Rio de Janeiro', priority: 2 },
      'bogota': { lat: 4.7110, lng: -74.0721, displayName: 'Bogotá', priority: 2 },
      'lima': { lat: -12.0464, lng: -77.0428, displayName: 'Lima', priority: 2 },
      // Asia
      'tokyo': { lat: 35.6762, lng: 139.6503, displayName: 'Tokyo', priority: 1 },
      'seoul': { lat: 37.5665, lng: 126.9780, displayName: 'Seoul', priority: 1 },
      'beijing': { lat: 39.9042, lng: 116.4074, displayName: 'Beijing', priority: 1 },
      'shanghai': { lat: 31.2304, lng: 121.4737, displayName: 'Shanghai', priority: 1 },
      'hong kong': { lat: 22.3193, lng: 114.1694, displayName: 'Hong Kong', priority: 1 },
      'singapore': { lat: 1.3521, lng: 103.8198, displayName: 'Singapore', priority: 1 },
      'bangkok': { lat: 13.7563, lng: 100.5018, displayName: 'Bangkok', priority: 1 },
      'dubai': { lat: 25.2048, lng: 55.2708, displayName: 'Dubai', priority: 1 },
      'mumbai': { lat: 19.0760, lng: 72.8777, displayName: 'Mumbai', priority: 1 },
      'delhi': { lat: 28.7041, lng: 77.1025, displayName: 'Delhi', priority: 2 },
      'kuala lumpur': { lat: 3.1390, lng: 101.6869, displayName: 'Kuala Lumpur', priority: 2 },
      'jakarta': { lat: -6.2088, lng: 106.8456, displayName: 'Jakarta', priority: 2 },
      'taipei': { lat: 25.0330, lng: 121.5654, displayName: 'Taipei', priority: 2 },
      'osaka': { lat: 34.6937, lng: 135.5023, displayName: 'Osaka', priority: 2 },
      // Africa & Middle East
      'cape town': { lat: -33.9249, lng: 18.4241, displayName: 'Cape Town', priority: 1 },
      'cairo': { lat: 30.0444, lng: 31.2357, displayName: 'Cairo', priority: 1 },
      'marrakech': { lat: 31.6295, lng: -7.9811, displayName: 'Marrakech', priority: 2 },
      'johannesburg': { lat: -26.2041, lng: 28.0473, displayName: 'Johannesburg', priority: 2 },
      'tel aviv': { lat: 32.0853, lng: 34.7818, displayName: 'Tel Aviv', priority: 2 },
      // Oceania
      'sydney': { lat: -33.8688, lng: 151.2093, displayName: 'Sydney', priority: 1 },
      'melbourne': { lat: -37.8136, lng: 144.9631, displayName: 'Melbourne', priority: 2 },
      'auckland': { lat: -36.8485, lng: 174.7633, displayName: 'Auckland', priority: 2 },
    };

    // Determine which cities to show based on zoom level
    const currentZoom = map.getZoom();
    let maxPriority = 1; // Only show priority 1 cities at very low zoom
    if (currentZoom >= 4) maxPriority = 2;
    if (currentZoom >= 5) maxPriority = 3;

    // Get theme for styling
    const isDarkMode = document.documentElement.classList.contains('dark');

    console.log('🏙️ City labels state:', { showCityLabels, zoom: currentZoom, maxPriority });

    if (showCityLabels) {
      // Hide cluster group
      if (clusterGroup.getLayers().length > 0) {
        map.removeLayer(clusterGroup);
      }

      // Get current map bounds to only show visible cities
      const bounds = map.getBounds();

      // Create city markers for cities in view based on priority
      Object.entries(cityCoords).forEach(([cityKey, cityData]) => {
        // Skip cities with lower priority than current zoom allows
        if (cityData.priority > maxPriority) {
          // Remove existing marker if priority changed
          if (cityMarkersRef.current.has(cityKey)) {
            map.removeLayer(cityMarkersRef.current.get(cityKey)!);
            cityMarkersRef.current.delete(cityKey);
          }
          return;
        }

        if (cityMarkersRef.current.has(cityKey)) return;
        
        // Check if city is within current view bounds
        const cityLatLng = L.latLng(cityData.lat, cityData.lng);
        if (!bounds.contains(cityLatLng)) return;

        const cityIcon = L.divIcon({
          html: `
            <div class="city-label" style="
              background: ${isDarkMode ? 'rgba(30, 41, 59, 0.85)' : 'rgba(200, 200, 200, 0.7)'};
              padding: 4px 12px;
              border-radius: 14px;
              font-weight: 600;
              font-size: 10px;
              color: ${isDarkMode ? '#e2e8f0' : '#374151'};
              box-shadow: 0 2px 6px rgba(0,0,0,0.12);
              white-space: nowrap;
              cursor: pointer;
              transition: transform 0.2s, box-shadow 0.2s;
              backdrop-filter: blur(4px);
              -webkit-backdrop-filter: blur(4px);
              display: inline-block;
            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
              ${cityData.displayName}
            </div>
          `,
          className: 'city-marker-icon',
          iconSize: null as any,
          iconAnchor: [0, 0],
        });

        const marker = L.marker([cityData.lat, cityData.lng], { icon: cityIcon, zIndexOffset: 1000 });
        marker.on('click', () => {
          // Zoom to city and call callback
          map.setView([cityData.lat, cityData.lng], 13, { animate: true });
          onCitySelect?.(cityData.displayName, { lat: cityData.lat, lng: cityData.lng });
        });
        marker.addTo(map);
        cityMarkersRef.current.set(cityKey, marker);
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
            ? 'relative w-full h-full overflow-hidden bg-background'
            : 'relative w-full h-full rounded-lg overflow-hidden'
        }
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          visibility: selectedPostFromPin ? 'hidden' : 'visible',
          pointerEvents: selectedPostFromPin ? 'none' : 'auto'
        }}
      />

      {/* Location sharing controls - positioned at same height as filter dropdown, hidden when filter dropdown is open */}
      {!hideSharingControls && (
        <SharingControls 
          userActiveShare={userActiveShare}
          fullScreen={fullScreen}
          handleEndSharing={handleEndSharing}
          handleUpdateLocation={handleUpdateLocation}
          t={t}
        />
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
            isTemporary: (selectedPlace as any).isTemporary,
          }}
          onClose={() => onCloseSelectedPlace?.()}
          onPostSelected={(postId) => setSelectedPostFromPin(postId)}
          onBack={
            fromMessages && onBackToMessages
              ? onBackToMessages
              : (selectedPlace as any).sourcePostId
                ? () => navigate('/feed', { state: { restorePostId: (selectedPlace as any).sourcePostId } })
                : undefined
          }
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

// Separate component that can use the MapFilter context
const SharingControls = ({ 
  userActiveShare, 
  fullScreen, 
  handleEndSharing, 
  handleUpdateLocation,
  t
}: { 
  userActiveShare: any; 
  fullScreen?: boolean; 
  handleEndSharing: () => void; 
  handleUpdateLocation: () => void;
  t: any;
}) => {
  const { isFilterExpanded, isFriendsDropdownOpen, filterDropdownRightEdge } = useMapFilter();
  
  if (!userActiveShare || isFilterExpanded || isFriendsDropdownOpen) return null;
  
  // Position directly next to the filter dropdown using its right edge + small gap
  const leftPosition = filterDropdownRightEdge + 6; // right edge + 6px gap
  
  return (
    <div 
      className={`${fullScreen ? 'fixed' : 'absolute'} z-[1000] flex gap-1.5`}
      style={{ 
        left: `${leftPosition}px`,
        bottom: fullScreen 
          ? 'calc(env(safe-area-inset-bottom, 0px) + 4.5rem)'
          : 'calc(5.25rem + env(safe-area-inset-bottom, 0px))'
      }}
    >
      <button
        onClick={handleEndSharing}
        className="h-9 px-2.5 rounded-full bg-red-500/80 dark:bg-red-600/80 backdrop-blur-md border border-red-400/30 shadow-lg text-white text-sm font-medium hover:bg-red-600/90 dark:hover:bg-red-700/90 transition-colors whitespace-nowrap"
      >
        {t('endSharing', { ns: 'common', defaultValue: 'Termina' })}
      </button>
      <button
        onClick={handleUpdateLocation}
        className="h-9 px-2.5 rounded-full bg-gray-200/40 dark:bg-slate-800/65 backdrop-blur-md border border-border/30 shadow-lg text-foreground text-sm font-medium hover:bg-gray-300/50 dark:hover:bg-slate-700/70 transition-colors whitespace-nowrap"
      >
        {t('updateLocation', { ns: 'common', defaultValue: 'Aggiorna' })}
      </button>
    </div>
  );
};

export default LeafletMapSetup;
