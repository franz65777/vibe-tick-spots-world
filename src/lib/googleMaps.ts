
// Google Maps API configuration and loader
declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
    [key: string]: any; // Allow dynamic callback properties
  }
}

import { supabase } from '@/integrations/supabase/client';
import { Loader } from '@googlemaps/js-api-loader';

// Securely fetch API key from Supabase edge function
let GOOGLE_MAPS_API_KEY: string | null = null;

const fetchGoogleMapsApiKey = async (): Promise<string> => {
  if (GOOGLE_MAPS_API_KEY) {
    return GOOGLE_MAPS_API_KEY;
  }

  try {
    console.log('Fetching Google Maps API key from Supabase...');
    const { data, error } = await supabase.functions.invoke('google-maps-config');
    
    if (error) {
      console.error('Error fetching Google Maps API key:', error);
      throw new Error('Failed to fetch Google Maps API key');
    }
    
    if (!data?.apiKey) {
      throw new Error('No API key returned from server');
    }
    
    GOOGLE_MAPS_API_KEY = data.apiKey;
    console.log('Google Maps API key fetched successfully');
    return GOOGLE_MAPS_API_KEY;
  } catch (error) {
    console.error('Error fetching Google Maps API key:', error);
    throw error;
  }
};

export const loadGoogleMapsAPI = (): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    if (isGoogleMapsLoaded()) {
      console.log('Google Maps already loaded');
      resolve();
      return;
    }

    try {
      const apiKey = await fetchGoogleMapsApiKey();
      console.log('Initializing Google Maps via official Loader...');
      const loader = new Loader({
        apiKey,
        version: 'weekly',
        libraries: ['places']
      });

      await loader.load();

      if (isGoogleMapsLoaded()) {
        console.log('Google Maps and Places API loaded successfully via Loader');
        resolve();
      } else {
        console.error('Google Maps loaded but Places components not ready');
        reject(new Error('Google Maps components not ready'));
      }
    } catch (error: any) {
      console.error('Failed to load Google Maps via Loader:', error);
      reject(error);
    }
  });
};

export const isGoogleMapsLoaded = (): boolean => {
  const loaded = typeof window.google !== 'undefined' && 
         window.google.maps && 
         window.google.maps.Map &&
         window.google.maps.places &&
         window.google.maps.places.Autocomplete;
  
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
