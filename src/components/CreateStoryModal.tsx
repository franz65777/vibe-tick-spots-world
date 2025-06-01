
import { useState } from 'react';
import { X, MapPin, Camera, Video, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface Location {
  id: string;
  name: string;
  address: string;
  category: string;
}

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated: () => void;
}

const CreateStoryModal = ({ isOpen, onClose, onStoryCreated }: CreateStoryModalProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  // Mock locations - in a real app this would come from your API
  const mockLocations: Location[] = [
    { id: '1', name: 'Cafe Central', address: '123 Main St', category: 'cafe' },
    { id: '2', name: 'The Rooftop Bar', address: '456 High St', category: 'bar' },
    { id: '3', name: 'Hotel Plaza', address: '789 Park Ave', category: 'hotel' },
    { id: '4', name: 'Giuseppe\'s Restaurant', address: '321 Food St', category: 'restaurant' },
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/mov'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select an image or video file.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 50MB.",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile || !selectedLocation) {
      toast({
        title: "Missing information",
        description: "Please select a file and location.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      // Simulate upload - in a real app this would upload to your storage
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Story created!",
        description: "Your story has been shared.",
      });
      
      onStoryCreated();
      onClose();
      setSelectedFile(null);
      setSelectedLocation(null);
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Create Story</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* File upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Upload Photo or Video *
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              {selectedFile ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    {selectedFile.type.startsWith('image/') ? (
                      <Camera className="w-6 h-6 text-green-600" />
                    ) : (
                      <Video className="w-6 h-6 text-green-600" />
                    )}
                    <span className="text-sm font-medium">{selectedFile.name}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                  >
                    Change file
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                  <p className="text-sm text-gray-500">
                    Click to upload photo or video
                  </p>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="story-file"
                  />
                  <label
                    htmlFor="story-file"
                    className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-700"
                  >
                    Choose File
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Location selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Tag Location *
            </label>
            <Select
              value={selectedLocation?.id || ''}
              onValueChange={(value) => {
                const location = mockLocations.find(l => l.id === value);
                setSelectedLocation(location || null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a location" />
              </SelectTrigger>
              <SelectContent>
                {mockLocations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <div>
                        <p className="font-medium">{location.name}</p>
                        <p className="text-xs text-gray-500">{location.address}</p>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Submit button */}
          <Button
            onClick={handleSubmit}
            disabled={!selectedFile || !selectedLocation || isUploading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isUploading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating Story...
              </span>
            ) : (
              'Share Story'
            )}
          </Button>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              💡 Stories are only visible for 24 hours and require a location tag to help others discover amazing places!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateStoryModal;
