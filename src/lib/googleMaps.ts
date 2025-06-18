
// Google Maps API configuration and loader
declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
  }
}

const GOOGLE_MAPS_API_KEY = 'AIzaSyDpY-PO8Gh6O1wZEQ4pkvr6U1kC-dq2uTg';

export const loadGoogleMapsAPI = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if Google Maps is already loaded
    if (typeof window.google !== 'undefined' && 
        window.google.maps && 
        window.google.maps.places && 
        window.google.maps.places.Autocomplete) {
      console.log('Google Maps and Places API already loaded');
      resolve();
      return;
    }

    // Check if script is already loading
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      console.log('Google Maps script already exists, waiting for load...');
      const checkLoaded = () => {
        if (typeof window.google !== 'undefined' && 
            window.google.maps && 
            window.google.maps.places && 
            window.google.maps.places.Autocomplete) {
          console.log('Google Maps and Places API loaded via existing script');
          resolve();
        } else {
          setTimeout(checkLoaded, 100);
        }
      };
      checkLoaded();
      return;
    }

    // Create and load the script
    console.log('Creating new Google Maps script with Places API...');
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    
    // Create a global callback
    window.initGoogleMaps = () => {
      console.log('Google Maps API with Places loaded successfully via callback');
      delete window.initGoogleMaps; // Clean up
      resolve();
    };
    
    script.onerror = (error) => {
      console.error('Failed to load Google Maps API:', error);
      delete window.initGoogleMaps; // Clean up
      reject(new Error('Failed to load Google Maps API'));
    };

    document.head.appendChild(script);
  });
};

export const isGoogleMapsLoaded = (): boolean => {
  const loaded = typeof window.google !== 'undefined' && 
         window.google.maps && 
         window.google.maps.places &&
         window.google.maps.places.Autocomplete;
  console.log('Google Maps and Places API loaded status:', loaded);
  return loaded;
};
