import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import UnifiedSearchAutocomplete from '@/components/UnifiedSearchAutocomplete';
import PinDetailCard from '@/components/explore/PinDetailCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const SaveLocationPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [showSearch, setShowSearch] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);

  const handlePlaceSelect = async (place: any) => {
    console.log('Place selected:', place);
    
    // Check if location exists in database
    const { data: existingLocation } = await supabase
      .from('locations')
      .select('*')
      .or(`name.eq.${place.name},google_place_id.eq.${place.place_id || ''}`)
      .limit(1)
      .maybeSingle();

    let locationToShow = existingLocation;

    // If location doesn't exist, create it temporarily (will be saved properly when user clicks save)
    if (!existingLocation) {
      // Create the location in database so PinDetailCard can work with it
      const { data: newLocation, error } = await supabase
        .from('locations')
        .insert({
          name: place.name,
          address: place.address,
          latitude: place.coordinates.lat,
          longitude: place.coordinates.lng,
          category: place.category || 'restaurant',
          city: place.city,
          created_by: user?.id,
          pioneer_user_id: user?.id,
        })
        .select()
        .single();

      if (!error && newLocation) {
        locationToShow = newLocation;
      }
    }

    // Show PinDetailCard with the location
    setSelectedPlace({
      id: locationToShow?.id,
      google_place_id: locationToShow?.google_place_id,
      name: locationToShow?.name || place.name,
      address: locationToShow?.address || place.address,
      category: locationToShow?.category || place.category || 'restaurant',
      city: locationToShow?.city || place.city,
      coordinates: {
        lat: locationToShow?.latitude || place.coordinates.lat,
        lng: locationToShow?.longitude || place.coordinates.lng,
      },
    });
    setShowSearch(false);
  };

  return (
    <>
      {/* Main Page - Search Button */}
      <div className="fixed inset-0 bg-background z-[10001] flex flex-col pt-[25px]">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-accent rounded-full transition-colors flex-shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold truncate">
              {t('navigation:addLocation', { defaultValue: 'Aggiungi luogo' })}
            </h2>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <button
            onClick={() => setShowSearch(true)}
            className="w-full max-w-md px-6 py-4 bg-muted hover:bg-muted/80 rounded-xl flex items-center gap-3 transition-colors"
          >
            <Search className="w-5 h-5 text-muted-foreground" />
            <span className="text-muted-foreground">
              {t('common:searchLocation', { defaultValue: 'Cerca luogo' })}
            </span>
          </button>
        </div>
      </div>

      {/* Full-Page Search Overlay */}
      {showSearch && (
        <div className="fixed inset-0 bg-background z-[10002] flex flex-col pt-[25px]">
          <div className="flex items-center gap-3 px-4 py-4">
            <button
              onClick={() => setShowSearch(false)}
              className="p-2 hover:bg-accent rounded-full transition-colors flex-shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <UnifiedSearchAutocomplete
                onPlaceSelect={handlePlaceSelect}
                placeholder={t('common:searchLocationPlaceholder', { defaultValue: 'Cerca ristoranti, bar, hotel...' })}
                autoFocus
              />
            </div>
          </div>
        </div>
      )}

      {/* PinDetailCard */}
      {selectedPlace && (
        <PinDetailCard
          place={selectedPlace}
          onClose={() => {
            setSelectedPlace(null);
            navigate(-1);
          }}
        />
      )}
    </>
  );
};

export default SaveLocationPage;
