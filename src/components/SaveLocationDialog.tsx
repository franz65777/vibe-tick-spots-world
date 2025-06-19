
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Lock, Users, Globe } from 'lucide-react';
import { locationService } from '@/services/locationService';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';

interface SaveLocationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  coordinates?: { lat: number; lng: number } | null;
  locationName?: string;
  onSaved?: () => void;
}

const SaveLocationDialog = ({ isOpen, onClose, coordinates, locationName, onSaved }: SaveLocationDialogProps) => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [name, setName] = useState(locationName || '');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'private' | 'followers' | 'public'>(
    (profile?.default_location_privacy as 'private' | 'followers' | 'public') || 'followers'
  );
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !category || !coordinates || !user) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const locationData = {
        name: name.trim(),
        category,
        description: description.trim(),
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        privacy_level: privacy,
        metadata: {
          added_via: 'manual_save',
          privacy_level: privacy
        }
      };

      const result = await locationService.saveLocation(locationData);
      
      if (result) {
        console.log('Location saved successfully with privacy:', privacy);
        onSaved?.();
        onClose();
        setName('');
        setCategory('');
        setDescription('');
      } else {
        throw new Error('Failed to save location');
      }
    } catch (error) {
      console.error('Error saving location:', error);
      alert('Failed to save location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const privacyOptions = [
    {
      value: 'private',
      label: 'Private',
      description: 'Only you can see this location',
      icon: Lock
    },
    {
      value: 'followers',
      label: 'Followers Only',
      description: 'Only your followers can see this location',
      icon: Users
    },
    {
      value: 'public',
      label: 'Public',
      description: 'Anyone can see this location',
      icon: Globe
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Save Location
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Location Name *</Label>
            <Input
              id="name"
              placeholder="Enter location name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="restaurant">Restaurant</SelectItem>
                <SelectItem value="cafe">Café</SelectItem>
                <SelectItem value="bar">Bar</SelectItem>
                <SelectItem value="hotel">Hotel</SelectItem>
                <SelectItem value="attraction">Attraction</SelectItem>
                <SelectItem value="shopping">Shopping</SelectItem>
                <SelectItem value="entertainment">Entertainment</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Add a note about this place..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <Label>Privacy Setting</Label>
            <div className="space-y-2">
              {privacyOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <Card 
                    key={option.value}
                    className={`cursor-pointer transition-colors ${
                      privacy === option.value ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setPrivacy(option.value as 'private' | 'followers' | 'public')}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <IconComponent className="w-4 h-4 text-gray-600" />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{option.label}</div>
                          <div className="text-xs text-gray-500">{option.description}</div>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          privacy === option.value 
                            ? 'border-blue-500 bg-blue-500' 
                            : 'border-gray-300'
                        }`}>
                          {privacy === option.value && (
                            <div className="w-full h-full rounded-full bg-white scale-50"></div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {coordinates && (
            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
              📍 {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading} className="flex-1">
              {loading ? 'Saving...' : 'Save Location'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SaveLocationDialog;
