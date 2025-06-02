
import { useState } from 'react';
import { MapPin, Camera, Plus, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const AddLocationPage = () => {
  console.log('AddLocationPage rendering...');
  
  const [selectedLocation, setSelectedLocation] = useState('');
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [caption, setCaption] = useState('');

  // Mock location suggestions - in real app this would come from API
  const locationSuggestions = [
    'Restaurant Francesco - Downtown',
    'Central Park - New York',
    'Coffee Bean Café - Main St',
    'Museum of Art - Cultural District',
    'Beach Club - Santa Monica'
  ];

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setUploadedImages(prev => [...prev, e.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handlePost = () => {
    console.log('Posting content:', {
      location: selectedLocation,
      images: uploadedImages,
      caption
    });
    // TODO: Implement actual posting logic
  };

  const canPost = selectedLocation && uploadedImages.length > 0;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b border-gray-200">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">Share Your Experience</h1>
          <p className="text-gray-500 text-sm mt-1">Add photos and tell us about this place</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Location Selection */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            📍 Where are you?
          </label>
          
          {!selectedLocation ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search for a location..."
                  className="pl-10"
                  onFocus={() => setShowLocationSearch(true)}
                />
              </div>
              
              {showLocationSearch && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Suggested locations:</p>
                  {locationSuggestions.map((location, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedLocation(location);
                        setShowLocationSearch(false);
                      }}
                      className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        <span className="text-sm">{location}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">{selectedLocation}</span>
              </div>
              <button
                onClick={() => setSelectedLocation('')}
                className="text-blue-600 hover:text-blue-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Photo Upload */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            📸 Add Photos
          </label>
          
          {uploadedImages.length === 0 ? (
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Camera className="w-10 h-10 mb-3 text-gray-400" />
                <p className="text-sm text-gray-500 text-center">
                  <span className="font-semibold">Tap to add photos</span>
                  <br />
                  Share what you loved about this place
                </p>
              </div>
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </label>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {uploadedImages.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={image}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              
              <label className="flex items-center justify-center w-full h-16 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer bg-blue-50 hover:bg-blue-100 transition-colors">
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-600">Add more photos</span>
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
            </div>
          )}
        </div>

        {/* Caption */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            ✨ Tell us about it (optional)
          </label>
          <Textarea
            placeholder="What made this place special? Share your experience..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="min-h-[80px] resize-none"
          />
        </div>
      </div>

      {/* Post Button */}
      <div className="bg-white border-t border-gray-200 p-4 safe-area-pb">
        <Button
          onClick={handlePost}
          disabled={!canPost}
          className={cn(
            "w-full h-12 font-semibold transition-all",
            canPost 
              ? "bg-blue-600 hover:bg-blue-700 text-white" 
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          )}
        >
          {canPost ? "Share Experience" : "Select location & add photos"}
        </Button>
      </div>
    </div>
  );
};

export default AddLocationPage;
