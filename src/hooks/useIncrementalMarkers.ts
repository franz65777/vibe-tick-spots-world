import { useRef, useCallback } from 'react';
import L from 'leaflet';
import { Place } from '@/types/place';
import { createLeafletCustomMarker } from '@/utils/leafletMarkerCreator';

interface MarkerConfig {
  category: string;
  name?: string;
  isSaved?: boolean;
  isRecommended?: boolean;
  recommendationScore?: number;
  friendAvatars?: string[];
  isDarkMode: boolean;
  hasCampaign?: boolean;
  campaignType?: string;
  sharedByUsers?: Array<{ id: string; username: string; avatar_url: string | null }>;
  isSelected?: boolean;
}

interface UseIncrementalMarkersReturn {
  updateMarkers: (
    places: Place[],
    map: L.Map,
    clusterGroup: L.MarkerClusterGroup,
    config: {
      isDarkMode: boolean;
      selectedPlaceId?: string;
      campaignMap: Map<string, string>;
      sharesMap: Map<string, Array<{ id: string; username: string; avatar_url: string | null }>>;
      zoom: number;
      onPinClick?: (place: Place) => void;
      onSharersClick?: (name: string, sharers: any[]) => void;
    }
  ) => void;
  clearMarkers: (clusterGroup: L.MarkerClusterGroup) => void;
  getMarker: (id: string) => L.Marker | undefined;
}

/**
 * Hook for incremental marker updates - only adds/removes/updates changed markers
 * instead of clearing and rebuilding all markers on every change.
 */
export function useIncrementalMarkers(): UseIncrementalMarkersReturn {
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const markerConfigsRef = useRef<Map<string, string>>(new Map()); // Stores JSON config for change detection

  const updateMarkers = useCallback((
    places: Place[],
    map: L.Map,
    clusterGroup: L.MarkerClusterGroup,
    config: {
      isDarkMode: boolean;
      selectedPlaceId?: string;
      campaignMap: Map<string, string>;
      sharesMap: Map<string, Array<{ id: string; username: string; avatar_url: string | null }>>;
      zoom: number;
      onPinClick?: (place: Place) => void;
      onSharersClick?: (name: string, sharers: any[]) => void;
    }
  ) => {
    const { isDarkMode, selectedPlaceId, campaignMap, sharesMap, zoom, onPinClick, onSharersClick } = config;
    
    // Create sets for efficient lookup
    const newPlaceIds = new Set(places.map(p => p.id));
    const existingIds = new Set(markersRef.current.keys());
    
    // 1. Remove markers that no longer exist
    existingIds.forEach(id => {
      if (!newPlaceIds.has(id)) {
        const marker = markersRef.current.get(id);
        if (marker) {
          clusterGroup.removeLayer(marker);
          markersRef.current.delete(id);
          markerConfigsRef.current.delete(id);
        }
      }
    });
    
    // 2. Add or update markers
    places.forEach(place => {
      if (!place.coordinates?.lat || !place.coordinates?.lng) return;
      
      const hasCampaign = campaignMap.has(place.id);
      const campaignType = campaignMap.get(place.id);
      const sharedByUsers = sharesMap.get(place.id);
      const isSelected = selectedPlaceId === place.id;
      const shouldShowLabel = zoom >= 14 || isSelected;
      
      // Create config hash for change detection
      const markerConfigKey = JSON.stringify({
        category: place.category,
        name: shouldShowLabel ? place.name : undefined,
        isSaved: place.isSaved,
        isRecommended: place.isRecommended,
        isDarkMode,
        hasCampaign,
        campaignType,
        sharedByUsersCount: sharedByUsers?.length || 0,
        isSelected,
        lat: place.coordinates.lat,
        lng: place.coordinates.lng,
      });
      
      const existingMarker = markersRef.current.get(place.id);
      const existingConfig = markerConfigsRef.current.get(place.id);
      
      // Skip if marker exists and config hasn't changed
      if (existingMarker && existingConfig === markerConfigKey) {
        return;
      }
      
      // Create new icon
      const icon = createLeafletCustomMarker({
        category: place.category || 'attraction',
        name: shouldShowLabel ? place.name : undefined,
        isSaved: place.isSaved,
        isRecommended: place.isRecommended,
        recommendationScore: place.recommendationScore,
        friendAvatars: [],
        isDarkMode,
        hasCampaign,
        campaignType,
        sharedByUsers: sharedByUsers?.length ? sharedByUsers : undefined,
        isSelected,
      });
      
      if (existingMarker) {
        // Update existing marker
        existingMarker.setIcon(icon);
        existingMarker.setLatLng([place.coordinates.lat, place.coordinates.lng]);
        markerConfigsRef.current.set(place.id, markerConfigKey);
      } else {
        // Create new marker
        const marker = L.marker([place.coordinates.lat, place.coordinates.lng], { icon });
        
        marker.on('click', (e) => {
          const target = (e.originalEvent as any).target;
          if (target?.closest('.location-sharers-badge') && sharedByUsers && sharedByUsers.length > 1) {
            e.originalEvent.stopPropagation();
            onSharersClick?.(place.name, sharedByUsers);
            return;
          }
          
          // Bounce animation
          const el = marker.getElement();
          if (el) {
            el.style.animation = 'bounce 0.7s ease-in-out';
            setTimeout(() => (el.style.animation = ''), 700);
          }
          
          onPinClick?.(place);
        });
        
        clusterGroup.addLayer(marker);
        markersRef.current.set(place.id, marker);
        markerConfigsRef.current.set(place.id, markerConfigKey);
      }
    });
  }, []);

  const clearMarkers = useCallback((clusterGroup: L.MarkerClusterGroup) => {
    markersRef.current.forEach((marker) => {
      clusterGroup.removeLayer(marker);
    });
    markersRef.current.clear();
    markerConfigsRef.current.clear();
  }, []);

  const getMarker = useCallback((id: string) => {
    return markersRef.current.get(id);
  }, []);

  return {
    updateMarkers,
    clearMarkers,
    getMarker,
  };
}
