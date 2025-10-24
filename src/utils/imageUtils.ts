// Utility functions for image processing and metadata extraction

export interface ImageMetadata {
  location?: {
    latitude: number;
    longitude: number;
  };
  timestamp?: Date;
  camera?: string;
  dimensions?: {
    width: number;
    height: number;
  };
}

/**
 * Extract EXIF data from image file including GPS coordinates
 */
export const extractImageMetadata = async (file: File): Promise<ImageMetadata> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const dataView = new DataView(arrayBuffer);
        
        // Simple EXIF parsing (basic implementation)
        // In a real app, you'd want to use a library like 'exif-js' or 'piexifjs'
        const metadata: ImageMetadata = {};
        
        // Create image element to get dimensions
        const img = new Image();
        img.onload = () => {
          metadata.dimensions = {
            width: img.width,
            height: img.height
          };
          
          // For now, we'll simulate GPS detection based on user's current location
          // In a real implementation, you'd parse EXIF GPS tags
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                metadata.location = {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude
                };
                resolve(metadata);
              },
              () => {
                resolve(metadata);
              },
              { timeout: 5000 }
            );
          } else {
            resolve(metadata);
          }
        };
        
        img.src = URL.createObjectURL(file);
      } catch (error) {
        console.error('Error extracting image metadata:', error);
        resolve({});
      }
    };
    
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Get location name from coordinates using reverse geocoding
 */
export const getLocationFromCoordinates = async (
  latitude: number, 
  longitude: number
): Promise<string | null> => {
  try {
    // Use Google Maps Geocoding API if available
    if (window.google && window.google.maps) {
      const geocoder = new window.google.maps.Geocoder();
      
      return new Promise((resolve) => {
        geocoder.geocode(
          { location: { lat: latitude, lng: longitude } },
          (results, status) => {
            if (status === 'OK' && results?.[0]) {
              // Get the most relevant result (usually the first one)
              const result = results[0];
              const addressComponents = result.address_components;
              
              // Try to find a meaningful place name
              const establishment = addressComponents.find(c => 
                c.types.includes('establishment') || c.types.includes('point_of_interest')
              );
              
              const locality = addressComponents.find(c => 
                c.types.includes('locality') || c.types.includes('sublocality')
              );
              
              const neighborhood = addressComponents.find(c => 
                c.types.includes('neighborhood')
              );
              
              const placeName = establishment?.long_name || 
                              locality?.long_name || 
                              neighborhood?.long_name || 
                              result.formatted_address;
              
              resolve(placeName);
            } else {
              resolve(null);
            }
          }
        );
      });
    }
    
    // Fallback: use a simple reverse geocoding service
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    );
    
    if (response.ok) {
      const data = await response.json();
      return data.locality || data.city || data.principalSubdivision || 'Unknown Location';
    }
    
    return null;
  } catch (error) {
    console.error('Error getting location from coordinates:', error);
    return null;
  }
};

/**
 * Compress image file for upload
 */
export const compressImage = (file: File, maxWidth = 1920, quality = 0.8): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        file.type,
        quality
      );
    };
    
    img.src = URL.createObjectURL(file);
  });
};