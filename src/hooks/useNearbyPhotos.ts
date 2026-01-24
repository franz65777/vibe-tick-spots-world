import { useState, useCallback } from 'react';
import exifr from 'exifr';

export interface NearbyPhoto {
  file: File;
  url: string;
  distance: number; // meters from location
  timestamp?: Date;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

interface UseNearbyPhotosOptions {
  locationLat: number;
  locationLng: number;
  radiusMeters?: number;
}

export const useNearbyPhotos = ({
  locationLat,
  locationLng,
  radiusMeters = 500,
}: UseNearbyPhotosOptions) => {
  const [photos, setPhotos] = useState<NearbyPhoto[]>([]);
  const [allPhotos, setAllPhotos] = useState<NearbyPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);

  const scanPhotos = useCallback(
    async (files: FileList | File[]) => {
      setLoading(true);
      setScannedCount(0);
      const nearbyPhotos: NearbyPhoto[] = [];
      const otherPhotos: NearbyPhoto[] = [];

      const fileArray = Array.from(files);

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        setScannedCount(i + 1);

        try {
          // Use exifr to parse GPS data
          const exif = await exifr.parse(file, {
            gps: true,
            pick: ['DateTimeOriginal', 'latitude', 'longitude'],
          });

          if (exif?.latitude && exif?.longitude) {
            const distance = calculateDistance(
              locationLat,
              locationLng,
              exif.latitude,
              exif.longitude
            );

            const photoData: NearbyPhoto = {
              file,
              url: URL.createObjectURL(file),
              distance,
              timestamp: exif.DateTimeOriginal
                ? new Date(exif.DateTimeOriginal)
                : undefined,
            };

            if (distance <= radiusMeters) {
              nearbyPhotos.push(photoData);
            } else {
              otherPhotos.push(photoData);
            }
          } else {
            // No GPS data - add to other photos with max distance
            otherPhotos.push({
              file,
              url: URL.createObjectURL(file),
              distance: Infinity,
              timestamp: undefined,
            });
          }
        } catch (e) {
          // Skip files that can't be parsed - still add them as options
          otherPhotos.push({
            file,
            url: URL.createObjectURL(file),
            distance: Infinity,
            timestamp: undefined,
          });
        }
      }

      // Sort by distance (closest first)
      nearbyPhotos.sort((a, b) => a.distance - b.distance);
      otherPhotos.sort((a, b) => a.distance - b.distance);

      setPhotos(nearbyPhotos);
      setAllPhotos([...nearbyPhotos, ...otherPhotos]);
      setLoading(false);

      return { nearbyPhotos, otherPhotos };
    },
    [locationLat, locationLng, radiusMeters]
  );

  const clearPhotos = useCallback(() => {
    // Revoke object URLs to free memory
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    allPhotos.forEach((p) => URL.revokeObjectURL(p.url));
    setPhotos([]);
    setAllPhotos([]);
    setScannedCount(0);
  }, [photos, allPhotos]);

  return {
    /** Photos detected within the radius */
    nearbyPhotos: photos,
    /** All scanned photos (nearby + others) */
    allPhotos,
    loading,
    scannedCount,
    scanPhotos,
    clearPhotos,
  };
};
