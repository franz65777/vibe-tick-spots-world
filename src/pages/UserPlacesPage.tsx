import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useGeolocation } from '@/hooks/useGeolocation';
import LeafletMapSetup from '@/components/LeafletMapSetup';
import { Place } from '@/types/place';
import { MapFilterProvider } from '@/contexts/MapFilterContext';

interface SavedLocation {
  id: string;
  name: string;
  category: string;
  city: string | null;
  address: string | null;
  coordinates: { lat: number; lng: number } | null;
  save_tag: string;
  image_url?: string | null;
  review?: string | null;
}

const UserPlacesPage = () => {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const { location: userLocation } = useGeolocation();
  
  const initialFilterCategory = (location.state as any)?.filterCategory || 'all';
  const [filterCategory] = useState<string>(initialFilterCategory);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [cities, setCities] = useState<{ city: string; count: number }[]>([]);
  const [profile, setProfile] = useState<{ username: string; avatar_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;
      const { data } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', userId)
        .single();
      if (data) setProfile(data);
    };
    fetchProfile();
  }, [userId]);

  // Fetch saved locations for the user - filtered by category
  useEffect(() => {
    const fetchLocations = async () => {
      if (!userId) return;
      setLoading(true);
      
      try {
        const allLocations: SavedLocation[] = [];

        // Fetch from user_saved_locations with optional category filter
        let internalQuery = supabase
          .from('user_saved_locations')
          .select(`
            location_id,
            save_tag,
            locations(id, name, category, city, address, latitude, longitude, image_url)
          `)
          .eq('user_id', userId);

        // Apply category filter at query level if not 'all'
        if (filterCategory !== 'all' && filterCategory !== 'common') {
          internalQuery = internalQuery.eq('save_tag', filterCategory);
        }

        const { data: internalLocs } = await internalQuery;

        if (internalLocs) {
          internalLocs.forEach(loc => {
            const l = loc.locations as any;
            if (l) {
              allLocations.push({
                id: l.id,
                name: l.name,
                category: l.category,
                city: l.city,
                address: l.address,
                coordinates: l.latitude && l.longitude ? { lat: l.latitude, lng: l.longitude } : null,
                save_tag: loc.save_tag || 'been',
                image_url: l.image_url
              });
            }
          });
        }

        // Fetch from saved_places (Google Places) with optional category filter
        let savedPlacesQuery = supabase
          .from('saved_places')
          .select('id, place_id, place_name, place_category, city, coordinates, save_tag')
          .eq('user_id', userId);

        if (filterCategory !== 'all' && filterCategory !== 'common') {
          savedPlacesQuery = savedPlacesQuery.eq('save_tag', filterCategory);
        }

        const { data: savedPlaces } = await savedPlacesQuery;

        if (savedPlaces) {
          savedPlaces.forEach(sp => {
            const coords = sp.coordinates as any;
            allLocations.push({
              id: sp.place_id,
              name: sp.place_name,
              category: sp.place_category || 'restaurant',
              city: sp.city,
              address: null,
              coordinates: coords?.lat && coords?.lng ? { lat: coords.lat, lng: coords.lng } : null,
              save_tag: sp.save_tag || 'been'
            });
          });
        }

        // For "common" filter, get intersection with current user's saves
        if (filterCategory === 'common' && currentUser && currentUser.id !== userId) {
          const { data: myInternal } = await supabase
            .from('user_saved_locations')
            .select('location_id')
            .eq('user_id', currentUser.id);
          
          const { data: mySaved } = await supabase
            .from('saved_places')
            .select('place_id')
            .eq('user_id', currentUser.id);

          const myIds = new Set([
            ...(myInternal?.map(l => l.location_id) || []),
            ...(mySaved?.map(p => p.place_id) || [])
          ]);

          const commonLocs = allLocations.filter(loc => myIds.has(loc.id));
          setLocations(commonLocs);
        } else {
          setLocations(allLocations);
        }

        // Calculate cities from fetched locations
        const cityCount: Record<string, number> = {};
        allLocations.forEach(loc => {
          if (loc.city) {
            cityCount[loc.city] = (cityCount[loc.city] || 0) + 1;
          }
        });
        const citiesArray = Object.entries(cityCount)
          .map(([city, count]) => ({ city, count }))
          .sort((a, b) => b.count - a.count);
        setCities(citiesArray);

        // Auto-select city if only one city exists
        if (citiesArray.length === 1) {
          setSelectedCity(citiesArray[0].city);
        }

      } catch (err) {
        console.error('Error fetching locations:', err);
      } finally {
        setLoading(false);
        setHasInitialized(true);
      }
    };

    fetchLocations();
  }, [userId, currentUser, filterCategory]);

  // Filter locations by city only (category already filtered at query level)
  const filteredLocations = useMemo(() => {
    if (selectedCity) {
      return locations.filter(loc => loc.city === selectedCity);
    }
    return locations;
  }, [locations, selectedCity]);

  // Convert to Place format for map
  const places: Place[] = filteredLocations
    .filter(loc => loc.coordinates)
    .map(loc => ({
      id: loc.id,
      name: loc.name,
      category: loc.category as any,
      address: loc.address || '',
      city: loc.city || undefined,
      coordinates: loc.coordinates!,
      isFollowing: false,
      isNew: false,
      isSaved: true,
      likes: 0,
      visitors: []
    }));

  // Calculate map center - prioritize user's current location when no city selected
  const mapCenter = useMemo(() => {
    // If user location is available and no city is selected, use user's location
    if (userLocation && !selectedCity) {
      return { lat: userLocation.latitude, lng: userLocation.longitude };
    }
    
    // Otherwise, center on filtered locations
    const locsWithCoords = filteredLocations.filter(l => l.coordinates);
    if (locsWithCoords.length === 0) {
      // Fallback to user location or default
      if (userLocation) return { lat: userLocation.latitude, lng: userLocation.longitude };
      return { lat: 53.3498, lng: -6.2603 }; // Default Dublin
    }
    
    const avgLat = locsWithCoords.reduce((sum, l) => sum + l.coordinates!.lat, 0) / locsWithCoords.length;
    const avgLng = locsWithCoords.reduce((sum, l) => sum + l.coordinates!.lng, 0) / locsWithCoords.length;
    return { lat: avgLat, lng: avgLng };
  }, [filteredLocations, userLocation, selectedCity]);

  const handlePinClick = (place: Place) => {
    setSelectedPlace(place);
  };

  const handleCityClick = (city: string) => {
    setSelectedCity(city);
  };

  const handleBack = () => {
    if (selectedCity && cities.length > 1) {
      // Go back to city selection if there are multiple cities
      setSelectedCity(null);
    } else {
      // Navigate back to previous page
      navigate(-1);
    }
  };

  // Show empty state if no locations for this filter
  if (hasInitialized && locations.length === 0) {
    return (
      <div className="flex flex-col h-screen bg-background">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] bg-background/80 backdrop-blur-sm z-50">
          <button onClick={() => navigate(-1)} className="p-0 hover:opacity-70 transition-opacity">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">
            {profile?.username ? `${profile.username}'s ${t('userProfile.places', { ns: 'common' })}` : t('userProfile.places', { ns: 'common' })}
          </h1>
          <div className="w-6" />
        </div>

        {/* Empty state */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-8">
            <p className="text-muted-foreground">
              {t('userProfile.noLocationsInCity', { ns: 'common' })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background">
      {/* Map taking full screen including behind header */}
      <div className="absolute inset-0">
        <MapFilterProvider>
          <LeafletMapSetup
            places={places}
            onPinClick={handlePinClick}
            mapCenter={mapCenter}
            selectedPlace={selectedPlace}
            onCloseSelectedPlace={() => setSelectedPlace(null)}
            onMapClick={() => setSelectedPlace(null)}
            fullScreen={true}
            preventCenterUpdate={false}
          />
        </MapFilterProvider>
      </div>

      {/* Header overlay - transparent with text shadow for visibility */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] z-[1000]">
        <button onClick={handleBack} className="p-2 -m-2 hover:opacity-70 transition-opacity rounded-full bg-background/60 backdrop-blur-sm">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold px-3 py-1 rounded-full bg-background/60 backdrop-blur-sm">
          {profile?.username ? `${profile.username}'s ${t('userProfile.places', { ns: 'common' })}` : t('userProfile.places', { ns: 'common' })}
        </h1>
        <div className="w-10" />
      </div>

      {/* City pills at bottom - only show if multiple cities */}
      {cities.length > 1 && (
        <div className="absolute bottom-6 left-0 right-0 z-[1000] px-4 pb-safe">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {cities.map(({ city, count }) => (
              <button
                key={city}
                onClick={() => handleCityClick(city)}
                className={`flex items-center gap-1 px-4 py-2 rounded-full backdrop-blur-sm border shadow-lg shrink-0 transition-all ${
                  selectedCity === city 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'bg-background/90 border-border'
                }`}
              >
                <span className="font-medium">{city}</span>
                <span className={`text-xs ${selectedCity === city ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{count}</span>
              </button>
            ))}
          </div>
          {!selectedCity && (
            <p className="text-center text-sm text-muted-foreground mt-2 bg-background/60 backdrop-blur-sm rounded-full px-3 py-1 mx-auto w-fit">
              {t('userProfile.tapCityToSee', { ns: 'common' })}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default UserPlacesPage;
