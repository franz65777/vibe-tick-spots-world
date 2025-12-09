import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import LeafletMapSetup from '@/components/LeafletMapSetup';
import { Place } from '@/types/place';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

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
  
  const initialFilterCategory = (location.state as any)?.filterCategory || 'all';
  const [filterCategory, setFilterCategory] = useState<string>(initialFilterCategory);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [cities, setCities] = useState<{ city: string; count: number }[]>([]);
  const [profile, setProfile] = useState<{ username: string; avatar_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

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

  // Fetch all saved locations for the user
  useEffect(() => {
    const fetchLocations = async () => {
      if (!userId) return;
      setLoading(true);
      
      try {
        const allLocations: SavedLocation[] = [];

        // Fetch from user_saved_locations
        const { data: internalLocs } = await supabase
          .from('user_saved_locations')
          .select(`
            location_id,
            save_tag,
            locations(id, name, category, city, address, latitude, longitude, image_url)
          `)
          .eq('user_id', userId);

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

        // Fetch from saved_places (Google Places)
        const { data: savedPlaces } = await supabase
          .from('saved_places')
          .select('id, place_id, place_name, place_category, city, coordinates, save_tag')
          .eq('user_id', userId);

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

        // Calculate cities
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

      } catch (err) {
        console.error('Error fetching locations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, [userId, currentUser, filterCategory]);

  // Filter locations by category and city
  const filteredLocations = useMemo(() => {
    let result = locations;

    // Filter by save_tag category
    if (filterCategory !== 'all' && filterCategory !== 'common') {
      result = result.filter(loc => loc.save_tag === filterCategory);
    }

    // Filter by city
    if (selectedCity) {
      result = result.filter(loc => loc.city === selectedCity);
    }

    return result;
  }, [locations, filterCategory, selectedCity]);

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

  // Calculate map center from locations
  const mapCenter = useMemo(() => {
    const locsWithCoords = filteredLocations.filter(l => l.coordinates);
    if (locsWithCoords.length === 0) return { lat: 53.3498, lng: -6.2603 }; // Default Dublin
    
    const avgLat = locsWithCoords.reduce((sum, l) => sum + l.coordinates!.lat, 0) / locsWithCoords.length;
    const avgLng = locsWithCoords.reduce((sum, l) => sum + l.coordinates!.lng, 0) / locsWithCoords.length;
    return { lat: avgLat, lng: avgLng };
  }, [filteredLocations]);

  const handlePinClick = (place: Place) => {
    setSelectedPlace(place);
  };

  const handleCityClick = (city: string) => {
    setSelectedCity(city);
    // Find first location in that city to center map
    const loc = filteredLocations.find(l => l.city === city && l.coordinates);
    if (loc) {
      // The map will re-center based on filtered places
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] bg-background/80 backdrop-blur-sm z-50">
        <button onClick={() => navigate(-1)} className="p-0 hover:opacity-70 transition-opacity">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold">
          {profile?.username ? `${profile.username}'s ${t('userProfile.places', { ns: 'common' })}` : t('userProfile.places', { ns: 'common' })}
        </h1>
        <div className="w-6" /> {/* Spacer for centering */}
      </div>

      {/* If no city selected - show full map with city pills */}
      {!selectedCity ? (
        <div className="flex-1 relative">
          {/* Map taking full space */}
          <div className="absolute inset-0">
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
          </div>

          {/* City pills at bottom */}
          <div className="absolute bottom-6 left-0 right-0 z-[1000] px-4">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {cities.map(({ city, count }) => (
                <button
                  key={city}
                  onClick={() => handleCityClick(city)}
                  className="flex items-center gap-1 px-4 py-2 rounded-full bg-background/90 backdrop-blur-sm border border-border shadow-lg shrink-0"
                >
                  <span className="font-medium">{city}</span>
                  <span className="text-xs text-muted-foreground">{count}</span>
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground mt-2">
              {t('userProfile.tapCityToSee', { ns: 'common' })}
            </p>
          </div>
        </div>
      ) : (
        /* City selected - 60/40 split view */
        <div className="flex-1 flex flex-col">
          {/* Back to all cities button */}
          <div className="px-4 py-2 bg-background border-b border-border">
            <button
              onClick={() => setSelectedCity(null)}
              className="flex items-center gap-2 text-sm text-primary"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('userProfile.allCities', { ns: 'common' })}
            </button>
            <h2 className="text-lg font-semibold mt-1">{selectedCity}</h2>
          </div>

          {/* Map - 60% */}
          <div className="h-[55%] relative">
            <LeafletMapSetup
              places={places}
              onPinClick={handlePinClick}
              mapCenter={mapCenter}
              selectedPlace={selectedPlace}
              onCloseSelectedPlace={() => setSelectedPlace(null)}
              onMapClick={() => setSelectedPlace(null)}
              fullScreen={false}
              preventCenterUpdate={false}
            />
          </div>

          {/* Location list - 40% */}
          <ScrollArea className="flex-1 bg-background">
            <div className="p-4 space-y-3">
              {filteredLocations.map(loc => (
                <div
                  key={loc.id}
                  className="flex gap-3 p-3 rounded-xl bg-card border border-border cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => {
                    const place = places.find(p => p.id === loc.id);
                    if (place) handlePinClick(place);
                  }}
                >
                  {/* Image or category icon */}
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {loc.image_url ? (
                      <img src={loc.image_url} alt={loc.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <CategoryIcon category={loc.category} className="w-10 h-10" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{loc.name}</h3>
                    <p className="text-sm text-muted-foreground">{loc.category}</p>
                    {loc.address && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{loc.address}</p>
                    )}
                    {loc.review && (
                      <p className="text-sm text-foreground mt-2 line-clamp-2 italic">"{loc.review}"</p>
                    )}
                  </div>
                </div>
              ))}

              {filteredLocations.length === 0 && !loading && (
                <div className="text-center py-8 text-muted-foreground">
                  {t('userProfile.noLocationsInCity', { ns: 'common' })}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default UserPlacesPage;
