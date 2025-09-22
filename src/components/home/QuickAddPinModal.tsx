import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, Plus, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { allowedCategories, categoryDisplayNames, type AllowedCategory } from '@/utils/allowedCategories';
import GooglePlacesAutocomplete from '@/components/GooglePlacesAutocomplete';
import { supabase } from '@/integrations/supabase/client';

interface QuickAddPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  coordinates: { lat: number; lng: number } | null;
  onPinAdded: () => void;
}

const QuickAddPinModal = ({ isOpen, onClose, coordinates, onPinAdded }: QuickAddPinModalProps) => {
  const [selectedPlace, setSelectedPlace] = useState<{
    place_id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    types: string[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Map Google Places types to our categories
  const mapPlaceTypeToCategory = (types: string[]): AllowedCategory | null => {
    if (types.includes('restaurant') || types.includes('meal_takeaway') || types.includes('food')) return 'restaurant';
    if (types.includes('bar') || types.includes('night_club')) return 'bar';
    if (types.includes('cafe')) return 'cafe';
    if (types.includes('bakery')) return 'bakery';
    if (types.includes('lodging')) return 'hotel';
    if (types.includes('museum') || types.includes('art_gallery')) return 'museum';
    if (types.includes('amusement_park') || types.includes('tourist_attraction')) return 'entertainment';
    return null;
  };

  const handlePlaceSelect = (place: {
    place_id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    types: string[];
  }) => {
    const category = mapPlaceTypeToCategory(place.types);
    if (!category) {
      toast.error('This type of location cannot be saved. Please select a restaurant, bar, café, hotel, bakery, museum, or entertainment venue.');
      return;
    }
    
    setSelectedPlace({ ...place });
  };

  const handleSavePin = async () => {
    if (!selectedPlace) {
      toast.error('Please select a location first');
      return;
    }

    const category = mapPlaceTypeToCategory(selectedPlace.types);
    if (!category) {
      toast.error('Invalid location type selected');
      return;
    }

    setIsLoading(true);
    try {
      // Get current user first
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('User not authenticated');
      }

      console.log('Saving location:', {
        name: selectedPlace.name,
        category: category,
        address: selectedPlace.address,
        latitude: selectedPlace.lat,
        longitude: selectedPlace.lng,
        google_place_id: selectedPlace.place_id,
        place_types: selectedPlace.types,
        created_by: userData.user.id,
      });

      // First, check if location already exists
      const { data: existingLocation } = await supabase
        .from('locations')
        .select('id')
        .eq('google_place_id', selectedPlace.place_id)
        .maybeSingle();

      let locationId: string;

      if (existingLocation) {
        // Location exists, use its ID
        locationId = existingLocation.id;
        console.log('Found existing location:', locationId);
      } else {
        // Create new location
        const { data: newLocation, error: locationError } = await supabase
          .from('locations')
          .insert({
            name: selectedPlace.name,
            category: category,
            address: selectedPlace.address,
            latitude: selectedPlace.lat,
            longitude: selectedPlace.lng,
            google_place_id: selectedPlace.place_id,
            place_types: selectedPlace.types,
            created_by: userData.user.id,
          })
          .select('id')
          .single();

        if (locationError) {
          console.error('Location creation error:', locationError);
          throw locationError;
        }
        locationId = newLocation.id;
        console.log('Created new location:', locationId);
      }

      // Check if user already saved this location
      const { data: existingSave } = await supabase
        .from('user_saved_locations')
        .select('id')
        .eq('user_id', userData.user.id)
        .eq('location_id', locationId)
        .maybeSingle();

      if (existingSave) {
        toast.info(`${selectedPlace.name} is already in your favorites!`);
      } else {
        // Save to user's saved locations
        const { error: saveError } = await supabase
          .from('user_saved_locations')
          .insert({
            user_id: userData.user.id,
            location_id: locationId,
          });

        if (saveError) {
          console.error('Save location error:', saveError);
          throw saveError;
        }
        
        toast.success(`${selectedPlace.name} saved to your favorites!`);
      }
      
      onPinAdded();
      onClose();
      setSelectedPlace(null);
    } catch (error) {
      console.error('Error saving pin:', error);
      toast.error('Failed to save location. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedPlace(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Save Location to Favorites
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Search for a real place or business *
            </label>
            <GooglePlacesAutocomplete
              onPlaceSelect={handlePlaceSelect}
              placeholder="Search restaurants, bars, cafés, hotels..."
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              Only real venues (restaurants, bars, cafés, hotels, museums, etc.) can be saved as favorites
            </p>
          </div>

          {selectedPlace && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-green-900">{selectedPlace.name}</h4>
                  <p className="text-sm text-green-700 mt-1">{selectedPlace.address}</p>
                  <p className="text-xs text-green-600 mt-2">
                    Category: {categoryDisplayNames[mapPlaceTypeToCategory(selectedPlace.types) || 'restaurant']}
                  </p>
                </div>
              </div>
            </div>
          )}

          {coordinates && (
            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
              📍 Clicked at: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSavePin} 
            disabled={isLoading || !selectedPlace}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Plus className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Save to Favorites
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickAddPinModal;