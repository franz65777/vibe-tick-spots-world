import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, Navigation2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PhotonResult } from '@/lib/photonGeocoding';
import { useTranslation } from 'react-i18next';
import { useGeolocation } from '@/hooks/useGeolocation';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

import trendingIcon from '@/assets/trending-icon.png';
import discountIcon from '@/assets/discount-icon.png';
import eventIcon from '@/assets/event-icon.png';
import promotionIcon from '@/assets/filter-promotion.png';
import newIcon from '@/assets/new-icon.png';

type FilterType = 'most_saved' | 'discount' | 'event' | 'promotion' | 'new';

interface PopularSpot {
  id: string;
  name: string;
  category: string;
  city: string;
  address?: string;
  google_place_id?: string;
  savesCount: number;
  coordinates: {
    lat: number;
    lng: number;
  };
}

interface SearchDrawerProps {
  searchQuery: string;
  currentCity: string;
  onSearchChange: (value: string) => void;
  onCitySelect: (city: string, coords?: { lat: number; lng: number }) => void;
  onLocationSelect?: (location: PhotonResult) => void;
  onFocusOpen?: () => void;
  isCenteredOnUser?: boolean;
  onCenterStatusChange?: (isCentered: boolean) => void;
  onSpotSelect?: (spot: PopularSpot) => void;
  isExpanded?: boolean;
  onDrawerStateChange?: (isOpen: boolean) => void;
}

const spotsCache = new Map<string, { spots: PopularSpot[]; timestamp: number }>();
const SPOTS_CACHE_DURATION = 5 * 60 * 1000;
const SPOTS_CACHE_VERSION = 2;

