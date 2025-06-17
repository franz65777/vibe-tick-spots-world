
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Camera, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePostCreation } from '@/hooks/usePostCreation';
import GooglePlacesAutocomplete from './GooglePlacesAutocomplete';

const AddLocationPage = () => {
  const navigate = useNavigate();
  const { createPost, uploading } = usePostCreation();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<{
    place_id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    types: string[];
  } | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) return;

    // Validate files
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        alert(`${file.name} is not a valid image or video file`);
        return false;
      }
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        alert(`${file.name} is too large. Maximum file size is 50MB`);
        return false;
      }
      return true;
    });

    setSelectedFiles(validFiles);
    
    // Create preview URLs
    const urls = validFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
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
  };

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select at least one photo or video');
      return;
    }

    if (!selectedLocation) {
      alert('Please select a location from Google Maps');
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
        navigate('/');
      } else {
        alert('Failed to create post. Please try again.');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white pt-16">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="p-2">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-lg font-semibold">Add Post</h1>
        <Button
          onClick={handleSubmit}
          disabled={uploading || selectedFiles.length === 0 || !selectedLocation}
          className="px-6"
        >
          {uploading ? 'Posting...' : 'Share'}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Media Upload Section */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Photos & Videos</h2>
          
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
                className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <Camera className="w-12 h-12 text-gray-400 mb-2" />
                <span className="text-gray-600 font-medium">Add photos or videos</span>
                <span className="text-gray-400 text-sm">Tap to select from gallery</span>
              </label>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden">
                    {selectedFiles[index].type.startsWith('image/') ? (
                      <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                    ) : (
                      <video src={url} className="w-full h-full object-cover" />
                    )}
                    <button
                      onClick={() => removeFile(index)}
                      className="absolute top-2 right-2 w-6 h-6 bg-black bg-opacity-50 rounded-full flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4 text-white rotate-45" />
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
                className="flex items-center justify-center gap-2 w-full py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <Plus className="w-5 h-5 text-gray-500" />
                <span className="text-gray-600">Add more</span>
              </label>
            </div>
          )}
        </div>

        {/* Location Selection */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Location</h2>
          <GooglePlacesAutocomplete
            onPlaceSelect={handleLocationSelect}
            placeholder="Search for a location..."
          />
          
          {selectedLocation && (
            <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-blue-900 truncate">{selectedLocation.name}</h3>
                  <p className="text-sm text-blue-700 mt-1">{selectedLocation.address}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Caption */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Caption</h2>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption..."
            className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            maxLength={500}
          />
          <div className="text-xs text-gray-500 mt-1 text-right">
            {caption.length}/500
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddLocationPage;
