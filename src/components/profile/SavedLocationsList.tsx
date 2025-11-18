import { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import MinimalLocationCard from '@/components/explore/MinimalLocationCard';
import LocationPostLibrary from '@/components/explore/LocationPostLibrary';
import { useAuth } from '@/contexts/AuthContext';
import { UnifiedLocationService } from '@/services/unifiedLocationService';
import { useTranslation } from 'react-i18next';
import { translateCityName } from '@/utils/cityTranslations';
import { useMutedLocations } from '@/hooks/useMutedLocations';
import { SAVE_TAG_OPTIONS } from '@/utils/saveTags';
import { locationInteractionService } from '@/services/locationInteractionService';
import { toast } from 'sonner';
import SimpleCategoryFilter from '@/components/explore/SimpleCategoryFilter';
import { AllowedCategory } from '@/utils/allowedCategories';

interface SavedLocationsListProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

const SavedLocationsList = ({ isOpen, onClose, userId }: SavedLocationsListProps) => {
  const { t, i18n } = useTranslation();
  const { user: currentUser } = useAuth();
  const { mutedLocations } = useMutedLocations(currentUser?.id);
  const targetUserId = userId || currentUser?.id;
  const [savedPlaces, setSavedPlaces] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [selectedSaveTag, setSelectedSaveTag] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState<AllowedCategory | null>(null);

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
      await locationInteractionService.unsaveLocation(placeId);

      if (currentUser) {
        UnifiedLocationService.clearCache(currentUser.id);
      }

      setSavedPlaces((prev: any) => {
        const updated = { ...prev };
        if (updated[city]) {
          updated[city] = updated[city].filter((p: any) => p.id !== placeId);
          if (updated[city].length === 0) delete updated[city];
        }
        return updated;
      });

      window.dispatchEvent(new CustomEvent('location-save-changed', { 
        detail: { locationId: placeId, isSaved: false } 
      }));
    } catch (error) {
      console.error('Error unsaving place:', error);
      toast.error(t('unsave_failed', { ns: 'common', defaultValue: 'Failed to remove location' }));
    }
  };

  useEffect(() => {
    const handleSaveChanged = (event: CustomEvent) => {
      const { locationId, isSaved, saveTag } = event.detail;

      setSavedPlaces((prev: any) => {
        if (!prev || Object.keys(prev).length === 0) return prev;

        const updated: any = {};
        let changed = false;

        for (const [city, places] of Object.entries(prev)) {
          const placesArray = places as any[];
          const filteredPlaces = placesArray.filter((p: any) => p.id !== locationId);
          
          if (filteredPlaces.length !== placesArray.length) {
            changed = true;
          }
          
          if (filteredPlaces.length > 0) {
            updated[city] = filteredPlaces;
          }
        }

        return changed ? updated : prev;
      });
    };

    window.addEventListener('location-save-changed', handleSaveChanged as EventListener);
    return () => {
      window.removeEventListener('location-save-changed', handleSaveChanged as EventListener);
    };
  }, []);

  const isOwnProfile = currentUser?.id === targetUserId;

  const cities = useMemo(() => {
    return Object.keys(savedPlaces || {}).map(city => ({
      original: city,
      translated: translateCityName(city, i18n.language)
    })).sort((a, b) => a.translated.localeCompare(b.translated));
  }, [savedPlaces, i18n.language]);

  const allPlaces = useMemo(() => {
    return Object.values(savedPlaces || {}).flat() as any[];
  }, [savedPlaces]);

  const filteredAndSortedPlaces = useMemo(() => {
    let places = allPlaces.filter(place => {
      const matchesSearch = !searchQuery || 
        place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.city?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCity = selectedCity === 'all' || place.city === selectedCity;
      
      const matchesSaveTag = selectedSaveTag === 'all' || place.save_tag === selectedSaveTag;
      
      const matchesCategory = !selectedCategory || place.category === selectedCategory;
      
      const isMuted = isOwnProfile && mutedLocations.includes(place.id);
      
      return matchesSearch && matchesCity && matchesSaveTag && matchesCategory && !isMuted;
    });

    places.sort((a, b) => {
      return new Date(b.saved_at || 0).getTime() - new Date(a.saved_at || 0).getTime();
    });

    return places;
  }, [allPlaces, searchQuery, selectedCity, selectedSaveTag, selectedCategory, isOwnProfile, mutedLocations]);

  const handlePlaceClick = (place: any) => {
    setSelectedPlace({
      ...place,
      id: place.id
    });
  };

  const handleUnsave = (e: React.MouseEvent, place: any) => {
    e.stopPropagation();
    unsavePlace(place.id, place.city);
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
      <div className="bg-background sticky top-0 z-40 shadow-sm mt-2.5">
        <div className="flex items-center justify-between pl-1 pr-4 py-4 gap-2">
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
      <div className="bg-background px-4 py-2 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder={t('searchPlaceholder', { ns: 'profile' })}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-full"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="flex-1 min-w-[120px] bg-background rounded-full border-border">
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

          <Select value={selectedSaveTag} onValueChange={setSelectedSaveTag}>
            <SelectTrigger className="flex-1 min-w-[140px] bg-background rounded-full border-border">
              <SelectValue>
                {selectedSaveTag === 'all' 
                  ? t('all', { ns: 'common', defaultValue: 'All' })
                  : SAVE_TAG_OPTIONS.find(opt => opt.value === selectedSaveTag)?.emoji + ' ' + 
                    t(SAVE_TAG_OPTIONS.find(opt => opt.value === selectedSaveTag)?.labelKey || '')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-background border-border z-[9999]">
              <SelectItem value="all">{t('all', { ns: 'common', defaultValue: 'All' })}</SelectItem>
              {SAVE_TAG_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.emoji} {t(option.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category Filter Icons */}
        <SimpleCategoryFilter 
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">{t('loading', { ns: 'common' })}...</div>
          </div>
        ) : filteredAndSortedPlaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="text-center text-muted-foreground">
              {searchQuery || selectedCity !== 'all' || selectedSaveTag !== 'all' || selectedCategory ? (
                <>
                  <p className="text-lg font-medium mb-1">{t('noMatchingSavedLocations', { ns: 'profile' })}</p>
                  <p className="text-sm">{t('tryDifferentFilters', { ns: 'profile' })}</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium mb-1">{t('noSavedLocations', { ns: 'profile' })}</p>
                  <p className="text-sm">{t('startSavingPlaces', { ns: 'profile' })}</p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="px-4 pt-2 pb-4">
            <div className="grid grid-cols-2 gap-2">
              {filteredAndSortedPlaces.map((p: any) => {
                return (
                  <div key={p.id} className="relative group">
                    <MinimalLocationCard
                      place={{
                        id: p.id,
                        name: p.name,
                        category: p.category,
                        city: p.city,
                        saveTag: p.save_tag
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
    </div>
  );
};

export default SavedLocationsList;
