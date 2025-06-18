
import { useState, useRef } from 'react';
import { X, Camera, MapPin, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useStories } from '@/hooks/useStories';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import GooglePlacesAutocomplete from './GooglePlacesAutocomplete';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated?: () => void;
}

const CreateStoryModal = ({ isOpen, onClose, onStoryCreated }: CreateStoryModalProps) => {
  const { user } = useAuth();
  const { uploadStory, uploading } = useStories();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<{
    place_id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    types: string[];
  } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        setSelectedFile(file);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        toast.error('Please select an image or video file');
      }
    }
  };

  const handleLocationSelect = (place: {
    place_id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    types: string[];
  }) => {
    setSelectedLocation(place);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast.error('Please select a media file');
      return;
    }
    
    if (!selectedLocation) {
      toast.error('Please select a location for your story');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to create a story');
      return;
    }

    try {
      await uploadStory(
        selectedFile,
        caption.trim() || undefined,
        undefined,
        selectedLocation.name,
        selectedLocation.address
      );
      
      toast.success('Story uploaded successfully!');
      
      if (onStoryCreated) {
        onStoryCreated();
      }
      
      handleClose();
    } catch (error) {
      console.error('Error uploading story:', error);
      toast.error('Failed to upload story. Please try again.');
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setCaption('');
    setSelectedLocation(null);
    setPreviewUrl(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Add to Your Story</h2>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              {previewUrl ? (
                <div className="space-y-2">
                  {selectedFile?.type.startsWith('image/') ? (
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  ) : (
                    <video 
                      src={previewUrl} 
                      className="w-full h-48 object-cover rounded-lg"
                      controls
                    />
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                  >
                    Change File
                  </Button>
                </div>
              ) : (
                <>
                  <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 mb-2">Add photo or video</p>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="story-file"
                  />
                  <label htmlFor="story-file">
                    <Button type="button" variant="outline" size="sm" asChild>
                      <span className="cursor-pointer">
                        <Upload className="w-4 h-4 mr-2" />
                        Choose File
                      </span>
                    </Button>
                  </label>
                </>
              )}
            </div>
          </div>

          {/* Location Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <MapPin className="w-4 h-4 inline mr-1" />
              Add Location
            </label>
            <GooglePlacesAutocomplete
              onPlaceSelect={handleLocationSelect}
              placeholder="Where was this taken?"
            />
            
            {selectedLocation && (
              <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-blue-900 truncate">{selectedLocation.name}</h3>
                    <p className="text-sm text-blue-700 mt-1">{selectedLocation.address}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Write a caption...
            </label>
            <Textarea
              placeholder="What's happening?"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              maxLength={280}
            />
            <div className="text-xs text-gray-500 text-right">
              {caption.length}/280
            </div>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={uploading || !selectedFile || !selectedLocation}
          >
            {uploading ? 'Sharing...' : 'Share to Story'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default CreateStoryModal;
