
// Google Maps API configuration and loader
declare global {
  interface Window {
    google: any;
  }
}

const GOOGLE_MAPS_API_KEY = 'AIzaSyDpY-PO8Gh6O1wZEQ4pkvr6U1kC-dq2uTg';

export const loadGoogleMapsAPI = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if Google Maps is already loaded
    if (typeof window.google !== 'undefined' && window.google.maps) {
      resolve();
      return;
    }

    // Check if script is already loading
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      // Wait for it to load
      const checkLoaded = () => {
        if (typeof window.google !== 'undefined' && window.google.maps) {
          resolve();
        } else {
          setTimeout(checkLoaded, 100);
        }
      };
      checkLoaded();
      return;
    }

    // Create and load the script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log('Google Maps API loaded successfully');
      resolve();
    };
    
    script.onerror = () => {
      console.error('Failed to load Google Maps API');
      reject(new Error('Failed to load Google Maps API'));
    };

    document.head.appendChild(script);
  });
};

export const isGoogleMapsLoaded = (): boolean => {
  return typeof window.google !== 'undefined' && 
         window.google.maps && 
         window.google.maps.places;
};
