import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, Plus, Loader2, Navigation, Star } from 'lucide-react';
import { toast } from 'sonner';
import { categoryDisplayNames, type AllowedCategory } from '@/utils/allowedCategories';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

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

  // Fetch nearby suggestions when modal opens with coordinates
  useEffect(() => {
    if (isOpen && coordinates) {
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
      const { data, error } = await supabase.functions.invoke('foursquare-search', {
        body: { 
          lat: coordinates.lat, 
          lng: coordinates.lng,
          limit: 20,
          query: searchQuery || undefined
        }
      });

      if (error) throw error;
      
      if (data?.places) {
        setNearbySuggestions(data.places);
        console.log(`Found ${data.places.length} nearby suggestions`);
      }
    } catch (error: any) {
      console.error('Error fetching nearby suggestions:', error);
      toast.error('Failed to fetch nearby locations');
    } finally {
      setIsFetchingSuggestions(false);
    }
  };

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
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary" />
            <DialogTitle className="text-xl">Quick Add Location</DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Find and save nearby places to your favorites
          </p>
        </DialogHeader>

        <div className="px-6 space-y-3 flex-shrink-0">
          {/* Search input */}
          <div className="relative">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  fetchNearbySuggestions();
                }
              }}
              placeholder="Search nearby places..."
              className="pr-10"
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={fetchNearbySuggestions}
              disabled={isFetchingSuggestions}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
            >
              {isFetchingSuggestions ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span className="text-xs">Search</span>
              )}
            </Button>
          </div>

          {/* Selected place preview */}
          {selectedPlace && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <Star className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{selectedPlace.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{selectedPlace.address}</div>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {categoryDisplayNames[selectedPlace.category]}
                    </Badge>
                  </div>
                </div>
                <Button
                  onClick={handleSavePin}
                  disabled={isLoading}
                  size="sm"
                  className="flex-shrink-0"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-1" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Nearby suggestions */}
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full px-6 pb-6">
            {isFetchingSuggestions ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground">Finding nearby places...</p>
                </div>
              </div>
            ) : nearbySuggestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MapPin className="w-12 h-12 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium">No locations found nearby</p>
                <p className="text-xs text-muted-foreground mt-1">Try searching or drop a pin elsewhere</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Nearby Suggestions ({nearbySuggestions.length})
                </p>
                {nearbySuggestions.map((suggestion) => (
                  <button
                    key={suggestion.fsq_id}
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className={`w-full p-3 rounded-lg border text-left transition-all hover:shadow-md ${
                      selectedPlace?.name === suggestion.name && selectedPlace?.lat === suggestion.lat
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border bg-card hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <MapPin className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        selectedPlace?.name === suggestion.name && selectedPlace?.lat === suggestion.lat
                          ? 'text-primary'
                          : 'text-muted-foreground'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{suggestion.name}</div>
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                          {suggestion.address}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="outline" className="text-xs">
                            {categoryDisplayNames[suggestion.category]}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {suggestion.distance}m away
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickAddPinModal;
