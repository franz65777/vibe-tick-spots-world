
import React, { useState } from 'react';
import { X, MapPin, Camera, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AddLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  coordinates: { lat: number; lng: number } | null;
  onSaveLocation: (locationData: any) => void;
}

const categories = [
  'restaurant',
  'cafe',
  'bar',
  'hotel',
  'attraction',
  'park',
  'museum',
  'shopping',
  'entertainment',
  'transportation',
  'other'
];

const AddLocationModal = ({ isOpen, onClose, coordinates, onSaveLocation }: AddLocationModalProps) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen || !coordinates) return null;

  const handleSave = async () => {
    if (!name.trim() || !category) return;

    setSaving(true);
    try {
      const locationData = {
        name: name.trim(),
        category,
        description: description.trim() || undefined,
        coordinates,
        address: `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}` // Temporary address
      };

      await onSaveLocation(locationData);
      
      // Reset form
      setName('');
      setCategory('');
      setDescription('');
      onClose();
    } catch (error) {
      console.error('Error saving location:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Add New Location</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {/* Coordinates Display */}
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center gap-2 text-blue-800">
              <MapPin className="w-4 h-4" />
              <span className="text-sm font-medium">Selected Location</span>
            </div>
            <p className="text-sm text-blue-600 mt-1">
              {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
            </p>
          </div>

          {/* Location Name */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Location Name *
            </label>
            <Input
              placeholder="Enter location name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Category *
            </label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <Textarea
              placeholder="Tell others about this place..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || !name.trim() || !category}
              className="flex-1"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Location
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddLocationModal;
