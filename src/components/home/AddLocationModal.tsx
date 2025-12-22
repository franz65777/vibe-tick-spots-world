
import React, { useState } from 'react';
import { X, MapPin, Camera, Star, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import OpenStreetMapAutocomplete from '../OpenStreetMapAutocomplete';

interface AddLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  coordinates?: { lat: number; lng: number } | null;
  onSaveLocation: (locationData: any) => void;
}

const CATEGORY_OPTIONS = [
  { id: 'restaurant', icon: '🍽️' },
  { id: 'cafe', icon: '☕' },
  { id: 'bar', icon: '🍺' },
  { id: 'shopping', icon: '🛍️' },
  { id: 'entertainment', icon: '🎬' },
  { id: 'park', icon: '🌳' },
  { id: 'museum', icon: '🏛️' },
  { id: 'hotel', icon: '🏨' },
  { id: 'gym', icon: '💪' },
  { id: 'other', icon: '📍' }
];

const AddLocationModal = ({ isOpen, onClose, coordinates, onSaveLocation }: AddLocationModalProps) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<'location' | 'details' | 'review'>('location');
  const [location, setLocation] = useState<{
    place_id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [locationName, setLocationName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [loading, setSaving] = useState(false);

  const handleLocationSelect = (place: {
    name: string;
    address: string;
    coordinates: { lat: number; lng: number };
    city: string;
  }) => {
    setLocation({
      place_id: `osm-${place.coordinates.lat}-${place.coordinates.lng}`,
      name: place.name,
      address: place.address,
      lat: place.coordinates.lat,
      lng: place.coordinates.lng,
    });
    setLocationName(place.name);
    setStep('details');
  };

  const handleManualLocation = () => {
    if (coordinates) {
      setLocation({
        place_id: '',
        name: locationName,
        address: `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`,
        lat: coordinates.lat,
        lng: coordinates.lng
      });
      setStep('details');
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSave = async () => {
    if (!location) return;

    setSaving(true);
    try {
      const locationData = {
        ...location,
        name: locationName,
        category,
        description,
        rating,
        tags,
        coordinates: { lat: location.lat, lng: location.lng }
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
    setStep('location');
    setLocation(null);
    setLocationName('');
    setCategory('');
    setDescription('');
    setRating(0);
    setTags([]);
    setNewTag('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-lg">
            {step === 'location' && 'Add Location'}
            {step === 'details' && 'Location Details'}
            {step === 'review' && 'Review & Save'}
          </h3>
          <Button
            onClick={handleClose}
            variant="ghost"
            size="icon"
            className="rounded-full"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="max-h-[600px] overflow-y-auto">
          {step === 'location' && (
            <div className="p-6 space-y-6">
              <div>
                <h4 className="font-semibold mb-3">{t('add:searchForPlace')}</h4>
                <OpenStreetMapAutocomplete
                  onPlaceSelect={handleLocationSelect}
                  placeholder={t('add:searchPlaceholder')}
                />
              </div>

              {coordinates && (
                <div>
                  <div className="flex items-center justify-center mb-4">
                    <div className="h-px bg-gray-200 flex-1"></div>
                    <span className="px-4 text-sm text-gray-500">{t('add:or')}</span>
                    <div className="h-px bg-gray-200 flex-1"></div>
                  </div>

                  <div className="border border-gray-200 rounded-xl p-4">
                    <h4 className="font-semibold mb-2">{t('add:addCustomLocation')}</h4>
                    <p className="text-sm text-gray-500 mb-3">
                      {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                    </p>
                    <Input
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      placeholder={t('add:enterLocationName')}
                      className="mb-3"
                    />
                    <Button
                      onClick={handleManualLocation}
                      disabled={!locationName.trim()}
                      className="w-full"
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      {t('add:useThisLocation')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'details' && location && (
            <div className="p-6 space-y-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <h4 className="font-medium">{location.name}</h4>
                </div>
                <p className="text-sm text-gray-500">{location.address}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('add:locationName')}
                </label>
                <Input
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder={t('add:enterCustomName')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {t('add:category')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORY_OPTIONS.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={`flex items-center gap-2 p-3 rounded-xl border transition-colors ${
                        category === cat.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-lg">{cat.icon}</span>
                      <span className="text-sm font-medium">{t(`categories:${cat.id}`)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('add:yourRating')}
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className={`p-1 ${
                        star <= rating ? 'text-yellow-400' : 'text-gray-300'
                      }`}
                    >
                      <Star className="w-6 h-6 fill-current" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('add:description')}
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('add:whatMakesSpecial')}
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('add:tags')}
                </label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder={t('add:addTag')}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    className="flex-1"
                  />
                  <Button onClick={addTag} variant="outline" size="sm">
                    {t('common:add')}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeTag(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => setStep('review')}
                className="w-full"
                disabled={!category || !locationName.trim()}
              >
                {t('add:continue')}
              </Button>
            </div>
          )}

          {step === 'review' && location && (
            <div className="p-6 space-y-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-semibold mb-3">{t('add:reviewYourLocation')}</h4>
                
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">{t('add:name')}:</span>
                    <span className="ml-2">{locationName}</span>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700">{t('add:category')}:</span>
                    <span className="ml-2 capitalize">{t(`categories:${category}`)}</span>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700">{t('common:addressNotAvailable', { defaultValue: 'Address' })}:</span>
                    <span className="ml-2">{location.address}</span>
                  </div>
                  
                  {rating > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">{t('add:yourRating')}:</span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {description && (
                    <div>
                      <span className="font-medium text-gray-700">{t('add:description')}:</span>
                      <p className="mt-1 text-gray-600">{description}</p>
                    </div>
                  )}
                  
                  {tags.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700">{t('add:tags')}:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep('details')}
                  className="flex-1"
                  disabled={loading}
                >
                  {t('common:back')}
                </Button>
                <Button
                  onClick={handleSave}
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('common:loading')}...
                    </>
                  ) : (
                    t('add:saveLocation')
                  )}
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
