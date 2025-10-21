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
 * Now using FREE OpenStreetMap Nominatim (was costing $5/1000 with Google)
 */
export const getLocationFromCoordinates = async (
  latitude: number, 
  longitude: number
): Promise<string | null> => {
  try {
    // Use FREE Nominatim reverse geocoding
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SpottApp/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.display_name) {
      // Return the formatted address
      return data.display_name;
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