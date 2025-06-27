
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Plus, X, Play, MapPin, Settings, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { usePostCreation } from '@/hooks/usePostCreation';
import { useLocationTagging } from '@/hooks/useLocationTagging';
import GooglePlacesAutocomplete from './GooglePlacesAutocomplete';
import { toast } from 'sonner';

const InstagramStyleAddPage = () => {
  const navigate = useNavigate();
  const { createPost, uploading, progress } = usePostCreation();
  const { nearbyPlaces, getCurrentLocation, loading: locationLoading } = useLocationTagging();
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [allowComments, setAllowComments] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [showLocationWarning, setShowLocationWarning] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) return;

    // Validate files
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast.error(`${file.name} is not a valid image or video file`);
        return false;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Maximum file size is 50MB`);
        return false;
      }
      return true;
    });

    setSelectedFiles(prev => [...prev, ...validFiles]);
    
    const newUrls = validFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...newUrls]);
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newUrls = previewUrls.filter((_, i) => i !== index);
    
    URL.revokeObjectURL(previewUrls[index]);
    
    setSelectedFiles(newFiles);
    setPreviewUrls(newUrls);
  };

  const formatDistance = (distance: number): string => {
    return `${distance.toFixed(1)} km`;
  };

  const handleLocationSelect = (place: any) => {
    setSelectedLocation(place);
    setShowLocationWarning(false);
    toast.success(`Location selected: ${place.name}`);
  };

  const handleNearbyPlaceSelect = (place: any) => {
    setSelectedLocation({
      place_id: `nearby_${place.id}`,
      name: place.name,
      address: place.address,
      lat: 0,
      lng: 0,
      types: [place.category]
    });
    setShowLocationWarning(false);
  };

  const canShare = selectedFiles.length > 0 && selectedLocation;

  const handleSubmit = async () => {
    if (!selectedFiles.length || !selectedLocation || uploading) return;

    try {
      console.log('Starting post creation...');
      console.log('Selected location:', selectedLocation);
      console.log('Files:', selectedFiles.length);
      console.log('Caption:', caption);

      const result = await createPost({
        files: selectedFiles,
        caption: caption.trim() || undefined,
        location: selectedLocation
      });

      if (result.success) {
        console.log('Post created successfully!');
        toast.success('Post shared successfully!');
        
        setSelectedFiles([]);
        setSelectedLocation(null);
        setCaption('');
        
        navigate('/');
      } else {
        console.error('Post creation failed:', result.error);
        toast.error(result.error?.message || 'Failed to share post. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting post:', error);
      toast.error('Something went wrong. Please try again.');
    }
  };

  const getFileType = (file: File) => {
    return file.type.startsWith('video/') ? 'video' : 'image';
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 pt-16">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center justify-between border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">New Post</h1>
        </div>
        
        <Button
          onClick={handleSubmit}
          disabled={!canShare || uploading}
          className={`px-6 py-2 rounded-full font-semibold transition-all ${
            canShare 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {uploading ? 'Uploading...' : 'Share'}
        </Button>
      </div>

      {uploading && (
        <div className="bg-blue-50 px-4 py-3 border-b">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium text-blue-900">Uploading your post...</span>
            <span className="text-sm text-blue-700">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 space-y-8">
          {/* Media Upload Section */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Image className="w-5 h-5" />
              Add Photos & Videos
            </h2>
            
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
                  className="block cursor-pointer"
                >
                  <div className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-blue-400 hover:bg-blue-50 transition-all">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Camera className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Upload your best moments
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Tap to select photos or videos from your gallery
                    </p>
                  </div>
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Selected Files Preview */}
                <div className="grid grid-cols-2 gap-4">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="relative aspect-square">
                      {getFileType(selectedFiles[index]) === 'video' ? (
                        <div className="relative w-full h-full">
                          <video src={url} className="w-full h-full object-cover rounded-xl" />
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-xl">
                            <Play className="w-8 h-8 text-white" />
                          </div>
                        </div>
                      ) : (
                        <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover rounded-xl" />
                      )}
                      <button
                        onClick={() => removeFile(index)}
                        className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors shadow-lg"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ))}
                  
                  {/* Add More Button */}
                  <div className="aspect-square">
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
                      className="flex items-center justify-center w-full h-full border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer"
                    >
                      <div className="text-center">
                        <Plus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <span className="text-sm text-gray-500">Add more</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Caption Section */}
          {selectedFiles.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Write a Caption</h2>
              <div className="space-y-2">
                {isExpanded ? (
                  <Textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Share your thoughts about this place..."
                    className="w-full border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[100px]"
                    maxLength={1000}
                    onBlur={() => {
                      if (!caption.trim()) setIsExpanded(false);
                    }}
                    autoFocus
                  />
                ) : (
                  <Input
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    onFocus={() => setIsExpanded(true)}
                    placeholder="Share your thoughts about this place..."
                    className="w-full border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={1000}
                  />
                )}
                <div className="text-xs text-gray-500 text-right">
                  {caption.length}/1000
                </div>
              </div>
            </div>
          )}

          {/* Location Section */}
          {selectedFiles.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Tag Location
                <span className="text-red-500 text-sm">*</span>
              </h2>
              
              {showLocationWarning && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                  <p className="text-red-800 text-sm font-medium">⚠️ Location is required to share your post</p>
                </div>
              )}

              {!selectedLocation ? (
                <div className="space-y-4">
                  <GooglePlacesAutocomplete
                    onPlaceSelect={handleLocationSelect}
                    placeholder="Search for a place..."
                    className="mb-4"
                  />
                  
                  {nearbyPlaces.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-3">📍 Nearby places:</p>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {nearbyPlaces.slice(0, 5).map((place, index) => (
                          <button
                            key={index}
                            className="w-full text-left p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                            onClick={() => handleNearbyPlaceSelect(place)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-start gap-3 min-w-0 flex-1">
                                <MapPin className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-gray-900 truncate">{place.name}</p>
                                  <p className="text-sm text-gray-500 truncate">{place.address}</p>
                                </div>
                              </div>
                              {place.distance && (
                                <span className="text-xs text-blue-600 font-medium ml-2 flex-shrink-0">
                                  {formatDistance(place.distance)}
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-green-900 truncate">{selectedLocation.name}</h4>
                      <p className="text-sm text-green-700 mt-1">{selectedLocation.address}</p>
                    </div>
                    <button
                      onClick={() => setSelectedLocation(null)}
                      className="w-6 h-6 bg-green-200 hover:bg-green-300 rounded-full flex items-center justify-center transition-colors"
                    >
                      <X className="w-3 h-3 text-green-700" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Settings Section */}
          {selectedFiles.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Post Settings
              </h2>
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
          )}
        </div>
      </div>
    </div>
  );
};

export default InstagramStyleAddPage;
