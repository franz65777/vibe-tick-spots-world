import { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Search, MapPin, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import MinimalLocationCard from '@/components/explore/MinimalLocationCard';
import LocationPostLibrary from '@/components/explore/LocationPostLibrary';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedLocationService } from '@/services/unifiedLocationService';
import { useTranslation } from 'react-i18next';
import { translateCityName } from '@/utils/cityTranslations';
import { useMutedLocations } from '@/hooks/useMutedLocations';

interface SavedLocationsListProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

const SavedLocationsList = ({ isOpen, onClose, userId }: SavedLocationsListProps) => {
  const { t, i18n } = useTranslation();
  const { user: currentUser } = useAuth();
  const { mutedLocations, muteLocation, unmuteLocation, isMuting } = useMutedLocations(currentUser?.id);
  const targetUserId = userId || currentUser?.id;
  const [savedPlaces, setSavedPlaces] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [selectedPlace, setSelectedPlace] = useState<any>(null);

  useEffect(() => {
    const loadSavedPlaces = async () => {
      if (!targetUserId) {
        setSavedPlaces({});
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const locations = await UnifiedLocationService.getUserSavedLocations(targetUserId, true);
        const grouped = await UnifiedLocationService.groupByCity(locations);
        setSavedPlaces(grouped);
      } catch (error) {
        console.error('Error loading saved places:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      loadSavedPlaces();
    }
  }, [targetUserId, isOpen]);

  const unsavePlace = async (placeId: string, city: string) => {
    if (!currentUser || currentUser.id !== targetUserId) return;

    try {
      await supabase.from('saved_places').delete().eq('user_id', currentUser.id).eq('place_id', placeId);

      const { data: locationData } = await supabase
        .from('locations')
        .select('id')
        .or(`google_place_id.eq.${placeId},id.eq.${placeId}`)
        .maybeSingle();

      if (locationData?.id) {
        await supabase.from('user_saved_locations').delete().eq('user_id', currentUser.id).eq('location_id', locationData.id);
      }

      UnifiedLocationService.clearCache(currentUser.id);

      setSavedPlaces((prev: any) => {
        const updated = { ...prev };
        if (updated[city]) {
          updated[city] = updated[city].filter((p: any) => p.id !== placeId);
          if (updated[city].length === 0) delete updated[city];
        }
        return updated;
      });
    } catch (error) {
      console.error('Error unsaving place:', error);
    }
  };

  const isOwnProfile = currentUser?.id === targetUserId;

  // Get all unique cities with translations
  const cities = useMemo(() => {
    return Object.keys(savedPlaces)
      .map(city => ({
        original: city,
        translated: translateCityName(city, i18n.language)
      }))
      .sort((a, b) => a.translated.localeCompare(b.translated));
  }, [savedPlaces, i18n.language]);

  // Flatten all places
  const allPlaces = useMemo(() => {
    const places = [];
    for (const [city, cityPlaces] of Object.entries(savedPlaces)) {
      places.push(...(cityPlaces as any[]).map(place => ({ ...place, city })));
    }
    return places;
  }, [savedPlaces]);

  // Filter and sort places
  const filteredAndSortedPlaces = useMemo(() => {
    let filtered = allPlaces;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(place => 
        place.name.toLowerCase().includes(query) ||
        place.category.toLowerCase().includes(query) ||
        place.city.toLowerCase().includes(query)
      );
    }

    if (selectedCity !== 'all') {
      filtered = filtered.filter(place => place.city === selectedCity);
    }

    switch (sortBy) {
      case 'recent':
        return filtered.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
      case 'name':
        return filtered.sort((a, b) => a.name.localeCompare(b.name));
      case 'city':
        return filtered.sort((a, b) => a.city.localeCompare(b.city));
      case 'category':
        return filtered.sort((a, b) => a.category.localeCompare(b.category));
      default:
        return filtered;
    }
  }, [allPlaces, searchQuery, selectedCity, sortBy]);

  const handlePlaceClick = (place: any) => {
    setSelectedPlace({
      ...place,
      id: place.id,
      google_place_id: place.google_place_id || place.id,
      name: place.name,
      address: place.address,
      category: place.category,
      city: place.city,
      types: place.types || [place.category],
      coordinates: (place.latitude != null && place.longitude != null)
        ? { lat: place.latitude, lng: place.longitude }
        : undefined
    });
  };

  const handleUnsave = async (e: React.MouseEvent, place: any) => {
    e.stopPropagation();
    try {
      await unsavePlace(place.id, place.city);
    } catch (error) {
      console.error('Failed to remove location:', error);
    }
  };

  if (!isOpen) return null;

  if (selectedPlace) {
    return (
      <LocationPostLibrary
        place={selectedPlace}
        isOpen={true}
        onClose={() => setSelectedPlace(null)}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-[9999] flex flex-col">
      <style>{`
        [class*="bottom-navigation"],
        [class*="NewBottomNavigation"],
        [class*="BusinessBottomNavigation"],
        nav[class*="fixed bottom"] {
          display: none !important;
        }
      `}</style>
      
      {/* Header */}
      <div className="bg-background border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center justify-between pl-1 pr-4 py-3 gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-base font-semibold truncate">{t('savedLocations', { ns: 'profile' })}</h1>
          </div>
          <div className="bg-primary/10 text-primary font-bold px-3 py-1.5 rounded-full text-sm flex-shrink-0">
            {allPlaces.length}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-background px-4 py-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder={t('searchPlaceholder', { ns: 'profile' })}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-full"
          />
        </div>

        <div className="flex gap-2">
          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="flex-1 bg-background rounded-full border-border">
              <SelectValue placeholder={t('allCities', { ns: 'profile' })} />
            </SelectTrigger>
            <SelectContent className="bg-background border-border z-[9999]">
              <SelectItem value="all">{t('allCities', { ns: 'profile' })}</SelectItem>
              {cities.map(city => (
                <SelectItem key={city.original} value={city.original}>
                  {city.translated} ({savedPlaces[city.original]?.length || 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="flex-1 bg-background rounded-full border-border">
              <SelectValue placeholder={t('sortBy', { ns: 'common' })} />
            </SelectTrigger>
            <SelectContent className="bg-background border-border z-[9999]">
              <SelectItem value="recent">{t('recentlySaved', { ns: 'profile' })}</SelectItem>
              <SelectItem value="name">{t('nameAZ', { ns: 'common' })}</SelectItem>
              <SelectItem value="city">{t('cityAZ', { ns: 'common' })}</SelectItem>
              <SelectItem value="category">{t('category', { ns: 'common' })}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-muted-foreground">{t('loadingSaved', { ns: 'profile' })}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && allPlaces.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-xs mx-auto px-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t('noSavedLocations', { ns: 'profile' })}</h3>
            <p className="text-muted-foreground text-sm">
              {t('startSaving', { ns: 'profile' })}
            </p>
          </div>
        </div>
      )}

      {/* No Search Results */}
      {!loading && allPlaces.length > 0 && filteredAndSortedPlaces.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-xs mx-auto px-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t('noResults', { ns: 'common' })}</h3>
            <p className="text-muted-foreground text-sm">
              {t('adjustFilters', { ns: 'common' })}
            </p>
          </div>
        </div>
      )}

      {/* Locations List - Minimal Cards - Grid */}
      {!loading && filteredAndSortedPlaces.length > 0 && (
        <div className="flex-1 overflow-y-auto bg-background">
          <div className="grid grid-cols-2 gap-3 px-4 py-3">
            {filteredAndSortedPlaces.map((p, idx) => {
              const isMuted = mutedLocations?.some((m: any) => m.location_id === p.id);
              
              return (
                <div key={`${p.city}-${p.id}-${idx}`} className="relative group">
                  <MinimalLocationCard
                    place={{
                      id: p.id,
                      name: p.name,
                      category: p.category,
                      city: p.city,
                      address: p.address,
                      google_place_id: p.google_place_id,
                      coordinates: p.coordinates,
                      savedCount: p.savedCount || 0,
                      postsCount: p.postsCount || 0
                    }}
                    onCardClick={() => handlePlaceClick(p)}
                  />
                  {isOwnProfile && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 bg-background/80 hover:bg-background"
                        onClick={(e) => handleUnsave(e, p)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedLocationsList;
