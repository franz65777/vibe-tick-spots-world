
import { useState } from 'react';
import { MapPin, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { locationService, SaveLocationData } from '@/services/locationService';
import { useToast } from '@/hooks/use-toast';

interface SaveLocationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSaved?: () => void;
}

const SaveLocationDialog = ({ isOpen, onClose, onLocationSaved }: SaveLocationDialogProps) => {
  const [formData, setFormData] = useState<SaveLocationData>({
    name: '',
    category: '',
    address: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const categories = [
    'Restaurant',
    'Bar',
    'Hotel',
    'Museum',
    'Shop',
    'Experience',
    'Cafe',
    'Park',
    'Beach',
    'Other'
  ];

  const handleSave = async () => {
    if (!formData.name || !formData.category) {
      toast({
        title: "Missing Information",
        description: "Please fill in the location name and category.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await locationService.saveLocation(formData);
      if (result) {
        toast({
          title: "Location Saved!",
          description: `${formData.name} has been added to your saved places.`,
        });
        onLocationSaved?.();
        onClose();
        setFormData({ name: '', category: '', address: '' });
      } else {
        throw new Error('Failed to save location');
      }
    } catch (error) {
      console.error('Error saving location:', error);
      toast({
        title: "Error",
        description: "Failed to save location. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center pb-[calc(env(safe-area-inset-bottom)+72px)] px-4">
      <div className="bg-background rounded-t-3xl w-full max-w-sm max-h-[55vh] overflow-y-auto shadow-2xl overflow-hidden ring-1 ring-border">
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-foreground">Save Location to Favorites</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Location Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Restaurant Francesco"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Category *
              </label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category.toLowerCase()}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Address (Optional)
              </label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Street address, city"
                className="w-full"
              />
            </div>

            <div className="pt-1">
              <Button
                onClick={handleSave}
                disabled={isLoading}
                className="w-full h-10"
                size="lg"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Save Location
                  </span>
                )}
              </Button>
            </div>
          </div>

          <div className="mt-2 p-2.5 bg-primary/10 rounded-xl">
            <p className="text-xs text-muted-foreground">
              💡 Save locations to easily find them later and see all posts tagged here
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaveLocationDialog;
