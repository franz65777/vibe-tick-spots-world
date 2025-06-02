
import { useState } from 'react';
import { MapPin, Camera, Upload, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const AddLocationPage = () => {
  console.log('AddLocationPage rendering...');
  
  const [selectedCategory, setSelectedCategory] = useState('');
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [description, setDescription] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  const categories = [
    { id: 'restaurant', name: 'Restaurant', icon: '🍽️', color: 'bg-orange-100 text-orange-600' },
    { id: 'hotel', name: 'Hotel', icon: '🏨', color: 'bg-blue-100 text-blue-600' },
    { id: 'bar', name: 'Bar', icon: '🍸', color: 'bg-purple-100 text-purple-600' },
    { id: 'cafe', name: 'Café', icon: '☕', color: 'bg-amber-100 text-amber-600' },
    { id: 'attraction', name: 'Attraction', icon: '🎭', color: 'bg-green-100 text-green-600' },
    { id: 'shopping', name: 'Shopping', icon: '🛍️', color: 'bg-pink-100 text-pink-600' },
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

  const handleSaveLocation = () => {
    console.log('Saving location:', {
      name: locationName,
      address: locationAddress,
      category: selectedCategory,
      description,
      images: uploadedImages
    });
    // TODO: Implement actual save logic
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-6 border-b border-gray-200">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <Plus className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Location</h1>
          <p className="text-gray-500 mt-1">Share your favorite spots with the community</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Location Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              Location Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location Name
              </label>
              <Input
                placeholder="e.g., The Cozy Corner Café"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <Input
                placeholder="123 Main Street, City"
                value={locationAddress}
                onChange={(e) => setLocationAddress(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Category Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    "p-4 rounded-lg border-2 transition-all duration-200 text-left",
                    selectedCategory === category.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{category.icon}</span>
                    <div>
                      <p className="font-medium text-gray-900">{category.name}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Photos Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-600" />
              Photos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upload Button */}
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-4 text-gray-500" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
              </div>
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </label>

            {/* Uploaded Images */}
            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {uploadedImages.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={image}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Tell us what makes this place special..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px]"
            />
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="bg-white border-t border-gray-200 p-4 safe-area-pb">
        <Button
          onClick={handleSaveLocation}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12"
          disabled={!locationName || !selectedCategory}
        >
          Save Location
        </Button>
      </div>
    </div>
  );
};

export default AddLocationPage;
