
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowLeft, Camera, MapPin, X, Image as ImageIcon, Check, Sparkles, Upload, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import GooglePlacesAutocomplete from './GooglePlacesAutocomplete';
import { usePostCreation } from '@/hooks/usePostCreation';

interface SelectedLocation {
  id: string;
  name: string;
  address: string;
  coordinates: { lat: number; lng: number };
  placeId: string;
  types: string[];
}

const InstagramStyleAddPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { createPost, uploading, progress } = usePostCreation();

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [currentStep, setCurrentStep] = useState<'select' | 'edit' | 'share'>('select');
  const [isDragOver, setIsDragOver] = useState(false);

  // Cleanup preview URLs when component unmounts
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const validFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    if (validFiles.length === 0) return;

    // Cleanup old preview URLs
    previewUrls.forEach(url => URL.revokeObjectURL(url));

    const newFiles = validFiles.slice(0, 10); // Limit to 10 files
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));

    setSelectedFiles(newFiles);
    setPreviewUrls(newPreviews);
    setCurrentStep('edit');
  }, [previewUrls]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleLocationSelect = (location: any) => {
    if (location) {
      setSelectedLocation({
        id: location.place_id,
        name: location.name,
        address: location.formatted_address || location.vicinity || '',
        coordinates: {
          lat: location.geometry?.location?.lat() || 0,
          lng: location.geometry?.location?.lng() || 0
        },
        placeId: location.place_id,
        types: location.types || []
      });
    }
  };

  const handlePost = async () => {
    if (!user || selectedFiles.length === 0) return;

    try {
      const locationData = selectedLocation ? {
        google_place_id: selectedLocation.placeId,
        name: selectedLocation.name,
        address: selectedLocation.address,
        latitude: selectedLocation.coordinates.lat,
        longitude: selectedLocation.coordinates.lng,
        types: selectedLocation.types
      } : undefined;

      const result = await createPost({
        files: selectedFiles,
        caption: caption.trim() || undefined,
        location: locationData
      });

      if (result.success) {
        // Clear form
        setSelectedFiles([]);
        setPreviewUrls([]);
        setCaption('');
        setSelectedLocation(null);
        setCurrentStep('select');
        
        // Navigate back to home
        navigate('/');
      }
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const resetForm = () => {
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setSelectedFiles([]);
    setPreviewUrls([]);
    setCaption('');
    setSelectedLocation(null);
    setCurrentStep('select');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md bg-white rounded-3xl p-8 shadow-xl">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Join Our Community</h2>
          <p className="text-gray-600 mb-6">Sign in to share your amazing discoveries with the world</p>
          <Button 
            onClick={() => navigate('/auth')}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Sign In to Continue
          </Button>
        </div>
      </div>
    );
  }

  if (currentStep === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-10">
          <div className="flex items-center justify-between p-4 max-w-2xl mx-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl px-3 py-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-medium">Back</span>
            </Button>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">
              Share Your Discovery
            </h1>
            <div className="w-20"></div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-lg">
            {/* Upload Area */}
            <div
              className={`relative border-2 border-dashed rounded-3xl p-16 text-center transition-all duration-300 cursor-pointer bg-white/60 backdrop-blur-sm ${
                isDragOver
                  ? 'border-indigo-400 bg-indigo-50/70 scale-105 shadow-xl'
                  : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/50 hover:shadow-lg'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="space-y-8">
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-r from-indigo-500 to-cyan-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
                    <Upload className="w-12 h-12 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center">
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-gray-900">
                    Share Your Adventure
                  </h3>
                  <p className="text-gray-600 leading-relaxed text-lg">
                    Drag photos here or click to browse
                  </p>
                  <p className="text-sm text-gray-500">
                    Support JPG, PNG, MP4 • Up to 10 files
                  </p>
                </div>

                <Button
                  className="bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white font-semibold px-10 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  Choose Files
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
            </div>

            {/* Camera Option */}
            <div className="mt-8">
              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-3 py-6 rounded-2xl border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/70 transition-all duration-300 bg-white/60 backdrop-blur-sm"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.setAttribute('capture', 'environment');
                    fileInputRef.current.click();
                  }
                }}
              >
                <Camera className="w-6 h-6 text-gray-600" />
                <span className="font-semibold text-gray-700 text-lg">Use Camera</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-10">
        <div className="flex items-center justify-between p-4 max-w-4xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetForm}
            disabled={uploading}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl px-3 py-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-medium">Back</span>
          </Button>
          
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">
            Create Post
          </h1>

          <Button
            onClick={handlePost}
            disabled={uploading || selectedFiles.length === 0}
            className="bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white font-semibold px-6 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
          >
            {uploading ? `${progress}%` : 'Share'}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Media Preview */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Media</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {previewUrls.map((url, index) => (
              <div key={index} className="relative group rounded-2xl overflow-hidden bg-gray-100">
                <img 
                  src={url} 
                  alt={`Preview ${index + 1}`}
                  className="w-full h-32 object-cover"
                />
                <button
                  onClick={() => removeFile(index)}
                  className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Caption */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Caption</h3>
          <Textarea
            placeholder="Write a caption..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="min-h-[100px] resize-none border-gray-200 rounded-2xl focus:border-indigo-400 focus:ring-indigo-400"
          />
        </div>

        {/* Location */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-600" />
            Add Location
          </h3>
          <GooglePlacesAutocomplete onPlaceSelect={handleLocationSelect} />
          {selectedLocation && (
            <div className="mt-4 p-4 bg-indigo-50 rounded-xl flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{selectedLocation.name}</p>
                <p className="text-sm text-gray-600">{selectedLocation.address}</p>
              </div>
              <button
                onClick={() => setSelectedLocation(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstagramStyleAddPage;
