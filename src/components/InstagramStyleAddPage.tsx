
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Plus, X, Play, MapPin, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { usePostCreation } from '@/hooks/usePostCreation';
import { useLocationTagging } from '@/hooks/useLocationTagging';
import GooglePlacesAutocomplete from './GooglePlacesAutocomplete';
import { toast } from 'sonner';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";

const InstagramStyleAddPage = () => {
  const navigate = useNavigate();
  const { createPost, uploading } = usePostCreation();
  const { nearbyPlaces, getCurrentLocation, loading: locationLoading } = useLocationTagging();
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [allowComments, setAllowComments] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [showLocationWarning, setShowLocationWarning] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Auto-detect location when component mounts
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
    
    // Create preview URLs
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
      lat: 0, // Would need actual coordinates
      lng: 0,
      types: [place.category]
    });
    setShowLocationWarning(false);
  };

  const canShare = selectedFiles.length > 0 && selectedLocation;

  const handleSubmit = async () => {
    if (!canShare) {
      if (selectedFiles.length === 0) {
        toast.error('Please add at least one photo or video');
        return;
      }
      if (!selectedLocation) {
        setShowLocationWarning(true);
        toast.error('Please tag a location to continue');
        return;
      }
    }

    try {
      const result = await createPost({
        caption: caption.trim() || undefined,
        files: selectedFiles,
        location: selectedLocation
      });

      if (result.success) {
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

  const getMissingItem = () => {
    if (selectedFiles.length === 0) return 'Add a photo/video';
    if (!selectedLocation) return 'Tag a location';
    return null;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 pt-16">
      {/* Sticky Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-100 shadow-sm sticky top-16 z-20">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">New Post</h1>
        <Button
          onClick={handleSubmit}
          disabled={!canShare || uploading}
          className={`px-6 rounded-full font-semibold transition-all ${
            canShare 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {uploading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              Sharing...
            </>
          ) : (
            'Share'
          )}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto pb-20">
        <div className="p-4 space-y-6">
          {/* Media Carousel */}
          <div>
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
                  <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-blue-100 border-0">
                    <CardContent className="flex flex-col items-center justify-center p-8 min-h-[280px]">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 animate-pulse">
                        <Camera className="w-8 h-8 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">
                        Add your best photos or videos
                      </h3>
                      <p className="text-gray-600 text-center">
                        Tap to select from gallery or take a new one
                      </p>
                    </CardContent>
                  </Card>
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                <Carousel className="w-full">
                  <CarouselContent>
                    {previewUrls.map((url, index) => (
                      <CarouselItem key={index} className="basis-4/5">
                        <Card className="shadow-md">
                          <CardContent className="relative aspect-square p-0">
                            {getFileType(selectedFiles[index]) === 'video' ? (
                              <div className="relative w-full h-full">
                                <video src={url} className="w-full h-full object-cover rounded-lg" />
                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-lg">
                                  <Play className="w-12 h-12 text-white" />
                                </div>
                              </div>
                            ) : (
                              <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                            )}
                            <button
                              onClick={() => removeFile(index)}
                              className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors shadow-lg"
                              aria-label={`Remove ${getFileType(selectedFiles[index])}`}
                            >
                              <X className="w-4 h-4 text-white" />
                            </button>
                          </CardContent>
                        </Card>
                      </CarouselItem>
                    ))}
                    <CarouselItem className="basis-1/4">
                      <Card className="shadow-md">
                        <CardContent className="aspect-square p-0">
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
                            className="flex items-center justify-center w-full h-full border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer bg-white"
                          >
                            <Plus className="w-8 h-8 text-gray-400" />
                          </label>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  </CarouselContent>
                  {selectedFiles.length > 1 && (
                    <>
                      <CarouselPrevious />
                      <CarouselNext />
                    </>
                  )}
                </Carousel>
              </div>
            )}
          </div>

          {/* Caption */}
          {selectedFiles.length > 0 && (
            <div>
              <div className="relative">
                {isExpanded ? (
                  <Textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Say something about this place..."
                    className="w-full border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white text-gray-900 placeholder-gray-500 min-h-[100px]"
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
                    placeholder="Say something about this place..."
                    className="w-full border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
                    maxLength={1000}
                  />
                )}
                <div className="text-xs text-gray-500 mt-2 text-right">
                  {caption.length}/1000
                </div>
              </div>
            </div>
          )}

          {/* Location Selection */}
          {selectedFiles.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Tag Location *
              </h3>
              
              {showLocationWarning && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
                  <p className="text-red-800 text-sm font-medium">⚠️ Location is required to share your post</p>
                </div>
              )}

              {!selectedLocation ? (
                <div className="space-y-4">
                  <GooglePlacesAutocomplete
                    onPlaceSelect={handleLocationSelect}
                    placeholder="Search for a place..."
                    className="mb-3"
                  />
                  
                  {/* Nearby Places */}
                  {nearbyPlaces.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-3">📍 Nearby places:</p>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {nearbyPlaces.slice(0, 5).map((place, index) => (
                          <button
                            key={index}
                            className="w-full text-left p-3 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all shadow-sm"
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
                <div className="p-4 bg-green-50 rounded-2xl border border-green-200">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-green-900 truncate">{selectedLocation.name}</h4>
                      <p className="text-sm text-green-700 mt-1">{selectedLocation.address}</p>
                    </div>
                    <button
                      onClick={() => setSelectedLocation(null)}
                      className="w-6 h-6 bg-green-200 hover:bg-green-300 rounded-full flex items-center justify-center transition-colors"
                      aria-label="Remove location"
                    >
                      <X className="w-3 h-3 text-green-700" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Settings */}
          {selectedFiles.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Settings
              </h4>
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

      {/* Bottom Summary Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-30 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}</span>
            {selectedLocation && (
              <span className="flex items-center gap-1 truncate max-w-32">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{selectedLocation.name}</span>
              </span>
            )}
          </div>
          
          {getMissingItem() && (
            <span className="text-sm text-orange-600 font-medium">
              {getMissingItem()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstagramStyleAddPage;
