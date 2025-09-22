
// Google Maps API configuration and loader
declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
    [key: string]: any; // Allow dynamic callback properties
  }
}

import { supabase } from '@/integrations/supabase/client';

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
    // Check if Google Maps is already loaded and ready
    if (typeof window.google !== 'undefined' && 
        window.google.maps && 
        window.google.maps.Map &&
        window.google.maps.places && 
        window.google.maps.places.Autocomplete) {
      console.log('Google Maps and Places API already loaded and ready');
      resolve();
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      console.log('Google Maps script already exists, waiting for it to load...');
      
      const checkReady = () => {
        if (typeof window.google !== 'undefined' && 
            window.google.maps && 
            window.google.maps.Map &&
            window.google.maps.places && 
            window.google.maps.places.Autocomplete) {
          console.log('Google Maps and Places API ready via existing script');
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };
      
      // Set a timeout to avoid infinite waiting
      setTimeout(() => {
        if (typeof window.google === 'undefined' || !window.google.maps) {
          console.error('Google Maps failed to load within timeout');
          reject(new Error('Google Maps loading timeout'));
        }
      }, 15000);
      
      checkReady();
      return;
    }

    // Fetch API key first
    let apiKey: string;
    try {
      apiKey = await fetchGoogleMapsApiKey();
    } catch (error) {
      console.error('Failed to get Google Maps API key:', error);
      reject(new Error('Failed to get Google Maps API key: ' + error.message));
      return;
    }

    // Create and load the script with proper callback
    console.log('Loading Google Maps API with Places library...');
    
    // Create a unique callback name to avoid conflicts
    const callbackName = 'initGoogleMaps_' + Date.now();
    
    // Use type assertion to avoid TypeScript error
    (window as any)[callbackName] = () => {
      console.log('Google Maps API loaded successfully via callback');
      delete (window as any)[callbackName]; // Clean up
      
      // Double-check that everything is ready
      if (typeof window.google !== 'undefined' && 
          window.google.maps && 
          window.google.maps.Map &&
          window.google.maps.places && 
          window.google.maps.places.Autocomplete) {
        resolve();
      } else {
        console.error('Google Maps API loaded but components not ready');
        reject(new Error('Google Maps components not ready'));
      }
    };
    
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    
    script.onerror = (error) => {
      console.error('Failed to load Google Maps API script:', error);
      delete (window as any)[callbackName]; // Clean up
      reject(new Error('Failed to load Google Maps API script'));
    };

    document.head.appendChild(script);
    console.log('Google Maps script added to document');
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
