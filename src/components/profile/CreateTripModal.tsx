
import React, { useState } from 'react';
import { X, Calendar, MapPin, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tripData: {
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    locations: string[];
  }) => void;
}

const CreateTripModal: React.FC<CreateTripModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [locations, setLocations] = useState<string[]>([]);
  const [newLocation, setNewLocation] = useState('');

  if (!isOpen) return null;

  const handleAddLocation = () => {
    if (newLocation.trim() && !locations.includes(newLocation.trim())) {
      setLocations([...locations, newLocation.trim()]);
      setNewLocation('');
    }
  };

  const handleRemoveLocation = (index: number) => {
    setLocations(locations.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (name.trim() && startDate && endDate) {
      onSave({
        name: name.trim(),
        description: description.trim(),
        startDate,
        endDate,
        locations
      });
      
      // Reset form
      setName('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setLocations([]);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Create New Trip</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {/* Trip Name */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Trip Name *
            </label>
            <Input
              placeholder="Enter trip name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <Textarea
              placeholder="Describe your trip..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Start Date *
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                End Date *
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                required
              />
            </div>
          </div>

          {/* Locations */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Locations
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a location"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddLocation()}
              />
              <Button 
                type="button" 
                onClick={handleAddLocation}
                variant="outline"
                size="sm"
              >
                Add
              </Button>
            </div>
            
            {locations.length > 0 && (
              <div className="space-y-2 mt-3">
                {locations.map((location, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-100 rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{location}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveLocation(index)}
                      className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!name.trim() || !startDate || !endDate}
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              Create Trip
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTripModal;
