
import React, { useState, useRef } from 'react';
import { X, MapPin, Camera, Upload, Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import GooglePlacesAutocomplete from '../GooglePlacesAutocomplete';

interface AddLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  coordinates: { lat: number; lng: number } | null;
  onSaveLocation: (locationData: any) => void;
}

const categories = [
  { value: 'restaurant', label: '🍽️ Restaurant', color: 'bg-orange-100 text-orange-800' },
  { value: 'cafe', label: '☕ Café', color: 'bg-amber-100 text-amber-800' },
  { value: 'bar', label: '🍺 Bar', color: 'bg-purple-100 text-purple-800' },
  { value: 'hotel', label: '🏨 Hotel', color: 'bg-blue-100 text-blue-800' },
  { value: 'attraction', label: '🎭 Attraction', color: 'bg-pink-100 text-pink-800' },
  { value: 'park', label: '🌳 Park', color: 'bg-green-100 text-green-800' },
  { value: 'museum', label: '🏛️ Museum', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'shop', label: '🛍️ Shop', color: 'bg-teal-100 text-teal-800' },
  { value: 'gym', label: '💪 Gym', color: 'bg-red-100 text-red-800' },
  { value: 'other', label: '📍 Other', color: 'bg-gray-100 text-gray-800' }
];

const AddLocationModal = ({ isOpen, onClose, coordinates, onSaveLocation }: AddLocationModalProps) => {
  const [step, setStep] = useState<'search' | 'details' | 'photo'>('search');
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [customName, setCustomName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [rating, setRating] = useState(0);
  const [photos, setPhotos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePlaceSelect = (place: any) => {
    setSelectedPlace(place);
    setCustomName(place.name);
    // Auto-detect category based on place types
    const placeTypes = place.types || [];
    if (placeTypes.includes('restaurant') || placeTypes.includes('meal_takeaway')) {
      setCategory('restaurant');
    } else if (placeTypes.includes('cafe') || placeTypes.includes('bakery')) {
      setCategory('cafe');
    } else if (placeTypes.includes('lodging')) {
      setCategory('hotel');
    } else if (placeTypes.includes('tourist_attraction')) {
      setCategory('attraction');
    } else if (placeTypes.includes('park')) {
      setCategory('park');
    } else {
      setCategory('other');
    }
    setStep('details');
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotos(prev => [...prev, ...files].slice(0, 3)); // Max 3 photos
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!selectedPlace && !customName) return;

    setSaving(true);
    try {
      const locationData = {
        name: customName || selectedPlace?.name,
        category,
        description,
        rating,
        coordinates: selectedPlace?.lat && selectedPlace?.lng 
          ? { lat: selectedPlace.lat, lng: selectedPlace.lng }
          : coordinates,
        place_id: selectedPlace?.place_id,
        address: selectedPlace?.address,
        photos
      };

      await onSaveLocation(locationData);
      handleClose();
    } catch (error) {
      console.error('Error saving location:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setStep('search');
    setSelectedPlace(null);
    setCustomName('');
    setCategory('');
    setDescription('');
    setRating(0);
    setPhotos([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full h-full sm:h-auto sm:max-w-md sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col sm:max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            {step !== 'search' && (
              <Button
                onClick={() => setStep(step === 'details' ? 'search' : 'details')}
                variant="ghost"
                size="icon"
                className="rounded-full"
              >
                <X className="w-5 h-5 rotate-45" />
              </Button>
            )}
            <h3 className="font-bold text-lg">Add Location</h3>
          </div>
          <Button
            onClick={handleClose}
            variant="ghost"
            size="icon"
            className="rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {step === 'search' && (
            <div className="p-6 space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Find a Place</h4>
                <p className="text-gray-500 text-sm mb-6">
                  Search for a location or add a custom place
                </p>
              </div>

              <GooglePlacesAutocomplete
                onPlaceSelect={handlePlaceSelect}
                placeholder="Search for a place..."
              />

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or</span>
                </div>
              </div>

              <div className="space-y-3">
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Enter custom place name"
                />
                <Button
                  onClick={() => setStep('details')}
                  disabled={!customName.trim()}
                  className="w-full"
                  variant="outline"
                >
                  Add Custom Place
                </Button>
              </div>

              {coordinates && (
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                  <p className="text-blue-800 text-sm font-medium">📍 Selected coordinates:</p>
                  <p className="text-blue-600 text-xs">
                    {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 'details' && (
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Place Name
                </label>
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Enter place name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Rating
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="p-1"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= rating
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Share your thoughts about this place..."
                  rows={3}
                />
              </div>

              <Button
                onClick={() => setStep('photo')}
                className="w-full"
                disabled={!customName.trim() || !category}
              >
                Continue to Photos
              </Button>
            </div>
          )}

          {step === 'photo' && (
            <div className="p-6 space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-8 h-8 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Add Photos</h4>
                <p className="text-gray-500 text-sm mb-6">
                  Share photos to help others discover this place
                </p>
              </div>

              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative aspect-square">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full"
                disabled={photos.length >= 3}
              >
                <Upload className="w-4 h-4 mr-2" />
                {photos.length === 0 ? 'Add Photos' : `Add More (${photos.length}/3)`}
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoSelect}
                className="hidden"
              />

              <div className="flex gap-3">
                <Button
                  onClick={handleSave}
                  className="flex-1"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Location'
                  )}
                </Button>
                <Button
                  onClick={() => setStep('photo')}
                  variant="outline"
                  disabled={saving}
                >
                  Skip Photos
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddLocationModal;
