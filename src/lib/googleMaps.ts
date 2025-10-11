
// Google Maps API configuration and loader
declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
    [key: string]: any; // Allow dynamic callback properties
  }
}

import { Loader } from '@googlemaps/js-api-loader';

// Get API key from environment variable (configured with domain restrictions in Google Cloud Console)
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const getGoogleMapsApiKey = (): string => {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key not configured. Please add VITE_GOOGLE_MAPS_API_KEY to your .env file');
  }
  return GOOGLE_MAPS_API_KEY;
};

export const loadGoogleMapsAPI = (): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    if (isGoogleMapsLoaded()) {
      console.log('Google Maps already loaded');
      resolve();
      return;
    }

    try {
      const apiKey = getGoogleMapsApiKey();
      console.log('🗺️ Initializing Google Maps via official Loader');
      const loader = new Loader({
        apiKey,
        version: 'weekly',
        libraries: ['places', 'geometry']
      });

      console.log('📥 Loading Google Maps API...');
      await loader.load();
      console.log('✅ Google Maps API loaded successfully');

      // Wait a bit for everything to be ready
      setTimeout(() => {
        if (window.google && window.google.maps && window.google.maps.Map) {
          console.log('Google Maps loaded successfully');
          resolve();
        } else {
          console.error('Google Maps loaded but Map component not ready');
          reject(new Error('Google Maps Map component not ready'));
        }
      }, 100);
      
    } catch (error: any) {
      console.error('Failed to load Google Maps via Loader:', error);
      reject(error);
    }
  });
};

export const isGoogleMapsLoaded = (): boolean => {
  const loaded = typeof window !== 'undefined' &&
                 typeof window.google !== 'undefined' && 
                 window.google.maps && 
                 window.google.maps.Map;
  
  return loaded;
};

// Utility function to wait for Google Maps to be ready
export const waitForGoogleMaps = (timeout = 15000): Promise<void> => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkReady = () => {
      if (isGoogleMapsLoaded()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('Timeout waiting for Google Maps'));
      } else {
        setTimeout(checkReady, 100);
      }
    };
    
    checkReady();
  });
};

// Fetch Google Place Details (types, name, address, geometry)
export const getPlaceDetails = async (
  placeId: string
): Promise<{ types: string[]; name?: string; formatted_address?: string; location?: { lat: number; lng: number } }> => {
  await loadGoogleMapsAPI();
  await waitForGoogleMaps();

  return new Promise((resolve, reject) => {
    try {
      const service = new window.google.maps.places.PlacesService(document.createElement('div'));
      service.getDetails(
        { placeId, fields: ['place_id', 'types', 'name', 'formatted_address', 'geometry'] },
        (result: any, status: any) => {
          const ok = window.google.maps.places.PlacesServiceStatus.OK;
          if (status === ok && result) {
            const location = result.geometry?.location
              ? { lat: result.geometry.location.lat(), lng: result.geometry.location.lng() }
              : undefined;
            resolve({
              types: result.types || [],
              name: result.name,
              formatted_address: result.formatted_address,
              location,
            });
          } else {
            reject(new Error(`Place details failed: ${status}`));
          }
        }
      );
    } catch (e) {
      reject(e);
    }
  });
};
