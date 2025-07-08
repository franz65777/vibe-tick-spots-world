import React, { useState, useRef } from 'react';
import { X, Camera, Image, MapPin, Loader2, Sparkles } from 'lucide-react';
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
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Create Story
            </h3>
          </div>
          <Button
            onClick={handleClose}
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-white/50"
            disabled={uploading}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {step === 'upload' ? (
          <div className="p-8 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
            <div className="text-center">
              <div className="relative mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
                  <Camera className="w-12 h-12 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-lg">+</span>
                </div>
              </div>
              
              <h4 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
                Share Your Story
              </h4>
              <p className="text-gray-600 text-base mb-8 leading-relaxed">
                Capture and share amazing moments from your adventures
              </p>
              
              <div className="space-y-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 px-6 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-3 group"
                >
                  <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                    <Image className="w-4 h-4" />
                  </div>
                  Choose from Gallery
                </button>
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-white border-2 border-gray-200 hover:border-blue-300 text-gray-700 hover:text-blue-600 py-4 px-6 rounded-2xl font-semibold transition-all duration-300 flex items-center justify-center gap-3 group hover:bg-blue-50"
                >
                  <div className="w-6 h-6 bg-gray-100 group-hover:bg-blue-100 rounded-full flex items-center justify-center transition-colors">
                    <Camera className="w-4 h-4" />
                  </div>
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
              
              <div className="mt-6 text-xs text-gray-500">
                Supported formats: JPG, PNG, MP4, MOV (max 100MB)
              </div>
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
            <div className="p-6 space-y-5 flex-1 bg-gradient-to-b from-white to-gray-50">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Caption
                </label>
                <Textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Share your thoughts about this moment..."
                  className="resize-none border-gray-200 rounded-xl focus:border-blue-400 focus:ring-blue-400 bg-white"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  Add Location
                </label>
                <GooglePlacesAutocomplete
                  onPlaceSelect={handleLocationSelect}
                  placeholder="Search for a location..."
                  className="rounded-xl border-gray-200 focus:border-blue-400"
                />
                {location && (
                  <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
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
            <div className="p-6 border-t border-gray-100 flex gap-3 bg-white">
              <Button
                variant="outline"
                onClick={() => setStep('upload')}
                className="flex-1 rounded-xl border-gray-200 hover:bg-gray-50"
                disabled={uploading}
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-lg"
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Share Story
                  </>
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