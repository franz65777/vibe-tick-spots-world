import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { categoryDisplayNames, type AllowedCategory } from '@/utils/allowedCategories';
import { supabase } from '@/integrations/supabase/client';
import OpenStreetMapAutocomplete from '@/components/OpenStreetMapAutocomplete';

interface QuickAddPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  coordinates: { lat: number; lng: number } | null;
  onPinAdded: () => void;
  allowedCategoriesFilter?: string[];
}

const QuickAddPinModal = ({ isOpen, onClose, coordinates, onPinAdded, allowedCategoriesFilter }: QuickAddPinModalProps) => {
  const [selectedPlace, setSelectedPlace] = useState<{
    name: string;
    address: string;
    lat: number;
    lng: number;
    city: string;
  } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<AllowedCategory>('restaurant');
  const [isLoading, setIsLoading] = useState(false);

  const categories: AllowedCategory[] = ['restaurant', 'bar', 'cafe', 'bakery', 'hotel', 'museum', 'entertainment'];

  const handlePlaceSelect = (place: {
    name: string;
    address: string;
    coordinates: { lat: number; lng: number };
    city: string;
  }) => {
    setSelectedPlace({
      name: place.name,
      address: place.address,
      lat: place.coordinates.lat,
      lng: place.coordinates.lng,
      city: place.city,
    });
  };

  const handleSavePin = async () => {
    if (!selectedPlace) {
      toast.error('Please select a location first');
      return;
    }

    if (allowedCategoriesFilter && allowedCategoriesFilter.length > 0 && !allowedCategoriesFilter.includes(selectedCategory)) {
      toast.error('This category is currently filtered out. Switch filters or pick a matching venue.');
      return;
    }

    setIsLoading(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error('User not authenticated');
      }

      // Check if location exists
      const googlePlaceId = `osm-${selectedPlace.lat}-${selectedPlace.lng}`;
      const { data: existingLocation } = await supabase
        .from('locations')
        .select('id')
        .eq('google_place_id', googlePlaceId)
        .maybeSingle();

      let locationId: string;

      if (existingLocation) {
        locationId = existingLocation.id;
      } else {
        // Create new location
        const { data: newLocation, error: locationError } = await supabase
          .from('locations')
          .insert({
            name: selectedPlace.name,
            category: selectedCategory,
            address: selectedPlace.address,
            city: selectedPlace.city,
            latitude: selectedPlace.lat,
            longitude: selectedPlace.lng,
            google_place_id: googlePlaceId,
            created_by: userData.user.id,
          })
          .select('id')
          .single();

        if (locationError) {
          throw new Error('Failed to create location: ' + locationError.message);
        }
        locationId = newLocation.id;
      }

      // Check if already saved
      const { data: existingSave } = await supabase
        .from('user_saved_locations')
        .select('id')
        .eq('user_id', userData.user.id)
        .eq('location_id', locationId)
        .maybeSingle();

      if (existingSave) {
        toast.info(`${selectedPlace.name} is already in your favorites!`);
        onPinAdded();
        handleClose();
        return;
      }

      // Save location
      const { error: saveError } = await supabase
        .from('user_saved_locations')
        .insert({
          user_id: userData.user.id,
          location_id: locationId,
        });

      if (saveError) {
        throw new Error('Failed to save location: ' + saveError.message);
      }
      
      toast.success(`${selectedPlace.name} saved to your favorites!`);
      onPinAdded();
      handleClose();
    } catch (error: any) {
      console.error('Error saving pin:', error);
      toast.error(error?.message || 'Failed to save location. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedPlace(null);
    setSelectedCategory('restaurant');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Add Location</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Search for place */}
          <div>
            <label className="text-sm font-medium mb-2 block">Search Place</label>
            <OpenStreetMapAutocomplete
              onPlaceSelect={handlePlaceSelect}
              placeholder="Search for a place..."
            />
          </div>

          {/* Show selected place */}
          {selectedPlace && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-primary mt-1" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{selectedPlace.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{selectedPlace.address}</div>
                </div>
              </div>
            </div>
          )}

          {/* Category selection */}
          {selectedPlace && (
            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat)}
                    className="justify-start"
                  >
                    {categoryDisplayNames[cat]}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Save button */}
          {selectedPlace && (
            <Button
              onClick={handleSavePin}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Save to Favorites
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickAddPinModal;
