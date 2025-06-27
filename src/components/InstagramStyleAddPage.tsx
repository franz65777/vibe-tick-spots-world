
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowLeft, Camera, MapPin, X, Image as ImageIcon, Check, Sparkles } from 'lucide-react';
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
        placeId: location.place_id
      });
    }
  };

  const handlePost = async () => {
    if (!user || selectedFiles.length === 0) return;

    try {
      const result = await createPost({
        files: selectedFiles,
        caption: caption.trim() || undefined,
        location: selectedLocation || undefined
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
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Join the Community</h2>
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-10">
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
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Create Post
            </h1>
            <div className="w-20"></div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            {/* Upload Area */}
            <div
              className={`relative border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300 cursor-pointer ${
                isDragOver
                  ? 'border-blue-400 bg-blue-50/50 scale-105'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="space-y-6">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
                  <ImageIcon className="w-10 h-10 text-white" />
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-gray-900">
                    Share Your Discovery
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Drag photos here or click to browse
                  </p>
                  <p className="text-sm text-gray-500">
                    Support JPG, PNG, MP4 • Up to 10 files
                  </p>
                </div>

                <Button
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
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
            <div className="mt-6">
              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-3 py-4 rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-300"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.setAttribute('capture', 'environment');
                    fileInputRef.current.click();
                  }
                }}
              >
                <Camera className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-700">Use Camera</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
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
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Create Post
          </h1>
          <Button
            onClick={handlePost}
            disabled={uploading || selectedFiles.length === 0}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-6 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                {progress > 0 ? `${Math.round(progress)}%` : 'Posting...'}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                Share
              </div>
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Media Preview */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200/50">
              <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
                {previewUrls.length > 0 && (
                  <img
                    src={previewUrls[0]}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              
              {previewUrls.length > 1 && (
                <div className="p-4 bg-gray-50/50">
                  <div className="flex gap-2 overflow-x-auto">
                    {previewUrls.slice(1).map((url, index) => (
                      <div key={index} className="relative flex-shrink-0">
                        <img
                          src={url}
                          alt={`Preview ${index + 2}`}
                          className="w-16 h-16 object-cover rounded-lg border-2 border-white shadow-sm"
                        />
                        <button
                          onClick={() => removeFile(index + 1)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200/50">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                Tell Your Story
              </h3>
              
              <Textarea
                placeholder="Share what makes this place special..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full h-32 resize-none border-gray-200 rounded-xl focus:border-blue-400 focus:ring-blue-400/20 text-gray-900 placeholder-gray-500"
                maxLength={2200}
              />
              
              <div className="flex justify-between items-center mt-3">
                <p className="text-sm text-gray-500">
                  {caption.length}/2200 characters
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200/50">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-500" />
                Add Location
              </h3>
              
              <div className="space-y-4">
                <GooglePlacesAutocomplete
                  onPlaceSelect={handleLocationSelect}
                  placeholder="Search for a place..."
                  className="w-full"
                />
                
                {selectedLocation && (
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{selectedLocation.name}</p>
                        <p className="text-sm text-gray-600">{selectedLocation.address}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedLocation(null)}
                      className="text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstagramStyleAddPage;
