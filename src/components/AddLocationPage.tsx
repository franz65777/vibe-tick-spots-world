import React, { useState } from 'react';
import { ArrowLeft, MapPin, Camera, Plus, Check, Search, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import GooglePlacesAutocomplete from './GooglePlacesAutocomplete';
import { useGeolocation } from '@/hooks/useGeolocation';

const AddLocationPage = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    address: '',
    coordinates: null as { lat: number; lng: number } | null,
    images: [] as File[]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { getCurrentLocation, loading: geoLoading } = useGeolocation();

  const categories = [
    { id: 'restaurant', name: '🍽️ Restaurant', color: 'bg-orange-100 text-orange-700' },
    { id: 'cafe', name: '☕ Café', color: 'bg-amber-100 text-amber-700' },
    { id: 'bar', name: '🍺 Bar', color: 'bg-purple-100 text-purple-700' },
    { id: 'hotel', name: '🏨 Hotel', color: 'bg-blue-100 text-blue-700' },
    { id: 'attraction', name: '🎡 Attraction', color: 'bg-pink-100 text-pink-700' },
    { id: 'shopping', name: '🛍️ Shopping', color: 'bg-green-100 text-green-700' },
    { id: 'park', name: '🌳 Park', color: 'bg-emerald-100 text-emerald-700' },
    { id: 'beach', name: '🏖️ Beach', color: 'bg-cyan-100 text-cyan-700' },
    { id: 'museum', name: '🏛️ Museum', color: 'bg-indigo-100 text-indigo-700' },
    { id: 'other', name: '📍 Other', color: 'bg-gray-100 text-gray-700' }
  ];

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      window.history.back();
    }
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    }
  };

  const handlePlaceSelect = (place: any) => {
    setFormData(prev => ({
      ...prev,
      name: place.name,
      address: place.formatted_address,
      coordinates: place.geometry.location
    }));
  };

  const handleCurrentLocation = async () => {
    try {
      const position = await getCurrentLocation();
      if (position) {
        setFormData(prev => ({
          ...prev,
          coordinates: { lat: position.lat, lng: position.lng },
          address: 'Current location'
        }));
      }
    } catch (error) {
      console.error('Error getting current location:', error);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...files].slice(0, 5) // Max 5 images
    }));
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsSubmitting(false);
    setStep(5); // Success step
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.name.trim().length > 0;
      case 2:
        return formData.category.length > 0;
      case 3:
        return formData.coordinates !== null;
      case 4:
        return true; // Optional step
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <Search className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Find or Add Place</h2>
              <p className="text-gray-600">Search for an existing place or create a new one</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search for a place
                </label>
                <GooglePlacesAutocomplete
                  onPlaceSelect={handlePlaceSelect}
                  placeholder="Search restaurants, cafes, attractions..."
                />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">or create new</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Place name
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter place name..."
                  className="text-base"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <MapPin className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Category</h2>
              <p className="text-gray-600">What type of place is "{formData.name}"?</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setFormData(prev => ({ ...prev, category: category.id }))}
                  className={`p-4 rounded-xl text-left transition-all border-2 ${
                    formData.category === category.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`inline-flex px-3 py-1 rounded-lg text-sm font-medium ${category.color}`}>
                    {category.name}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <Target className="w-8 h-8 text-orange-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Set Location</h2>
              <p className="text-gray-600">Help others find this place</p>
            </div>

            <div className="space-y-4">
              {!formData.coordinates ? (
                <>
                  <Button
                    onClick={handleCurrentLocation}
                    disabled={geoLoading}
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700"
                  >
                    {geoLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Target className="w-5 h-5 mr-2" />
                    )}
                    Use Current Location
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-gray-500">or</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enter address manually
                    </label>
                    <Textarea
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Enter the full address..."
                      rows={3}
                    />
                  </div>
                </>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Check className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-green-900">Location Set</h3>
                      <p className="text-sm text-green-700">{formData.address}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <Camera className="w-8 h-8 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Add Photos & Details</h2>
              <p className="text-gray-600">Make your place stand out (optional)</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Photos ({formData.images.length}/5)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {formData.images.map((image, index) => (
                    <div key={index} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {formData.images.length < 5 && (
                    <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                      <div className="text-center">
                        <Plus className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                        <span className="text-xs text-gray-500">Add Photo</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Tell others what makes this place special..."
                  rows={4}
                />
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-green-100 rounded-3xl mx-auto flex items-center justify-center">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Place Added!</h2>
              <p className="text-gray-600">
                Your place "{formData.name}" has been successfully added to the map.
              </p>
            </div>
            <div className="space-y-3 pt-4">
              <Button 
                onClick={() => window.location.href = '/'}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                View on Map
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setStep(1);
                  setFormData({
                    name: '',
                    category: '',
                    description: '',
                    address: '',
                    coordinates: null,
                    images: []
                  });
                }}
                className="w-full"
              >
                Add Another Place
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-gray-900">Add New Place</h1>
              {step < 5 && (
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4].map((stepNum) => (
                    <div
                      key={stepNum}
                      className={`h-1.5 flex-1 rounded-full ${
                        stepNum <= step ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-6">
          {renderStepContent()}
        </div>

        {/* Footer Actions */}
        {step < 5 && (
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-4">
            <div className="flex gap-3">
              {step > 1 && (
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  className="flex-1"
                >
                  Back
                </Button>
              )}
              {step < 4 ? (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {step === 3 && !formData.coordinates ? 'Skip for now' : 'Continue'}
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Adding Place...
                    </>
                  ) : (
                    'Add Place'
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddLocationPage;
