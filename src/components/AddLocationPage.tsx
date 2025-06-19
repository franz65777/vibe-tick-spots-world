import React, { useState, useRef } from 'react';
import { ArrowLeft, Camera, MapPin, Plus, X, Check, Loader2, Image as ImageIcon, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useLocationTagging } from '@/hooks/useLocationTagging';
import { useMediaUpload } from '@/hooks/useMediaUpload';

const AddLocationPage = () => {
  const [selectedMedia, setSelectedMedia] = useState<File[]>([]);
  const [caption, setCaption] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { nearbyPlaces, recentLocations, searchLocations, getCurrentLocation } = useLocationTagging();
  const { uploadPost } = useMediaUpload();

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedMedia(prev => [...prev, ...files].slice(0, 10)); // Max 10 files
  };

  const removeMedia = (index: number) => {
    setSelectedMedia(prev => prev.filter((_, i) => i !== index));
  };

  const handleLocationSearch = async (query: string) => {
    if (query.length > 2) {
      const results = await searchLocations(query);
      // Handle search results here
    }
  };

  const handleUpload = async () => {
    if (selectedMedia.length === 0) return;

    setIsUploading(true);
    try {
      const result = await uploadPost(
        selectedMedia,
        caption,
        selectedLocation?.id
      );

      if (result.success) {
        setUploadSuccess(true);
        // Reset form after successful upload
        setTimeout(() => {
          setSelectedMedia([]);
          setCaption('');
          setSelectedLocation(null);
          setUploadSuccess(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const getMediaPreview = (file: File) => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return null;
  };

  const isVideo = (file: File) => file.type.startsWith('video/');

  if (uploadSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Post Uploaded!</h2>
          <p className="text-gray-600">Your post has been added to your profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => window.history.back()}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="text-lg font-semibold text-gray-900">New Post</h1>
            </div>
            <Button
              onClick={handleUpload}
              disabled={selectedMedia.length === 0 || isUploading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Share'
              )}
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Media Upload Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Photos & Videos</h3>
              <span className="text-sm text-gray-500">{selectedMedia.length}/10</span>
            </div>

            {selectedMedia.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
              >
                <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="font-medium text-gray-900 mb-2">Add photos or videos</h4>
                <p className="text-sm text-gray-500">Tap to select from your camera roll</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {selectedMedia.map((file, index) => (
                  <div key={index} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    {isVideo(file) ? (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <Video className="w-8 h-8 text-gray-500" />
                      </div>
                    ) : (
                      <img
                        src={getMediaPreview(file)}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <button
                      onClick={() => removeMedia(index)}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                
                {selectedMedia.length < 10 && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
                  >
                    <Plus className="w-6 h-6 text-gray-400" />
                  </div>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleMediaSelect}
              className="hidden"
            />
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <label className="block font-semibold text-gray-900">Caption</label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Location Tagging */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block font-semibold text-gray-900">Tag Location</label>
              {selectedLocation && (
                <button
                  onClick={() => setSelectedLocation(null)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Remove
                </button>
              )}
            </div>

            {selectedLocation ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
                <MapPin className="w-5 h-5 text-blue-600" />
                <div className="flex-1">
                  <div className="font-medium text-blue-900">{selectedLocation.name}</div>
                  {selectedLocation.address && (
                    <div className="text-sm text-blue-700">{selectedLocation.address}</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Input
                  value={locationQuery}
                  onChange={(e) => {
                    setLocationQuery(e.target.value);
                    handleLocationSearch(e.target.value);
                  }}
                  placeholder="Search for a location..."
                  className="w-full"
                />

                {/* Nearby Places */}
                {nearbyPlaces.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Nearby</h4>
                    {nearbyPlaces.slice(0, 3).map((place) => (
                      <button
                        key={place.id}
                        onClick={() => setSelectedLocation(place)}
                        className="w-full p-3 bg-gray-50 rounded-lg text-left hover:bg-gray-100 transition-colors"
                      >
                        <div className="font-medium text-gray-900">{place.name}</div>
                        {place.address && (
                          <div className="text-sm text-gray-600">{place.address}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Recent Locations */}
                {recentLocations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Recent</h4>
                    {recentLocations.slice(0, 3).map((location) => (
                      <button
                        key={location.id}
                        onClick={() => setSelectedLocation(location)}
                        className="w-full p-3 bg-gray-50 rounded-lg text-left hover:bg-gray-100 transition-colors"
                      >
                        <div className="font-medium text-gray-900">{location.name}</div>
                        {location.address && (
                          <div className="text-sm text-gray-600">{location.address}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddLocationPage;
