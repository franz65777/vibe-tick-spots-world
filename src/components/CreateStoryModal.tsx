
import React, { useState, useRef } from 'react';
import { X, Camera, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useGeolocation } from '@/hooks/useGeolocation';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated: () => void;
}

interface LocationData {
  name: string;
  address: string;
  coordinates: { lat: number; lng: number };
}

const CreateStoryModal = ({ isOpen, onClose, onStoryCreated }: CreateStoryModalProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadStory, uploading } = useMediaUpload();
  const { location, getCurrentLocation } = useGeolocation();

  // Extract location from photo EXIF data
  const extractLocationFromPhoto = async (file: File): Promise<{ lat: number; lng: number } | null> => {
    try {
      // For now, we'll use the device's current location as fallback
      // In a real implementation, you'd use an EXIF library to extract GPS data
      getCurrentLocation();
      if (location) {
        return {
          lat: location.latitude,
          lng: location.longitude
        };
      }
    } catch (error) {
      console.error('Error extracting location:', error);
    }
    return null;
  };

  // Reverse geocode coordinates to get location name
  const reverseGeocode = async (lat: number, lng: number): Promise<LocationData | null> => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=AIzaSyDGVKK3IvDz3N0vCDX7XHKa0wHkZl6kLOY`
      );
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const locationName = result.address_components.find((comp: any) => 
          comp.types.includes('establishment') || comp.types.includes('point_of_interest')
        )?.long_name || result.address_components.find((comp: any) => 
          comp.types.includes('locality')
        )?.long_name || 'Unknown Location';

        return {
          name: locationName,
          address: result.formatted_address,
          coordinates: { lat, lng }
        };
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
    return null;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    
    // Try to extract and set location automatically
    setIsLoadingLocation(true);
    const coordinates = await extractLocationFromPhoto(file);
    if (coordinates) {
      const location = await reverseGeocode(coordinates.lat, coordinates.lng);
      setLocationData(location);
    }
    setIsLoadingLocation(false);
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    try {
      const result = await uploadStory(
        selectedFile,
        caption,
        undefined, // locationId
        locationData?.name,
        locationData?.address
      );

      if (result.success) {
        onStoryCreated();
        handleClose();
      }
    } catch (error) {
      console.error('Error uploading story:', error);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption('');
    setLocationData(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Create Story</h2>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-4">
          {!selectedFile ? (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100"
                variant="outline"
              >
                <div className="text-center">
                  <Camera className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-600">Select Photo or Video</p>
                </div>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview */}
              <div className="relative">
                {selectedFile.type.startsWith('image/') ? (
                  <img
                    src={previewUrl!}
                    alt="Preview"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                ) : (
                  <video
                    src={previewUrl!}
                    className="w-full h-64 object-cover rounded-lg"
                    controls
                  />
                )}
              </div>

              {/* Caption */}
              <Textarea
                placeholder="Write a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
              />

              {/* Location */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium">Location</span>
                  {isLoadingLocation && (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  )}
                </div>
                {locationData ? (
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <p className="font-medium text-blue-800">{locationData.name}</p>
                    <p className="text-sm text-blue-600">{locationData.address}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    {isLoadingLocation ? 'Detecting location...' : 'No location detected'}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={uploading}
                  className="flex-1"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sharing...
                    </>
                  ) : (
                    'Share Story'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateStoryModal;
