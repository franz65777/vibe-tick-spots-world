import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, Plus, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { categoryDisplayNames, type AllowedCategory } from '@/utils/allowedCategories';
import { supabase } from '@/integrations/supabase/client';
import NearbyPlacesSuggestions from './NearbyPlacesSuggestions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface QuickAddPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  coordinates: { lat: number; lng: number } | null;
  onPinAdded: () => void;
  allowedCategoriesFilter?: string[];
}

const QuickAddPinModal = ({ isOpen, onClose, coordinates, onPinAdded, allowedCategoriesFilter }: QuickAddPinModalProps) => {
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
    // Enforce current map category filters if any are selected
    if (allowedCategoriesFilter && allowedCategoriesFilter.length > 0 && !allowedCategoriesFilter.includes(category)) {
      toast.error('This category is currently filtered out. Switch filters or pick a matching venue.');
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
    
    // Enforce current map category filters if any are selected
    if (allowedCategoriesFilter && allowedCategoriesFilter.length > 0 && !allowedCategoriesFilter.includes(category)) {
      toast.error('This category is currently filtered out. Switch filters or pick a matching venue.');
      return;
    }

    setIsLoading(true);
    try {
      // Get current user first
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error('User not authenticated');
      }

      // First, check if location already exists
      const { data: existingLocation } = await supabase
        .from('locations')
        .select('id')
        .eq('google_place_id', selectedPlace.place_id)
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
          throw new Error('Failed to create location: ' + locationError.message);
        }
        locationId = newLocation.id;
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
        onPinAdded();
        onClose();
        setSelectedPlace(null);
        return;
      }

      // Save to user's saved locations
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
      onClose();
      setSelectedPlace(null);
    } catch (error: any) {
      console.error('Error saving pin:', error);
      toast.error(error?.message || 'Failed to save location. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedPlace(null);
    onClose();
  };

  return coordinates ? (
    <NearbyPlacesSuggestions
      coordinates={coordinates}
      onClose={() => {
        onPinAdded();
        onClose();
      }}
      isOpen={isOpen}
    />
  ) : null;
};

export default QuickAddPinModal;