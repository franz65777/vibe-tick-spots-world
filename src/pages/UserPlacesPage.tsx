import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useGeolocation } from '@/hooks/useGeolocation';
import LeafletMapSetup from '@/components/LeafletMapSetup';
import { Place } from '@/types/place';
import { MapFilterProvider } from '@/contexts/MapFilterContext';
import { SwipeBackWrapper } from '@/components/common/SwipeBackWrapper';
import { normalizeCity, extractParentCityFromAddress } from '@/utils/cityNormalization';
import { nominatimGeocoding } from '@/lib/nominatimGeocoding';
import saveTagAll from '@/assets/save-tag-all.png';
import saveTagBeen from '@/assets/save-tag-been.png';
import saveTagToTry from '@/assets/save-tag-to-try.png';
import saveTagFavourite from '@/assets/save-tag-favourite.png';

// Map filter categories to icons
const filterCategoryIcons: Record<string, string> = {
  'all': saveTagAll,
  'been': saveTagBeen,
  'to-try': saveTagToTry,
  'favourite': saveTagFavourite,
};

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
  const initialSelectedCity = (location.state as any)?.selectedCity || null;
  const [filterCategory] = useState<string>(initialFilterCategory);
  const [selectedCity, setSelectedCity] = useState<string | null>(initialSelectedCity);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [cities, setCities] = useState<{ city: string; count: number }[]>([]);
  const [profile, setProfile] = useState<{ username: string; avatar_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [recenterToken, setRecenterToken] = useState(0);

  // Get page title with proper grammar for each language
  const getPageTitle = () => {
    if (!profile?.username) {
      switch (filterCategory) {
        case 'been':
          return t('userProfile.beenPlaces', { ns: 'common' });
        case 'to-try':
          return t('userProfile.toTryPlaces', { ns: 'common' });
        case 'favourite':
          return t('userProfile.favouritePlaces', { ns: 'common' });
        case 'common':
          return t('userProfile.commonPlaces', { ns: 'common' });
        default:
          return t('userProfile.allPlaces', { ns: 'common' });
      }
    }
    
    // Use translation keys with username interpolation for proper grammar in each language
    switch (filterCategory) {
      case 'been':
        return t('userProfile.userBeenPlaces', { ns: 'common', username: profile.username });
      case 'to-try':
        return t('userProfile.userToTryPlaces', { ns: 'common', username: profile.username });
      case 'favourite':
        return t('userProfile.userFavouritePlaces', { ns: 'common', username: profile.username });
      case 'common':
        return t('userProfile.userCommonPlaces', { ns: 'common', username: profile.username });
      default:
        return t('userProfile.userAllPlaces', { ns: 'common', username: profile.username });
    }
  };

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
        // Handle both hyphen and underscore formats for save_tag
        if (filterCategory !== 'all' && filterCategory !== 'common') {
          if (filterCategory === 'to-try') {
            internalQuery = internalQuery.in('save_tag', ['to_try', 'to-try', 'general']);
          } else {
            internalQuery = internalQuery.eq('save_tag', filterCategory);
          }
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

        // Handle both hyphen and underscore formats for save_tag
        if (filterCategory !== 'all' && filterCategory !== 'common') {
          if (filterCategory === 'to-try') {
            savedPlacesQuery = savedPlacesQuery.in('save_tag', ['to_try', 'to-try', 'general']);
          } else {
            savedPlacesQuery = savedPlacesQuery.eq('save_tag', filterCategory);
          }
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
        let finalLocations = allLocations;
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

          // Filter to only locations that BOTH users have saved
          finalLocations = allLocations.filter(loc => myIds.has(loc.id));
        }
        
        // Normalize city names for consistency - handle sub-city areas
        for (const loc of finalLocations) {
          if (!loc.city) continue;

          let normalizedCityName = normalizeCity(loc.city);

          // If normalization returned Unknown (e.g., for "Surcin Urban Municipality"),
          // try to extract parent city from address
          if (normalizedCityName === 'Unknown' && loc.address) {
            const parentCity = extractParentCityFromAddress(loc.address, loc.city);
            if (parentCity && parentCity !== 'Unknown') {
              normalizedCityName = parentCity;
            }
          }

          // Last resort: reverse geocode coordinates to find the real parent city
          // (prevents this problem globally even when DB has a municipality name and no address)
          if (normalizedCityName === 'Unknown' && loc.coordinates) {
            try {
              const rg = await nominatimGeocoding.reverseGeocode(loc.coordinates.lat, loc.coordinates.lng, 'en');
              const rgCity = normalizeCity(rg?.city || null);
              if (rgCity && rgCity !== 'Unknown') {
                normalizedCityName = rgCity;
              }
            } catch (e) {
              console.warn('Reverse geocode city resolve failed:', e);
            }
          }

          if (normalizedCityName && normalizedCityName !== 'Unknown') {
            loc.city = normalizedCityName;
          }
        }
        
        setLocations(finalLocations);

        // Calculate cities from FINAL filtered locations (common only if common filter)
        const cityCount: Record<string, number> = {};
        finalLocations.forEach(loc => {
          if (loc.city) {
            cityCount[loc.city] = (cityCount[loc.city] || 0) + 1;
          }
        });
        const citiesArray = Object.entries(cityCount)
          .map(([city, count]) => ({ city, count }))
          .sort((a, b) => b.count - a.count);
        setCities(citiesArray);

        // Auto-select city if only one city exists AND no city was restored from state
        if (citiesArray.length === 1 && !initialSelectedCity) {
          setSelectedCity(citiesArray[0].city);
        }
        
        // If we have a restored city from navigation state, trigger recenter after data loads
        if (initialSelectedCity && citiesArray.some(c => c.city === initialSelectedCity)) {
          // Small delay to ensure mapCenter useMemo has the latest filteredLocations
          setTimeout(() => {
            setRecenterToken(prev => prev + 1);
          }, 100);
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
    // Navigate to HomePage with the selected location and return state
    navigate('/', {
      state: {
        selectedLocation: {
          id: place.id,
          name: place.name,
          category: place.category,
          coordinates: place.coordinates,
          address: place.address,
          city: place.city,
          google_place_id: (place as any).google_place_id
        },
        returnTo: `/user-places/${userId}`,
        returnToState: {
          from: `/user-places/${userId}`,
          scrollY: window.scrollY,
          userPlacesUserId: userId,
          filterCategory: filterCategory,
          selectedCity: selectedCity
        }
      }
    });
  };

  const handleCityClick = (city: string) => {
    setSelectedCity(city);
    // Trigger map recenter when city is selected
    setRecenterToken(prev => prev + 1);
  };

  const handleBack = () => {
    const isOwnProfile = currentUser?.id === userId;
    if (isOwnProfile) {
      navigate('/profile', { replace: true });
    } else {
      navigate(`/profile/${userId}`, { replace: true });
    }
  };

  // Show empty state if no locations for this filter
  if (hasInitialized && locations.length === 0) {
    return (
      <div className="flex flex-col h-screen bg-background">
        {/* Header */}
        <div 
          className="bg-background/80 backdrop-blur-md z-50"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => {
              const isOwnProfile = currentUser?.id === userId;
              if (isOwnProfile) {
                navigate('/profile', { replace: true });
              } else {
                navigate(`/profile/${userId}`, { replace: true });
              }
            }} className="p-2 -m-2 hover:opacity-70 transition-opacity">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold">
                {getPageTitle()}
              </h1>
              {filterCategoryIcons[filterCategory] && (
                <img 
                  src={filterCategoryIcons[filterCategory]} 
                  alt="" 
                  className="w-6 h-6"
                />
              )}
            </div>
            <div className="w-10" />
          </div>
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
    <SwipeBackWrapper onBack={handleBack}>
    <div className="fixed inset-0">
      {/* Map taking full screen - extends behind header with no top offset */}
      <div className="absolute top-0 left-0 right-0 bottom-0 z-0">
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
            recenterToken={recenterToken}
            hideSharingControls={true}
          />
        </MapFilterProvider>
      </div>

      {/* Blurred header overlay with gradient fade at bottom */}
      <div className="absolute top-0 left-0 right-0 z-[1000] pointer-events-auto">
        <div 
          className="backdrop-blur-[6px]"
          style={{
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)',
            background: 'linear-gradient(to bottom, hsl(var(--background) / 0.35) 0%, hsl(var(--background) / 0.15) 70%, transparent 100%)'
          }}
        >
          <div className="flex items-center justify-between px-4 py-2">
            <button onClick={handleBack} className="p-2 -m-2 hover:opacity-70 transition-opacity">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold">
                {getPageTitle()}
              </h1>
              {filterCategoryIcons[filterCategory] && (
                <img 
                  src={filterCategoryIcons[filterCategory]} 
                  alt="" 
                  className="w-6 h-6"
                />
              )}
            </div>
            <div className="w-10" />
          </div>
        </div>
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
    </SwipeBackWrapper>
  );
};

export default UserPlacesPage;
