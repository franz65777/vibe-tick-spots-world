import React, { useState, useRef } from 'react';
import { X, Camera, Image, MapPin, Loader2, Upload, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import GooglePlacesAutocomplete from './GooglePlacesAutocomplete';
import { useStories } from '@/hooks/useStories';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';
import { extractImageMetadata, getLocationFromCoordinates } from '@/utils/imageUtils';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated: () => void;
}

const CreateStoryModal = ({ isOpen, onClose, onStoryCreated }: CreateStoryModalProps) => {
  const { uploadStory, uploading } = useStories();
  const { savedPlaces } = useSavedPlaces();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState<{
    place_id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [step, setStep] = useState<'upload' | 'details'>('upload');
  const [autoDetectingLocation, setAutoDetectingLocation] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Flatten saved places for selection
  const allSavedPlaces = Object.values(savedPlaces).flat();
  const filteredSavedPlaces = locationSearch 
    ? allSavedPlaces.filter(place => 
        place.name.toLowerCase().includes(locationSearch.toLowerCase()) ||
        place.city?.toLowerCase().includes(locationSearch.toLowerCase())
      )
    : allSavedPlaces;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      
      // Auto-detect location from image metadata
      if (file.type.startsWith('image/')) {
        setAutoDetectingLocation(true);
        try {
          const metadata = await extractImageMetadata(file);
          if (metadata.location) {
            const locationName = await getLocationFromCoordinates(
              metadata.location.latitude,
              metadata.location.longitude
            );
            
            if (locationName) {
              setLocation({
                place_id: '',
                name: locationName,
                address: locationName,
                lat: metadata.location.latitude,
                lng: metadata.location.longitude
              });
            }
          }
        } catch (error) {
          console.error('Error detecting location from image:', error);
        } finally {
          setAutoDetectingLocation(false);
        }
      }
      
      setStep('details');
    }
  };

  const handleLocationSelect = (place: {
    place_id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
  }) => {
    setLocation(place);
  };

  const handleSubmit = async () => {
    if (!selectedFile || !location) {
      alert('Please select a location for your story');
      return;
    }

    try {
      await uploadStory(
        selectedFile,
        caption,
        location?.place_id,
        location?.name,
        location?.address
      );
      
      onStoryCreated();
      handleClose();
    } catch (error) {
      console.error('Error creating story:', error);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption('');
    setLocation(null);
    setStep('upload');
    setAutoDetectingLocation(false);
    setShowLocationPicker(false);
    setLocationSearch('');
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-lg text-gray-900">
            Create Story
          </h3>
          <Button
            onClick={handleClose}
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-gray-100 h-8 w-8"
            disabled={uploading}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {step === 'upload' ? (
          <div className="p-6">
            <div className="text-center">
              <div className="mb-6">
                <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto border-2 border-dashed border-gray-200">
                  <Upload className="w-8 h-8 text-gray-400" />
                </div>
              </div>
              
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Add Photo or Video
              </h4>
              <p className="text-gray-500 text-sm mb-6">
                Share moments from your location adventures
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Image className="w-4 h-4" />
                  Choose from Gallery
                </button>
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Take Photo
                </button>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <div className="mt-4 text-xs text-gray-400">
                JPG, PNG, MP4, MOV up to 100MB
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col max-h-[70vh]">
            {/* Preview */}
            <div className="relative bg-gray-100 aspect-[4/3] max-h-64">
              {previewUrl && (
                selectedFile?.type.startsWith('image/') ? (
                  <img
                    src={previewUrl}
                    alt="Story preview"
                    className="w-full h-full object-cover rounded-t-2xl"
                  />
                ) : (
                  <video
                    src={previewUrl}
                    controls
                    className="w-full h-full object-cover rounded-t-2xl"
                  />
                )
              )}
            </div>

            {/* Details Form */}
            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Caption
                </label>
                <Textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Share your thoughts about this moment..."
                  className="resize-none border-gray-200 rounded-lg focus:border-blue-400 focus:ring-blue-400 bg-white"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-600" />
                  Location <span className="text-red-600">*</span>
                  {autoDetectingLocation && (
                    <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                  )}
                </label>
                
                {!location ? (
                  <div className="space-y-3">
                    {/* Saved Places */}
                    {allSavedPlaces.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-600">Your Saved Places</span>
                          <button
                            onClick={() => setShowLocationPicker(!showLocationPicker)}
                            className="text-xs text-blue-600 hover:text-blue-700"
                          >
                            {showLocationPicker ? 'Hide' : 'Show All'}
                          </button>
                        </div>
                        
                        {showLocationPicker && (
                          <div className="mb-3">
                            <div className="relative">
                              <Input
                                value={locationSearch}
                                onChange={(e) => setLocationSearch(e.target.value)}
                                placeholder="Search your places..."
                                className="pl-8 text-sm"
                              />
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            </div>
                            <ScrollArea className="h-40 mt-2 border rounded-lg">
                              {filteredSavedPlaces.length > 0 ? (
                                <div className="p-2 space-y-1">
                                  {filteredSavedPlaces.slice(0, 10).map((place) => (
                                    <button
                                      key={place.id}
                                      onClick={() => {
                                        setLocation({
                                          place_id: place.id,
                                          name: place.name,
                                          address: place.city || '',
                                          lat: place.coordinates.lat,
                                          lng: place.coordinates.lng,
                                        });
                                        setShowLocationPicker(false);
                                      }}
                                      className="w-full text-left px-3 py-2 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                      <div className="flex items-start gap-2">
                                        <MapPin className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <p className="font-medium text-sm text-gray-900 truncate">{place.name}</p>
                                          {place.category && (
                                            <p className="text-xs text-gray-500 truncate">{place.category}</p>
                                          )}
                                        </div>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <div className="p-4 text-center text-sm text-gray-500">
                                  No saved places found
                                </div>
                              )}
                            </ScrollArea>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Search New Location */}
                    <div>
                      <span className="text-xs font-medium text-gray-600 block mb-2">Or Search New Location</span>
                      <GooglePlacesAutocomplete
                        onPlaceSelect={handleLocationSelect}
                        placeholder="Search for a place..."
                        className="rounded-lg border-gray-200 focus:border-blue-400"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-green-900 text-sm truncate">{location.name}</p>
                        <p className="text-green-600 text-xs truncate">{location.address}</p>
                      </div>
                      <button
                        onClick={() => setLocation(null)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-gray-100 flex gap-3 bg-white">
              <Button
                variant="outline"
                onClick={() => setStep('upload')}
                className="flex-1 rounded-lg"
                disabled={uploading}
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                disabled={uploading || !location}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Publishing...
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
  );
};

export default CreateStoryModal;