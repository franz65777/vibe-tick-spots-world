import { useState, useMemo, useEffect, useRef } from 'react';
import { ArrowLeft, Search, X, Bookmark } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import CityLabel from '@/components/common/CityLabel';
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
import SavedFoldersDrawer from './SavedFoldersDrawer';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { getRatingColor, getRatingFillColor } from '@/utils/ratingColors';
import { getCategoryIcon } from '@/utils/categoryIcons';
import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';

interface SavedLocationsListProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  initialFolderId?: string | null;
}

const SavedLocationsList = ({ isOpen, onClose, userId, initialFolderId }: SavedLocationsListProps) => {
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
  const [isFoldersDrawerOpen, setIsFoldersDrawerOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFolderName, setSelectedFolderName] = useState<string>('');
  const [folderLocationIds, setFolderLocationIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [locationStats, setLocationStats] = useState<Map<string, { averageRating: number | null }>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const isDragging = useRef(false);
  const lastScrollY = useRef(0);

  // Handle initial folder ID from navigation
  useEffect(() => {
    if (isOpen && initialFolderId && initialFolderId !== null) {
      setSelectedFolderId(initialFolderId);
      loadFolderLocations(initialFolderId);
    }
  }, [isOpen, initialFolderId]);

  const loadFolderLocations = async (folderId: string) => {
    try {
      // Get folder details
      const { data: folderData, error: folderError } = await supabase
        .from('saved_folders')
        .select('name')
        .eq('id', folderId)
        .single();

      if (folderError) throw folderError;
      setSelectedFolderName(folderData?.name || '');

      // Get location IDs in this folder
      const { data: folderLocs, error: locsError } = await supabase
        .from('folder_locations')
        .select('location_id')
        .eq('folder_id', folderId);

      if (locsError) throw locsError;
      setFolderLocationIds(folderLocs?.map(fl => fl.location_id) || []);
    } catch (error) {
      console.error('Error loading folder locations:', error);
      toast.error(t('errorLoadingFolder', { ns: 'profile', defaultValue: 'Error loading folder' }));
    }
  };

  const handleFolderSelect = (folderId: string) => {
    setSelectedFolderId(folderId);
    loadFolderLocations(folderId);
    setIsFoldersDrawerOpen(false);
  };

  const handleClearFolderFilter = () => {
    setSelectedFolderId(null);
    setSelectedFolderName('');
    setFolderLocationIds([]);
  };

  // Open folders drawer automatically if initialFolderId is provided
  useEffect(() => {
    if (isOpen && initialFolderId) {
      setIsFoldersDrawerOpen(true);
    }
  }, [isOpen, initialFolderId]);

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

        // Load ratings for all locations in batch using internal location ids
        if (locations && locations.length > 0) {
          const stats = await fetchLocationStatsBatch(locations as any[]);
          setLocationStats(stats);
        } else {
          setLocationStats(new Map());
        }
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

  const fetchLocationStatsBatch = async (locations: any[]) => {
    const statsMap = new Map<string, { averageRating: number | null }>();

    if (!locations || locations.length === 0) {
      return statsMap;
    }
    
    try {
      const internalIdsSet = new Set<string>();
      const googleIdsSet = new Set<string>();
      const idToPlaceKeys = new Map<string, string[]>();
      const gpToPlaceKeys = new Map<string, string[]>();

      locations.forEach((loc: any) => {
        const placeKey = loc.id as string;
        const internalId = loc.location_id as string | undefined;
        const googlePlaceId = loc.google_place_id as string | undefined;

        if (internalId) {
          internalIdsSet.add(internalId);
          if (!idToPlaceKeys.has(internalId)) {
            idToPlaceKeys.set(internalId, []);
          }
          idToPlaceKeys.get(internalId)!.push(placeKey);
        }

        if (!internalId && googlePlaceId) {
          googleIdsSet.add(googlePlaceId);
          if (!gpToPlaceKeys.has(googlePlaceId)) {
            gpToPlaceKeys.set(googlePlaceId, []);
          }
          gpToPlaceKeys.get(googlePlaceId)!.push(placeKey);
        }
      });

      // Resolve additional internal location IDs from google_place_id values
      if (googleIdsSet.size > 0) {
        const { data: relatedLocations } = await supabase
          .from('locations')
          .select('id, google_place_id')
          .in('google_place_id', Array.from(googleIdsSet));

        relatedLocations?.forEach((loc: any) => {
          const internalId = loc.id as string;
          const gpId = loc.google_place_id as string | null;
          if (!internalId || !gpId) return;

          internalIdsSet.add(internalId);

          const placeKeys = gpToPlaceKeys.get(gpId) || [];
          if (!idToPlaceKeys.has(internalId)) {
            idToPlaceKeys.set(internalId, []);
          }
          idToPlaceKeys.get(internalId)!.push(...placeKeys);
        });
      }

      const internalIds = Array.from(internalIdsSet);
      if (internalIds.length === 0) {
        // No internal IDs mapped, so there can't be ratings in our DB
        locations.forEach((loc: any) => {
          statsMap.set(loc.id, { averageRating: null });
        });
        return statsMap;
      }

      // Fetch all ratings from interactions for all internal locations at once
      const { data: interactionsData } = await supabase
        .from('interactions')
        .select('location_id, weight')
        .in('location_id', internalIds)
        .eq('action_type', 'review')
        .not('weight', 'is', null);

      // Fetch all ratings from posts for all internal locations at once
      const { data: postsData } = await supabase
        .from('posts')
        .select('location_id, rating')
        .in('location_id', internalIds)
        .not('rating', 'is', null)
        .gt('rating', 0);

      // Group ratings by internal location_id
      const ratingsByLocation = new Map<string, number[]>();

      interactionsData?.forEach((item: any) => {
        const locId = item.location_id as string | null;
        const rating = Number(item.weight);
        if (!locId || rating <= 0) return;
        if (!ratingsByLocation.has(locId)) {
          ratingsByLocation.set(locId, []);
        }
        ratingsByLocation.get(locId)!.push(rating);
      });

      postsData?.forEach((item: any) => {
        const locId = item.location_id as string | null;
        const rating = Number(item.rating);
        if (!locId || rating <= 0) return;
        if (!ratingsByLocation.has(locId)) {
          ratingsByLocation.set(locId, []);
        }
        ratingsByLocation.get(locId)!.push(rating);
      });

      // Aggregate ratings by displayed place (UnifiedLocation id)
      const ratingsByPlaceKey = new Map<string, number[]>();

      ratingsByLocation.forEach((ratings, locId) => {
        const placeKeys = idToPlaceKeys.get(locId) || [];
        placeKeys.forEach((placeKey) => {
          if (!ratingsByPlaceKey.has(placeKey)) {
            ratingsByPlaceKey.set(placeKey, []);
          }
          ratingsByPlaceKey.get(placeKey)!.push(...ratings);
        });
      });

      ratingsByPlaceKey.forEach((ratings, placeKey) => {
        if (ratings.length === 0) {
          statsMap.set(placeKey, { averageRating: null });
          return;
        }
        const avg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
        statsMap.set(placeKey, { averageRating: Math.round(avg * 10) / 10 });
      });

      // Ensure all locations have an entry (null when no ratings)
      locations.forEach((loc: any) => {
        if (!statsMap.has(loc.id)) {
          statsMap.set(loc.id, { averageRating: null });
        }
      });
    } catch (error) {
      console.error('Error fetching location stats:', error);
    }

    return statsMap;
  };

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
      const diff = touchCurrentX.current - touchStartX.current;
      
      // Swipe from anywhere on screen if moving right
      if (diff > 80) {
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
      const diff = touchCurrentX.current - touchStartX.current;
      
      // Swipe from anywhere on screen if moving right
      if (diff > 80) {
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
      // If a folder is selected, only show locations in that folder
      if (selectedFolderId && folderLocationIds.length > 0) {
        if (!folderLocationIds.includes(place.id)) {
          return false;
        }
      }

      const matchesSearch = !searchQuery || 
        place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.city?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCity = selectedCity === 'all' || place.city === selectedCity;
      
      const matchesSaveTag = selectedSaveTag === 'all' || place.saveTag === selectedSaveTag;
      
      const matchesCategory = !selectedCategory || place.category === selectedCategory;
      
      const isMuted = isOwnProfile && mutedLocations.includes(place.id);
      
      return matchesSearch && matchesCity && matchesSaveTag && matchesCategory && !isMuted;
    });

    places.sort((a, b) => {
      return new Date(b.saved_at || b.savedAt || 0).getTime() - new Date(a.saved_at || a.savedAt || 0).getTime();
    });

    return places;
  }, [allPlaces, searchQuery, selectedCity, selectedSaveTag, selectedCategory, isOwnProfile, mutedLocations, selectedFolderId, folderLocationIds]);

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
        onFolderSelect={handleFolderSelect}
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
            <h1 className="text-base font-semibold truncate">
              {selectedFolderId && selectedFolderName ? selectedFolderName : t('savedLocations', { ns: 'profile' })}
            </h1>
            {selectedFolderId && (
              <button
                onClick={handleClearFolderFilter}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
                title={t('showAll', { ns: 'common', defaultValue: 'Show all' })}
              >
                <X className="w-4 h-4" />
              </button>
            )}
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
                  : (() => {
                      const option = SAVE_TAG_OPTIONS.find(opt => opt.value === selectedSaveTag);
                      if (!option) return t('all', { ns: 'common', defaultValue: 'All' });
                      const labelParts = option.labelKey.split('.');
                      const translationKey = labelParts[labelParts.length - 1];
                      if (option.value === 'general') {
                        return <div className="flex items-center gap-2"><Bookmark className="w-4 h-4" /> {t(translationKey, { ns: 'save_tags', defaultValue: translationKey })}</div>;
                      }
                      return `${option.emoji} ${t(translationKey, { ns: 'save_tags', defaultValue: translationKey })}`;
                    })()
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-background border-border z-[9999]">
              <SelectItem value="all">{t('all', { ns: 'common', defaultValue: 'All' })}</SelectItem>
              {SAVE_TAG_OPTIONS.map((option) => {
                const labelParts = option.labelKey.split('.');
                const translationKey = labelParts[labelParts.length - 1];
                return (
                  <SelectItem key={option.value} value={option.value}>
                    {option.value === 'general' ? (
                      <div className="flex items-center gap-2">
                        <Bookmark className="w-4 h-4" />
                        {t(translationKey, { ns: 'save_tags', defaultValue: translationKey })}
                      </div>
                    ) : (
                      <>
                        {option.emoji} {t(translationKey, { ns: 'save_tags', defaultValue: translationKey })}
                      </>
                    )}
                  </SelectItem>
                );
              })}
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
      <div ref={contentRef} className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">{t('loading', { ns: 'common' })}...</div>
          </div>
        ) : filteredAndSortedPlaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="text-center text-muted-foreground">
              {searchQuery || selectedCity !== 'all' || selectedSaveTag !== 'all' || selectedCategory ? (
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
                const stats = locationStats.get(p.id) || { averageRating: null };
                const saveTagOption = SAVE_TAG_OPTIONS.find(opt => opt.value === p.save_tag);
                
                return (
                  <div key={p.id} className="relative group">
                    <div className="rounded-2xl shadow-sm border border-border hover:shadow-md transition-all duration-200 bg-card dark:bg-muted/30 dark:border-border/60 dark:backdrop-blur-sm">
                      <div className="p-3 cursor-pointer" onClick={() => handlePlaceClick(p)}>
                        <div className="flex items-center gap-3">
                          <div className="shrink-0 bg-muted rounded-xl p-1.5">
                            <CategoryIcon category={p.category} className="w-8 h-8" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-bold text-foreground text-sm truncate text-left">
                                {p.name}
                              </h3>
                              {saveTagOption && p.save_tag !== 'general' && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 shrink-0">
                                  {saveTagOption.emoji}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                              <div className="truncate">
                                <CityLabel
                                  id={p.google_place_id || p.id}
                                  city={p.city}
                                  name={p.name}
                                  address={p.address}
                                  coordinates={p.coordinates}
                                />
                              </div>
                              {stats.averageRating && (
                                <div className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-full shrink-0", getRatingFillColor(stats.averageRating) + "/10")}>
                                  {(() => {
                                    const CategoryIconComp = p.category ? getCategoryIcon(p.category) : Star;
                                    return <CategoryIconComp className={cn("w-2.5 h-2.5", getRatingFillColor(stats.averageRating), getRatingColor(stats.averageRating))} />;
                                  })()}
                                  <span className={cn("text-xs font-semibold", getRatingColor(stats.averageRating))}>{stats.averageRating.toFixed(1)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {isOwnProfile && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full bg-background/90 hover:bg-destructive hover:text-destructive-foreground"
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
