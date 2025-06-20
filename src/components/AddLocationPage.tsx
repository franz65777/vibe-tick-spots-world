
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Camera, Plus, X, Play, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { usePostCreation } from '@/hooks/usePostCreation';
import GooglePlacesAutocomplete from './GooglePlacesAutocomplete';
import { toast } from 'sonner';

const AddLocationPage = () => {
  const navigate = useNavigate();
  const { createPost, uploading } = usePostCreation();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState('');
  const [allowComments, setAllowComments] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<{
    place_id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    types: string[];
  } | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showLocationWarning, setShowLocationWarning] = useState(false);

  // Get user location and nearby places
  useEffect(() => {
    const getCurrentLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation({ lat: latitude, lng: longitude });
            // Mock nearby places based on location
            setNearbyPlaces([
              { name: 'Blue Bottle Coffee', address: '300 Broadway, San Francisco', distance: '0.3km' },
              { name: 'Golden Gate Park', address: 'Golden Gate Park, San Francisco', distance: '1.2km' },
              { name: 'Lombard Street', address: 'Lombard St, San Francisco', distance: '2.1km' }
            ]);
          },
          (error) => {
            console.error('Error getting location:', error);
          }
        );
      }
    };

    getCurrentLocation();
  }, []);

  // Extract location from EXIF data (mock implementation)
  const extractLocationFromMedia = async (file: File) => {
    // This would normally use EXIF.js or similar library
    // For now, return mock data
    return null;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) return;

    // Validate files
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast.error(`${file.name} is not a valid image or video file`);
        return false;
      }
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast.error(`${file.name} is too large. Maximum file size is 50MB`);
        return false;
      }
      return true;
    });

    // Try to extract location from first file
    if (validFiles.length > 0) {
      const locationFromMedia = await extractLocationFromMedia(validFiles[0]);
      if (locationFromMedia) {
        // Auto-suggest location based on media metadata
        toast.success('Location detected from image metadata');
      }
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
    
    // Create preview URLs
    const newUrls = validFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...newUrls]);
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newUrls = previewUrls.filter((_, i) => i !== index);
    
    // Revoke the removed URL to free memory
    URL.revokeObjectURL(previewUrls[index]);
    
    setSelectedFiles(newFiles);
    setPreviewUrls(newUrls);
  };

  const handleLocationSelect = (place: {
    place_id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    types: string[];
  }) => {
    setSelectedLocation(place);
    setShowLocationWarning(false);
    toast.success(`Location selected: ${place.name}`);
  };

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one photo or video');
      return;
    }

    if (!selectedLocation) {
      setShowLocationWarning(true);
      toast.error('Please select a location to continue');
      return;
    }

    try {
      const result = await createPost({
        caption: caption.trim() || undefined,
        files: selectedFiles,
        location: {
          google_place_id: selectedLocation.place_id,
          name: selectedLocation.name,
          address: selectedLocation.address,
          latitude: selectedLocation.lat,
          longitude: selectedLocation.lng,
          types: selectedLocation.types
        }
      });

      if (result.success) {
        // Clean up preview URLs
        previewUrls.forEach(url => URL.revokeObjectURL(url));
        toast.success('Post shared successfully!');
        navigate('/');
      } else {
        toast.error('Failed to create post. Please try again.');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post. Please try again.');
    }
  };

  const getFileType = (file: File) => {
    return file.type.startsWith('video/') ? 'video' : 'image';
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 pt-16">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-100 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">New Post</h1>
        <Button
          onClick={handleSubmit}
          disabled={uploading || selectedFiles.length === 0 || !selectedLocation}
          className="px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 rounded-full font-semibold"
        >
          {uploading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              Uploading...
            </>
          ) : (
            'Share'
          )}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Media Preview Thumbnail (Instagram-style) */}
        {selectedFiles.length > 0 && (
          <div className="bg-white p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shadow-sm">
                {getFileType(selectedFiles[0]) === 'video' ? (
                  <div className="relative w-full h-full">
                    <video src={previewUrls[0]} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <Play className="w-6 h-6 text-white" />
                    </div>
                  </div>
                ) : (
                  <img src={previewUrls[0]} alt="Preview" className="w-full h-full object-cover" />
                )}
                {selectedFiles.length > 1 && (
                  <div className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {selectedFiles.length}
                  </div>
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'} selected
                </p>
                <p className="text-sm text-gray-500">
                  {selectedFiles.some(f => getFileType(f) === 'video') ? 'Photos & Videos' : 'Photos'}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 space-y-6">
          {/* Media Upload Section */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Add Photos & Videos</h2>
            
            {selectedFiles.length === 0 ? (
              <div>
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  id="media-upload"
                />
                <label
                  htmlFor="media-upload"
                  className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer bg-white"
                >
                  <div className="p-4 bg-blue-100 rounded-full mb-3">
                    <Camera className="w-8 h-8 text-blue-600" />
                  </div>
                  <span className="text-gray-900 font-semibold text-lg">Add photos or videos</span>
                  <span className="text-gray-500 text-sm mt-1">Tap to select from gallery</span>
                </label>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="relative aspect-square bg-gray-100 rounded-2xl overflow-hidden shadow-sm">
                      {getFileType(selectedFiles[index]) === 'video' ? (
                        <div className="relative w-full h-full">
                          <video src={url} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                            <Play className="w-8 h-8 text-white" />
                          </div>
                        </div>
                      ) : (
                        <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                      )}
                      <button
                        onClick={() => removeFile(index)}
                        className="absolute top-2 right-2 w-7 h-7 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors shadow-md"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
                
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  id="media-upload-more"
                />
                <label
                  htmlFor="media-upload-more"
                  className="flex items-center justify-center gap-2 w-full py-4 border border-gray-300 rounded-2xl hover:bg-gray-50 transition-colors cursor-pointer bg-white"
                >
                  <Plus className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-600 font-medium">Add more</span>
                </label>
              </div>
            )}
          </div>

          {/* Location Selection */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Tag Location *
            </h2>
            
            {showLocationWarning && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
                <p className="text-red-800 text-sm font-medium">⚠️ Location is required to share your post</p>
              </div>
            )}

            <GooglePlacesAutocomplete
              onPlaceSelect={handleLocationSelect}
              placeholder="Search for a place..."
              className="mb-3"
            />
            
            {/* Nearby Places Suggestions */}
            {nearbyPlaces.length > 0 && !selectedLocation && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Nearby places:</p>
                <div className="space-y-2">
                  {nearbyPlaces.map((place, index) => (
                    <button
                      key={index}
                      className="w-full text-left p-3 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                      onClick={() => {
                        // This would normally use the actual place data
                        console.log('Select nearby place:', place.name);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{place.name}</p>
                          <p className="text-sm text-gray-500">{place.address}</p>
                        </div>
                        <span className="text-xs text-blue-600 font-medium">{place.distance}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {selectedLocation && (
              <div className="p-4 bg-green-50 rounded-2xl border border-green-200">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-green-900 truncate">{selectedLocation.name}</h3>
                    <p className="text-sm text-green-700 mt-1">{selectedLocation.address}</p>
                    <p className="text-xs text-green-600 mt-1">
                      {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Caption */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Write a Caption</h2>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What's the story behind this place? Share your experience..."
              className="w-full p-4 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white text-gray-900 placeholder-gray-500"
              rows={4}
              maxLength={1000}
            />
            <div className="text-xs text-gray-500 mt-2 text-right">
              {caption.length}/1000 characters
            </div>
          </div>

          {/* Post Settings */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Post Settings
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Allow comments</p>
                <p className="text-sm text-gray-500">Let others comment on your post</p>
              </div>
              <Switch
                checked={allowComments}
                onCheckedChange={setAllowComments}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddLocationPage;
