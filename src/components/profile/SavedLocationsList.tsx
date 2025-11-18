import { useState, useMemo, useEffect, useRef } from 'react';
import { ArrowLeft, Search, X, Bookmark, ChevronDown } from 'lucide-react';
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
import { AllowedCategory, allowedCategories, categoryDisplayNames } from '@/utils/allowedCategories';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import SavedFoldersDrawer from './SavedFoldersDrawer';
import { useNavigate } from 'react-router-dom';

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
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [selectedSaveTag, setSelectedSaveTag] = useState('all');
  const [selectedCategories, setSelectedCategories] = useState<AllowedCategory[]>([]);
  const [isFoldersDrawerOpen, setIsFoldersDrawerOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const isDragging = useRef(false);
  const lastScrollY = useRef(0);
  const cityDropdownRef = useRef<HTMLDivElement | null>(null);
  const saveTagDropdownRef = useRef<HTMLDivElement | null>(null);
  const [selectedSaveTags, setSelectedSaveTags] = useState<string[]>([]);
  const [isSaveTagDropdownOpen, setIsSaveTagDropdownOpen] = useState(false);

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

  // Scroll handling for filter visibility
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const handleScroll = () => {
      const currentScrollY = content.scrollTop;
      
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        // Scrolling down
        setShowFilters(false);
      } else if (currentScrollY < lastScrollY.current) {
        // Scrolling up
        setShowFilters(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    content.addEventListener('scroll', handleScroll, { passive: true });
    return () => content.removeEventListener('scroll', handleScroll);
  }, []);

  // Swipe gesture handling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Touch events for mobile
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      isDragging.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      touchCurrentX.current = e.touches[0].clientX;
      const diff = touchStartX.current - touchCurrentX.current;
      
      // Swipe from anywhere on screen if moving horizontally
      if (Math.abs(diff) > 80) {
        setIsFoldersDrawerOpen(true);
        isDragging.current = false;
      }
    };

    const handleTouchEnd = () => {
      isDragging.current = false;
      touchStartX.current = 0;
      touchCurrentX.current = 0;
    };

    // Mouse events for desktop
    const handleMouseDown = (e: MouseEvent) => {
      touchStartX.current = e.clientX;
      isDragging.current = true;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      touchCurrentX.current = e.clientX;
      const diff = touchStartX.current - touchCurrentX.current;
      
      // Swipe from anywhere on screen if moving horizontally
      if (Math.abs(diff) > 80) {
        setIsFoldersDrawerOpen(true);
        isDragging.current = false;
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      touchStartX.current = 0;
      touchCurrentX.current = 0;
    };
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Close city and save-tag dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (cityDropdownRef.current && !cityDropdownRef.current.contains(target)) {
        setIsCityDropdownOpen(false);
      }
      if (saveTagDropdownRef.current && !saveTagDropdownRef.current.contains(target)) {
        setIsSaveTagDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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
      
      const matchesCity = selectedCities.length === 0 || (place.city && selectedCities.includes(place.city));
      
      const matchesSaveTag = selectedSaveTags.length === 0 || (place.saveTag && selectedSaveTags.includes(place.saveTag));
      
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(place.category as AllowedCategory);
      
      const isMuted = isOwnProfile && mutedLocations.includes(place.id);
      
      return matchesSearch && matchesCity && matchesSaveTag && matchesCategory && !isMuted;
    });

    places.sort((a, b) => {
      return new Date(b.saved_at || b.savedAt || 0).getTime() - new Date(a.saved_at || a.savedAt || 0).getTime();
    });

    return places;
  }, [allPlaces, searchQuery, selectedCities, selectedSaveTags, selectedCategories, isOwnProfile, mutedLocations]);

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
    <>
      <SavedFoldersDrawer 
        isOpen={isFoldersDrawerOpen}
        onClose={() => setIsFoldersDrawerOpen(false)}
        savedLocations={allPlaces}
      />
      
      <div ref={containerRef} className="fixed inset-0 bg-background z-[9999] flex flex-col">
        
        <style>{`
          [class*="bottom-navigation"],
          [class*="NewBottomNavigation"],
          [class*="BusinessBottomNavigation"],
          nav[class*="fixed bottom"] {
            display: none !important;
          }
        `}</style>
      
      {/* Header */}
      <div className="bg-background sticky top-0 z-40 mt-2.5">
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
            {filteredAndSortedPlaces.length}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className={`bg-background px-4 pb-2 space-y-3 transition-all duration-300 ${showFilters ? 'opacity-100 max-h-[500px]' : 'opacity-0 max-h-0 overflow-hidden'}`}>
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
          {/* City multi-select dropdown */}
          <div ref={cityDropdownRef} className="relative flex-1 min-w-[120px]">
            <button
              type="button"
              onClick={() => setIsCityDropdownOpen((prev) => !prev)}
              className="w-full flex items-center justify-between bg-background rounded-full border border-border px-3 py-2 text-sm"
            >
              <span className="truncate">
                {selectedCities.length === 0
                  ? t('allCities', { ns: 'profile' })
                  : selectedCities.length === 1
                    ? (() => {
                        const city = cities.find(c => c.original === selectedCities[0]);
                        if (!city) return t('allCities', { ns: 'profile' });
                        return `${city.translated} (${savedPlaces[city.original]?.length || 0})`;
                      })()
                    : t('citiesSelected', {
                        ns: 'profile',
                        defaultValue: '{{count}} città selezionate',
                        count: selectedCities.length,
                      })}
              </span>
              <ChevronDown className="w-4 h-4 text-muted-foreground ml-2 flex-shrink-0" />
            </button>

            {isCityDropdownOpen && (
              <div className="absolute left-0 right-0 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-border bg-background shadow-lg z-[10000]">
                <button
                  type="button"
                  onClick={() => setSelectedCities([])}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent/60"
                >
                  <span>{t('allCities', { ns: 'profile' })}</span>
                  {selectedCities.length === 0 && (
                    <span className="text-xs font-medium text-primary">✓</span>
                  )}
                </button>
                {cities.map(city => {
                  const isSelected = selectedCities.includes(city.original);
                  return (
                    <button
                      type="button"
                      key={city.original}
                      onClick={() =>
                        setSelectedCities((prev) =>
                          prev.includes(city.original)
                            ? prev.filter((c) => c !== city.original)
                            : [...prev, city.original]
                        )
                      }
                      className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent/60"
                    >
                      <span className="truncate">
                        {city.translated} ({savedPlaces[city.original]?.length || 0})
                      </span>
                      <span
                        className={`ml-2 h-4 w-4 rounded-full border flex items-center justify-center text-[10px] ${
                          isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                        }`}
                      >
                        {isSelected && '✓'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Save tag multi-select dropdown */}
          <div ref={saveTagDropdownRef} className="relative flex-1 min-w-[140px]">
            <button
              type="button"
              onClick={() => setIsSaveTagDropdownOpen((prev) => !prev)}
              className="w-full flex items-center justify-between bg-background rounded-full border border-border px-3 py-2 text-sm"
            >
              <span className="truncate">
                {selectedSaveTags.length === 0
                  ? t('all', { ns: 'common', defaultValue: 'All' })
                  : selectedSaveTags.length === 1
                    ? (() => {
                        const option = SAVE_TAG_OPTIONS.find(opt => opt.value === selectedSaveTags[0]);
                        if (!option) return t('all', { ns: 'common', defaultValue: 'All' });
                        const labelParts = option.labelKey.split('.');
                        const translationKey = labelParts[labelParts.length - 1];
                        if (option.value === 'general') {
                          return (
                            <div className="flex items-center gap-2">
                              <Bookmark className="w-4 h-4" />
                              {t(translationKey, { ns: 'save_tags', defaultValue: translationKey })}
                            </div>
                          );
                        }
                        return `${option.emoji} ${t(translationKey, { ns: 'save_tags', defaultValue: translationKey })}`;
                      })()
                    : t('categoriesSelected', {
                        ns: 'profile',
                        defaultValue: '{{count}} tipi selezionati',
                        count: selectedSaveTags.length,
                      })}
              </span>
              <ChevronDown className="w-4 h-4 text-muted-foreground ml-2 flex-shrink-0" />
            </button>

            {isSaveTagDropdownOpen && (
              <div className="absolute left-0 right-0 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-border bg-background shadow-lg z-[10000]">
                <button
                  type="button"
                  onClick={() => setSelectedSaveTags([])}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent/60"
                >
                  <span>{t('all', { ns: 'common', defaultValue: 'All' })}</span>
                  {selectedSaveTags.length === 0 && (
                    <span className="text-xs font-medium text-primary">✓</span>
                  )}
                </button>
                {SAVE_TAG_OPTIONS.map((option) => {
                  const isSelected = selectedSaveTags.includes(option.value);
                  const labelParts = option.labelKey.split('.');
                  const translationKey = labelParts[labelParts.length - 1];
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setSelectedSaveTags((prev) =>
                          prev.includes(option.value)
                            ? prev.filter((v) => v !== option.value)
                            : [...prev, option.value]
                        )
                      }
                      className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent/60"
                    >
                      <div className="flex items-center gap-2">
                        {option.value === 'general' ? (
                          <>
                            <Bookmark className="w-4 h-4" />
                            {t(translationKey, { ns: 'save_tags', defaultValue: translationKey })}
                          </>
                        ) : (
                          <>
                            <span>{option.emoji}</span>
                            {t(translationKey, { ns: 'save_tags', defaultValue: translationKey })}
                          </>
                        )}
                      </div>
                      <span
                        className={`ml-2 h-4 w-4 rounded-full border flex items-center justify-center text-[10px] ${
                          isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                        }`}
                      >
                        {isSelected && '✓'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Category multi-select dropdown */}
        <div className="relative w-full">
          <button
            type="button"
            onClick={() => setIsCategoryDropdownOpen((prev) => !prev)}
            className="w-full flex items-center justify-between bg-background rounded-full border border-border px-3 py-2 text-sm"
          >
            <span className="truncate">
              {selectedCategories.length === 0
                ? t('allCategories', {
                    ns: 'profile',
                    defaultValue: 'Tutte le categorie',
                  })
                : selectedCategories.length === 1
                  ? categoryDisplayNames[selectedCategories[0]]
                  : t('categoriesSelected', {
                      ns: 'profile',
                      defaultValue: '{{count}} categorie selezionate',
                      count: selectedCategories.length,
                    })}
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground ml-2 flex-shrink-0" />
          </button>

          {isCategoryDropdownOpen && (
            <div className="absolute left-0 right-0 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-border bg-background shadow-lg z-[10000]">
              <button
                type="button"
                onClick={() => setSelectedCategories([])}
                className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent/60"
              >
                <span>
                  {t('allCategories', {
                    ns: 'profile',
                    defaultValue: 'Tutte le categorie',
                  })}
                </span>
                {selectedCategories.length === 0 && (
                  <span className="text-xs font-medium text-primary">✓</span>
                )}
              </button>

              {allowedCategories.map((category) => {
                const isSelected = selectedCategories.includes(category);
                return (
                  <button
                    type="button"
                    key={category}
                    onClick={() =>
                      setSelectedCategories((prev) =>
                        prev.includes(category)
                          ? prev.filter((c) => c !== category)
                          : [...prev, category]
                      )
                    }
                    className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent/60"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="shrink-0 rounded-md bg-muted p-1.5">
                        <CategoryIcon category={category} className="w-5 h-5" />
                      </div>
                      <span className="truncate">{categoryDisplayNames[category]}</span>
                    </div>
                    <span
                      className={`ml-2 h-4 w-4 rounded-full border flex items-center justify-center text-[10px] ${
                        isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                      }`}
                    >
                      {isSelected && '✓'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">{t('loading', { ns: 'common' })}...</div>
          </div>
        ) : filteredAndSortedPlaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="text-center text-muted-foreground">
              {searchQuery || selectedCities.length > 0 || selectedSaveTag !== 'all' || selectedCategories.length > 0 ? (
                <>
                  <p className="text-lg font-medium mb-1">
                    {t('noMatchingSavedLocations', { 
                      ns: 'profile', 
                      defaultValue: i18n.language.startsWith('it')
                        ? 'Nessuna posizione salvata trovata'
                        : 'No matching saved locations'
                    })}
                  </p>
                  <p className="text-sm">
                    {t('tryDifferentFilters', { 
                      ns: 'profile', 
                      defaultValue: i18n.language.startsWith('it')
                        ? 'Prova a modificare i filtri'
                        : 'Try different filters'
                    })}
                  </p>
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
          <div className="px-4 pb-4">
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
    </>
  );
};

export default SavedLocationsList;
