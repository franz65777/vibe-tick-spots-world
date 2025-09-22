import React, { useState, useRef } from 'react';
import { X, Camera, Image, MapPin, Loader2, Upload, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import GooglePlacesAutocomplete from './GooglePlacesAutocomplete';
import { useStories } from '@/hooks/useStories';
import { extractImageMetadata, getLocationFromCoordinates } from '@/utils/imageUtils';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated: () => void;
}

const CreateStoryModal = ({ isOpen, onClose, onStoryCreated }: CreateStoryModalProps) => {
  const { uploadStory, uploading } = useStories();
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!selectedFile) return;

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
                  <MapPin className="w-4 h-4 text-blue-600" />
                  Location
                  {autoDetectingLocation && (
                    <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                  )}
                </label>
                <GooglePlacesAutocomplete
                  onPlaceSelect={handleLocationSelect}
                  placeholder="Search or auto-detected location..."
                  className="rounded-lg border-gray-200 focus:border-blue-400"
                />
                {location && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-blue-600 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-blue-900 text-sm truncate">{location.name}</p>
                        <p className="text-blue-600 text-xs truncate">{location.address}</p>
                      </div>
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
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                disabled={uploading}
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