const SearchDrawer: React.FC<SearchDrawerProps> = ({
  searchQuery,
  currentCity,
  onSearchChange,
  onCitySelect,
  onLocationSelect,
  onFocusOpen,
  isCenteredOnUser = false,
  onCenterStatusChange,
  onSpotSelect,
  isExpanded = false,
  onDrawerStateChange,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { location, loading: geoLoading, getCurrentLocation } = useGeolocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [dragProgress, setDragProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartProgress = useRef(0);
  const velocityRef = useRef(0);
  const lastYRef = useRef(0);
  const lastTimeRef = useRef(0);
  
  const [filterType, setFilterType] = useState<FilterType>('most_saved');
  const [popularSpots, setPopularSpots] = useState<PopularSpot[]>([]);
  const [loadingSpots, setLoadingSpots] = useState(false);
  
  const processedLocationRef = useRef<string>('');

  useEffect(() => {
    onDrawerStateChange?.(isDrawerOpen);
  }, [isDrawerOpen, onDrawerStateChange]);

  useEffect(() => {
    if (!location || !location.city || location.city === 'Unknown City') return;
    
    const locationKey = `${location.latitude}-${location.longitude}-${location.city}`;
    if (processedLocationRef.current === locationKey) return;
    
    processedLocationRef.current = locationKey;
    onCitySelect(location.city, { lat: location.latitude, lng: location.longitude });
  }, [location?.latitude, location?.longitude, location?.city]);

  useEffect(() => {
    if (isDrawerOpen) {
      fetchPopularSpots();
    }
  }, [isDrawerOpen, filterType, currentCity]);

  const fetchPopularSpots = async () => {
    if (!currentCity || currentCity === 'Unknown City') {
      setPopularSpots([]);
      return;
    }

    const cacheKey = `${SPOTS_CACHE_VERSION}-${currentCity}-${filterType}`;
    const cached = spotsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < SPOTS_CACHE_DURATION)) {
      setPopularSpots(cached.spots);
      return;
    }

    try {
      setLoadingSpots(true);
      const normalizedCity = currentCity.trim().toLowerCase();

      if (filterType === 'most_saved') {
        const { data: locationsData } = await supabase
          .from('locations')
          .select('id, name, category, city, address, google_place_id, latitude, longitude')
          .or(`city.ilike.%${normalizedCity}%,address.ilike.%${normalizedCity}%`)
          .limit(200);

        const locationIds = locationsData?.map(l => l.id) || [];

        const { data: savesData } = locationIds.length > 0
          ? await supabase.from('user_saved_locations').select('location_id').in('location_id', locationIds)
          : { data: [] };

        const savesMap = new Map<string, number>();
        savesData?.forEach(save => {
          savesMap.set(save.location_id, (savesMap.get(save.location_id) || 0) + 1);
        });

        const spots: PopularSpot[] = (locationsData || [])
          .map(location => ({
            id: location.id,
            name: location.name,
            category: location.category,
            city: location.city || 'Unknown',
            address: location.address,
            google_place_id: location.google_place_id,
            savesCount: savesMap.get(location.id) || 0,
            coordinates: {
              lat: parseFloat(location.latitude?.toString() || '0'),
              lng: parseFloat(location.longitude?.toString() || '0'),
            },
          }))
          .filter(s => s.savesCount > 0)
          .sort((a, b) => b.savesCount - a.savesCount)
          .slice(0, 10);

        setPopularSpots(spots);
        spotsCache.set(cacheKey, { spots, timestamp: Date.now() });
      } else {
        const campaignTypeMap: Record<string, string> = {
          'discount': 'discount',
          'event': 'event',
          'promotion': 'promo',
          'new': 'new_opening',
        };

        const { data: campaignsData } = await supabase
          .from('marketing_campaigns')
          .select('location_id')
          .eq('campaign_type', campaignTypeMap[filterType])
          .eq('is_active', true)
          .gte('end_date', new Date().toISOString());

        const campaignLocationIds = campaignsData?.map(c => c.location_id) || [];
        
        if (campaignLocationIds.length === 0) {
          setPopularSpots([]);
          setLoadingSpots(false);
          return;
        }

        const { data: locationsData } = await supabase
          .from('locations')
          .select('id, name, category, city, address, google_place_id, latitude, longitude')
          .in('id', campaignLocationIds)
          .or(`city.ilike.%${normalizedCity}%,address.ilike.%${normalizedCity}%`);

        const spots: PopularSpot[] = (locationsData || []).map(location => ({
          id: location.id,
          name: location.name,
          category: location.category,
          city: location.city || 'Unknown',
          address: location.address,
          google_place_id: location.google_place_id,
          savesCount: 0,
          coordinates: {
            lat: parseFloat(location.latitude?.toString() || '0'),
            lng: parseFloat(location.longitude?.toString() || '0'),
          },
        }));

        setPopularSpots(spots);
        spotsCache.set(cacheKey, { spots, timestamp: Date.now() });
      }
    } catch (error) {
      console.error('Error fetching popular spots:', error);
      setPopularSpots([]);
    } finally {
      setLoadingSpots(false);
    }
  };

  const handleCurrentLocation = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (location && location.city && location.city !== 'Unknown City') {
      onCitySelect(location.city, { lat: location.latitude, lng: location.longitude });
      onSearchChange(location.city);
      onCenterStatusChange?.(true);
    }
    getCurrentLocation();
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    
    setIsDragging(true);
    dragStartY.current = e.touches[0].clientY;
    dragStartProgress.current = dragProgress;
    velocityRef.current = 0;
    lastYRef.current = e.touches[0].clientY;
    lastTimeRef.current = Date.now();
  }, [dragProgress]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const currentY = e.touches[0].clientY;
    const currentTime = Date.now();
    const deltaTime = currentTime - lastTimeRef.current;
    
    if (deltaTime > 0) {
      velocityRef.current = (lastYRef.current - currentY) / deltaTime;
    }
    lastYRef.current = currentY;
    lastTimeRef.current = currentTime;
    
    const deltaY = dragStartY.current - currentY;
    const maxDrag = 280;
    
    const dragDelta = deltaY / maxDrag;
    let newProgress = dragStartProgress.current + dragDelta;
    
    if (newProgress < 0) {
      newProgress = newProgress * 0.3;
    } else if (newProgress > 1) {
      newProgress = 1 + (newProgress - 1) * 0.3;
    }
    
    setDragProgress(Math.max(-0.1, Math.min(1.1, newProgress)));
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const velocityThreshold = 0.3;
    const openThreshold = 0.3;
    
    let shouldOpen: boolean;
    
    if (Math.abs(velocityRef.current) > velocityThreshold) {
      shouldOpen = velocityRef.current > 0;
    } else {
      shouldOpen = dragProgress > openThreshold;
    }
    
    setDragProgress(shouldOpen ? 1 : 0);
    setIsDrawerOpen(shouldOpen);
  }, [isDragging, dragProgress]);

  useEffect(() => {
    if (!isDragging) {
      setDragProgress(isDrawerOpen ? 1 : 0);
    }
  }, [isDrawerOpen, isDragging]);

  const getFilterLabel = (type: FilterType) => {
    switch (type) {
      case 'discount': return t('filters.discount', { ns: 'home' });
      case 'event': return t('filters.event', { ns: 'home' });
      case 'promotion': return t('filters.promotion', { ns: 'home' });
      case 'new': return t('filters.new', { ns: 'home' });
      default: return t('filters.trending', { ns: 'home' });
    }
  };

  const filterOptions: { value: FilterType; icon: string }[] = [
    { value: 'most_saved', icon: trendingIcon },
    { value: 'discount', icon: discountIcon },
    { value: 'event', icon: eventIcon },
    { value: 'promotion', icon: promotionIcon },
    { value: 'new', icon: newIcon },
  ];

  const handleSpotClick = (spot: PopularSpot) => {
    onCitySelect(spot.city, spot.coordinates);
    onSpotSelect?.(spot);
    setIsDrawerOpen(false);
    setDragProgress(0);
  };

  const trendingHeight = Math.max(0, dragProgress) * 280;
  const trendingOpacity = Math.max(0, Math.min(1, dragProgress * 1.5));

  return (
    <div
      ref={drawerRef}
      className={cn(
        "left-3 z-[1000] flex flex-col",
        isExpanded ? 'fixed' : 'absolute'
      )}
      style={{
        bottom: isExpanded 
          ? 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' 
          : 'calc(5.25rem + env(safe-area-inset-bottom, 0px))',
        right: isDrawerOpen || dragProgress > 0.1 ? '0.75rem' : '3.25rem',
        transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Search bar with integrated drag handle */}
      <div className="w-full relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-xl border border-border/30 rounded-full overflow-hidden">
        {/* Drag handle inside at top center */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-muted-foreground/40 rounded-full z-10" />
        
        <div className="relative pt-3">
          {isLoading || geoLoading ? (
            <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground animate-spin" />
          ) : null}
          <input
            ref={inputRef}
            type="text"
            placeholder={t('searchCities', { ns: 'home' })}
            value={(() => {
              if (!searchQuery && currentCity) return `📌  ${currentCity}`;
              if (searchQuery && currentCity && searchQuery === currentCity) return `📌  ${searchQuery}`;
              return searchQuery;
            })()}
            onChange={(e) => onSearchChange(e.target.value.replace(/^📌\s*/, ''))}
            onFocus={() => onFocusOpen?.()}
            className="w-full h-10 pl-4 pr-12 bg-transparent focus:outline-none transition-all placeholder:text-muted-foreground text-sm font-medium text-foreground"
          />
          <button
            onClick={handleCurrentLocation}
            disabled={geoLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-accent/50 rounded-full transition-colors disabled:opacity-50"
            aria-label={t('currentLocation', { ns: 'common' })}
          >
            <Navigation2 className={cn("w-5 h-5 transition-colors rotate-45", isCenteredOnUser ? "text-primary fill-primary" : "text-primary")} />
          </button>
        </div>
      </div>

      {/* Trending section - slides up */}
      <div 
        className="w-full overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-xl border border-border/30 mt-2"
        style={{
          height: trendingHeight,
          opacity: trendingOpacity,
          transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          display: dragProgress > 0 ? 'block' : 'none',
        }}
      >
        <div className="px-3 pt-3 pb-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilterType(option.value)}
                className={cn(
                  "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                  filterType === option.value
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                <img src={option.icon} alt="" className="w-4 h-4 object-contain" />
                <span>{getFilterLabel(option.value)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="px-3 pb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground">
              {getFilterLabel(filterType)} {currentCity ? `in ${currentCity}` : ''}
            </h3>
            {popularSpots.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {popularSpots.length} {t('places', { ns: 'common', defaultValue: 'places' })}
              </span>
            )}
          </div>

          {loadingSpots ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : popularSpots.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {popularSpots.map((spot) => (
                <button
                  key={spot.id}
                  onClick={() => handleSpotClick(spot)}
                  className="flex-shrink-0 flex flex-col items-center gap-1 p-2 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors min-w-[80px] max-w-[80px]"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <CategoryIcon category={spot.category} className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-medium text-foreground text-center line-clamp-2 leading-tight">
                    {spot.name}
                  </span>
                  {spot.savesCount > 0 && (
                    <span className="text-[9px] text-muted-foreground">
                      {spot.savesCount} saves
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">
              {t('filters.noLocationsWithFilter', {
                ns: 'home',
                filter: getFilterLabel(filterType).toLowerCase(),
                city: currentCity,
                defaultValue: `No ${getFilterLabel(filterType).toLowerCase()} in ${currentCity}`
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchDrawer;