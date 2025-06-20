
import React, { useState, useRef } from 'react';
import { X, Camera, Image, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import GooglePlacesAutocomplete from './GooglePlacesAutocomplete';
import { useStories } from '@/hooks/useStories';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
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
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-lg">Create Story</h3>
          <Button
            onClick={handleClose}
            variant="ghost"
            size="icon"
            className="rounded-full"
            disabled={uploading}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {step === 'upload' ? (
          <div className="p-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-10 h-10 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Share Your Moment</h4>
              <p className="text-gray-500 text-sm mb-6">
                Upload a photo or video to share with your followers
              </p>
              
              <div className="space-y-3">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                  size="lg"
                >
                  <Image className="w-5 h-5 mr-2" />
                  Choose from Gallery
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full"
                  size="lg"
                  onClick={() => {
                    // In a real app, this would open camera
                    fileInputRef.current?.click();
                  }}
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Take Photo
                </Button>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-[600px]">
            {/* Preview */}
            <div className="relative bg-black aspect-[9/16] max-h-80">
              {previewUrl && (
                selectedFile?.type.startsWith('image/') ? (
                  <img
                    src={previewUrl}
                    alt="Story preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={previewUrl}
                    controls
                    className="w-full h-full object-cover"
                  />
                )
              )}
            </div>

            {/* Details Form */}
            <div className="p-4 space-y-4 flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Caption
                </label>
                <Textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write a caption..."
                  className="resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Add Location
                </label>
                <GooglePlacesAutocomplete
                  onPlaceSelect={handleLocationSelect}
                  placeholder="Search for a location..."
                />
                {location && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-900 text-sm">{location.name}</p>
                        <p className="text-blue-600 text-xs">{location.address}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-gray-100 flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep('upload')}
                className="flex-1"
                disabled={uploading}
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1"
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
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
