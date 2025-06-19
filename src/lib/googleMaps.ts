
// Google Maps API configuration and loader
declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
    [key: string]: any; // Allow dynamic callback properties
  }
}

// Your Google Maps API key
const GOOGLE_MAPS_API_KEY = 'AIzaSyDpY-PO8Gh6O1wZEQ4pkvr6U1kC-dq2uTg';

export const loadGoogleMapsAPI = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if Google Maps is already loaded and ready
    if (typeof window.google !== 'undefined' && 
        window.google.maps && 
        window.google.maps.Map) {
      console.log('Google Maps API already loaded');
      resolve();
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      console.log('Google Maps script already exists, waiting...');
      
      const checkReady = () => {
        if (typeof window.google !== 'undefined' && 
            window.google.maps && 
            window.google.maps.Map) {
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };
      
      setTimeout(() => {
        if (typeof window.google === 'undefined' || !window.google.maps) {
          reject(new Error('Google Maps loading timeout'));
        }
      }, 10000);
      
      checkReady();
      return;
    }

    // Create callback name
    const callbackName = 'initGoogleMaps_' + Date.now();
    
    (window as any)[callbackName] = () => {
      console.log('Google Maps API loaded successfully');
      delete (window as any)[callbackName];
      resolve();
    };
    
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    
    script.onerror = () => {
      delete (window as any)[callbackName];
      reject(new Error('Failed to load Google Maps API'));
    };

    document.head.appendChild(script);
  });
};

export const isGoogleMapsLoaded = (): boolean => {
  return typeof window.google !== 'undefined' && 
         window.google.maps && 
         window.google.maps.Map;
};
