import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { categoryDisplayNames, type AllowedCategory } from '@/utils/allowedCategories';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

// Import category icons
import restaurantIcon from '@/assets/category-restaurant-upload.png';
import barIcon from '@/assets/category-bar-upload.png';
import cafeIcon from '@/assets/category-cafe-upload.png';
import bakeryIcon from '@/assets/category-bakery-upload.png';
import hotelIcon from '@/assets/category-hotel-upload.png';
import museumIcon from '@/assets/category-museum-upload.png';
import entertainmentIcon from '@/assets/category-entertainment-upload.png';

const getCategoryIconImage = (category: string): string => {
  switch (category) {
    case 'restaurant': return restaurantIcon;
    case 'bar': return barIcon;
    case 'cafe': return cafeIcon;
    case 'bakery': return bakeryIcon;
    case 'hotel': return hotelIcon;
    case 'museum': return museumIcon;
    case 'entertainment': return entertainmentIcon;
    default: return restaurantIcon;
  }
};

interface QuickAddPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  coordinates: { lat: number; lng: number } | null;
  onPinAdded: () => void;
  allowedCategoriesFilter?: string[];
}

interface NearbyPlace {
  fsq_id: string;
  name: string;
  category: AllowedCategory;
  address: string;
  city: string;
  lat: number;
  lng: number;
  distance: number;
}

const QuickAddPinModal = ({ isOpen, onClose, coordinates, onPinAdded, allowedCategoriesFilter }: QuickAddPinModalProps) => {
  const [selectedPlace, setSelectedPlace] = useState<{
    name: string;
    address: string;
    lat: number;
    lng: number;
    city: string;
    category: AllowedCategory;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [nearbySuggestions, setNearbySuggestions] = useState<NearbyPlace[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const categories: AllowedCategory[] = ['restaurant', 'bar', 'cafe', 'bakery', 'hotel', 'museum', 'entertainment'];

  // Fetch nearby suggestions when modal opens with coordinates (immediate load)
  useEffect(() => {
    if (isOpen && coordinates) {
      // Immediate fetch on open
      fetchNearbySuggestions();
    } else {
      setNearbySuggestions([]);
      setSelectedPlace(null);
      setSearchQuery('');
    }
  }, [isOpen, coordinates]);

  const fetchNearbySuggestions = async () => {
    if (!coordinates) return;
    
    setIsFetchingSuggestions(true);
    try {
      console.log('Fetching nearby suggestions for coordinates:', coordinates);
      
      const { data, error } = await supabase.functions.invoke('foursquare-search', {
        body: { 
          lat: coordinates.lat, 
          lng: coordinates.lng,
          limit: 20,
          query: searchQuery || undefined
        }
      });

      console.log('Foursquare response:', { data, error });

      if (error) {
        console.error('Foursquare function error:', error);
        throw error;
      }
      
      if (data?.error) {
        console.error('Foursquare API error:', data.error);
        toast.error(data.error);
        return;
      }
      
      if (data?.places) {
        setNearbySuggestions(data.places);
        console.log(`Found ${data.places.length} nearby suggestions`);
      } else {
        console.warn('No places returned from Foursquare');
        setNearbySuggestions([]);
      }
    } catch (error: any) {
      console.error('Error fetching nearby suggestions:', error);
      toast.error(error?.message || 'Failed to fetch nearby locations. Please try again.');
    } finally {
      setIsFetchingSuggestions(false);
    }
  };

  // Debounced search as-you-type (only when user types, not on initial load)
  useEffect(() => {
    if (!isOpen || !coordinates || !searchQuery) return;
    const t = setTimeout(() => {
      fetchNearbySuggestions();
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const handleSuggestionSelect = (suggestion: NearbyPlace) => {
    setSelectedPlace({
      name: suggestion.name,
      address: suggestion.address,
      lat: suggestion.lat,
      lng: suggestion.lng,
      city: suggestion.city,
      category: suggestion.category,
    });
  };

  const handleSavePin = async () => {
    if (!selectedPlace) {
      toast.error('Please select a location first');
      return;
    }

    const categoryToUse = selectedPlace.category;

    if (allowedCategoriesFilter && allowedCategoriesFilter.length > 0 && !allowedCategoriesFilter.includes(categoryToUse)) {
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
            category: categoryToUse,
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
    setNearbySuggestions([]);
    setSearchQuery('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 rounded-3xl">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-semibold">Save Location to Favorites</DialogTitle>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 flex-shrink-0">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  fetchNearbySuggestions();
                }
              }}
              placeholder="Filter results or type to search..."
              className="pl-10 h-12 text-base border-2 rounded-xl"
            />
          </div>
          
          {/* Helper text */}
          {!isFetchingSuggestions && nearbySuggestions.length > 0 && (
            <p className="text-sm text-muted-foreground mt-3">
              Tap a suggestion below or keep typing to search:
            </p>
          )}
        </div>

        {/* Nearby suggestions scrollable list */}
        <div className="flex-1 min-h-0 overflow-hidden px-6 pb-6">
          <ScrollArea className="h-full max-h-full">
            {isFetchingSuggestions ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center space-y-3">
                  <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground">Finding nearby places...</p>
                </div>
              </div>
            ) : nearbySuggestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <MapPin className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <p className="text-base font-medium text-foreground">No locations found nearby</p>
                <p className="text-sm text-muted-foreground mt-2">Try searching or drop a pin elsewhere</p>
              </div>
            ) : (
              <div className="space-y-3 pb-4">
                {nearbySuggestions.map((suggestion) => {
                  const categoryIcon = getCategoryIconImage(suggestion.category);
                  const isSelected = selectedPlace?.name === suggestion.name && selectedPlace?.lat === suggestion.lat;
                  
                  return (
                    <button
                      key={suggestion.fsq_id}
                      onClick={() => handleSuggestionSelect(suggestion)}
                      className={`w-full p-4 rounded-2xl text-left transition-all group relative ${
                        isSelected
                          ? 'bg-primary/5 border-2 border-primary shadow-md'
                          : 'bg-card border-2 border-border hover:border-primary/50 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon - no background */}
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0">
                          <img 
                            src={categoryIcon} 
                            alt={suggestion.category}
                            className="w-9 h-9 object-contain"
                          />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-base text-foreground mb-1">
                            {suggestion.name}
                          </h4>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {suggestion.address}
                          </p>
                          
                          {/* Category and distance */}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs font-medium">
                              {categoryDisplayNames[suggestion.category]}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {Math.round(suggestion.distance)}m away
                            </span>
                          </div>
                        </div>

                        {/* Save button on hover/selected */}
                        {isSelected && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSavePin();
                            }}
                            disabled={isLoading}
                            size="lg"
                            className="flex-shrink-0 rounded-xl shadow-md h-12 px-6"
                          >
                            {isLoading ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <span className="font-semibold">Save to Favorites</span>
                            )}
                          </Button>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Cancel button at bottom */}
        <div className="px-6 pb-6 pt-2 border-t">
          <Button
            onClick={handleClose}
            variant="outline"
            size="lg"
            className="w-full rounded-xl h-12"
            disabled={isLoading}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickAddPinModal;
