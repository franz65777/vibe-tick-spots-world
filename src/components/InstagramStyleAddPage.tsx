import React, { useState, useRef } from 'react';
import { Camera, Image, MapPin, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import GooglePlacesAutocomplete from './GooglePlacesAutocomplete';

const InstagramStyleAddPage = () => {
  const { user } = useAuth();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => 
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles].slice(0, 10)); // Max 10 files
      
      // Create preview URLs
      validFiles.forEach(file => {
        const url = URL.createObjectURL(file);
        setPreviewUrls(prev => [...prev, url]);
      });
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleLocationSelect = (location: any) => {
    setSelectedLocation({
      place_id: location.place_id,
      name: location.name,
      formatted_address: location.address,
      geometry: {
        location: {
          lat: () => location.lat,
          lng: () => location.lng
        }
      },
      types: location.types
    });
  };

  const uploadFiles = async (): Promise<string[]> => {
    if (!user || selectedFiles.length === 0) return [];

    const uploadPromises = selectedFiles.map(async (file) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `posts/${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('media')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(data.path);

      return publicUrl;
    });

    return Promise.all(uploadPromises);
  };

  const handleSubmit = async () => {
    if (!user || selectedFiles.length === 0) return;

    setIsUploading(true);
    try {
      // Upload files first
      const mediaUrls = await uploadFiles();
      
      // Save location if provided (prevent duplicates by checking google_place_id)
      let locationId = null;
      if (selectedLocation) {
        // First check if location already exists
        let existingLocation = null;
        
        if (selectedLocation.place_id) {
          const { data: existing } = await supabase
            .from('locations')
            .select('id')
            .eq('google_place_id', selectedLocation.place_id)
            .maybeSingle();
          
          existingLocation = existing;
        }

        if (existingLocation) {
          locationId = existingLocation.id;
        } else {
          // Create new location
          const { data: newLocation, error: locationError } = await supabase
            .from('locations')
            .insert({
              name: selectedLocation.name,
              address: selectedLocation.formatted_address,
              latitude: selectedLocation.geometry?.location?.lat(),
              longitude: selectedLocation.geometry?.location?.lng(),
              google_place_id: selectedLocation.place_id,
              category: selectedLocation.types?.[0] || 'establishment',
              place_types: selectedLocation.types || [],
              created_by: user.id,
              pioneer_user_id: user.id
            })
            .select('id')
            .single();

          if (locationError) {
            console.error('Location creation error:', locationError);
          } else {
            locationId = newLocation.id;
          }
        }
      }

      // Create post
      const { error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          location_id: locationId,
          caption: caption || null,
          media_urls: mediaUrls,
        });

      if (postError) throw postError;

      // Reset form
      setSelectedFiles([]);
      setPreviewUrls(prev => {
        prev.forEach(url => URL.revokeObjectURL(url));
        return [];
      });
      setCaption('');
      setSelectedLocation(null);

      console.log('Post created successfully!');
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 pt-16">
      <div className="bg-white border-b border-gray-200 p-4">
        <h1 className="text-xl font-bold text-gray-900">Create Post</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Media Upload Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Add Photos or Videos</h3>
          
          {selectedFiles.length === 0 ? (
            <div 
              className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-200"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Image className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-gray-600 font-medium mb-2">Tap to add media</p>
              <p className="text-gray-400 text-sm">Share your favorite moments</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {previewUrls.map((url, index) => (
                <div key={index} className="relative aspect-square rounded-xl overflow-hidden">
                  <img 
                    src={url} 
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ))}
              {selectedFiles.length < 10 && (
                <div 
                  className="aspect-square border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-200"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="text-center">
                    <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">Add more</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
        </div>

        {/* Caption Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Write a caption</h3>
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Share your thoughts about this place..."
            className="min-h-[100px] resize-none border-gray-200 rounded-xl focus:border-blue-400 focus:ring-blue-400"
          />
        </div>

        {/* Location Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Add Location
          </h3>
          <GooglePlacesAutocomplete
            onPlaceSelect={handleLocationSelect}
            placeholder="Search for a place..."
            className="w-full"
          />
          {selectedLocation && (
            <div className="mt-3 p-3 bg-blue-50 rounded-xl">
              <p className="font-medium text-blue-900">{selectedLocation.name}</p>
              <p className="text-blue-600 text-sm">{selectedLocation.formatted_address}</p>
            </div>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div className="p-4 bg-white border-t border-gray-200">
        <Button
          onClick={handleSubmit}
          disabled={selectedFiles.length === 0 || isUploading}
          className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Publishing...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Share Post
            </div>
          )}
        </Button>
      </div>
    </div>
  );
};

export default InstagramStyleAddPage;
