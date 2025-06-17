
import { useState } from 'react';
import { X, Camera, MapPin, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useStories } from '@/hooks/useStories';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateStoryModal = ({ isOpen, onClose }: CreateStoryModalProps) => {
  const { user } = useAuth();
  const { uploadStory, uploading } = useStories();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast.error('Please select a media file');
      return;
    }
    
    if (!locationName.trim()) {
      toast.error('Please add a location to your story');
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
        undefined, // locationId - can be undefined for now
        locationName.trim(),
        locationAddress.trim() || undefined
      );
      
      toast.success('Story uploaded successfully!');
      handleClose();
    } catch (error) {
      console.error('Error uploading story:', error);
      toast.error('Failed to upload story. Please try again.');
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setCaption('');
    setLocationName('');
    setLocationAddress('');
    setPreviewUrl(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Create Story</h2>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Media File *
            </label>
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
                  <p className="text-gray-600 mb-2">Select an image or video</p>
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

          {/* Location (Required) */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <MapPin className="w-4 h-4 inline mr-1" />
              Location *
            </label>
            <Input
              placeholder="Enter location name"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              required
            />
            <Input
              placeholder="Enter address (optional)"
              value={locationAddress}
              onChange={(e) => setLocationAddress(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Location is required for all stories
            </p>
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Caption
            </label>
            <Textarea
              placeholder="Write a caption for your story..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={uploading || !selectedFile || !locationName.trim()}
          >
            {uploading ? 'Uploading...' : 'Share Story'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default CreateStoryModal;
