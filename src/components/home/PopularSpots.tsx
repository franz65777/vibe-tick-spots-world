import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Users, ChevronDown, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { cn } from '@/lib/utils';
import fireIcon from '@/assets/fire-icon-3d.png';
import trendingIcon from '@/assets/trending-icon.png';
import discountIcon from '@/assets/discount-icon.png';
import eventIcon from '@/assets/event-icon.png';
import promotionIcon from '@/assets/filter-promotion.png';
import newIcon from '@/assets/new-icon.png';
import cityIcon from '@/assets/city-icon.png';
import tinderIcon from '@/assets/tinder-icon.png';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type FilterType = 'most_saved' | 'discount' | 'event' | 'promotion' | 'new';

interface PopularSpot {
  id: string;
  name: string;
  category: string;
  city: string;
  address?: string;
  google_place_id?: string;
  savesCount: number;
  coverImage?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  campaign?: {
    id: string;
    type: string;
    registrationsCount: number;
    userRegistered?: boolean;
  };
}

interface CitySpot {
  city: string;
  locationCount: number;
  coordinates: {
    lat: number;
    lng: number;
  };
}

interface PopularSpotsProps {
  currentCity?: string;
  onLocationClick?: (coords: { lat: number; lng: number }) => void;
  onSwipeDiscoveryOpen?: () => void;
  onSpotSelect?: (spot: PopularSpot) => void;
}

const PopularSpots = ({ currentCity, onLocationClick, onSwipeDiscoveryOpen, onSpotSelect }: PopularSpotsProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [popularSpots, setPopularSpots] = useState<PopularSpot[]>([]);
  const [citySpots, setCitySpots] = useState<CitySpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<FilterType>('most_saved');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPopularSpots();
  }, [currentCity, filterType]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchPopularSpots = async () => {
    if (!currentCity || currentCity === 'Unknown City') {
      setPopularSpots([]);
      setCitySpots([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const normalizedCity = currentCity.trim().toLowerCase();

      // For non-trending filters, first check if there are locations in current city
      if (filterType !== 'most_saved') {
        const campaignTypeMap = {
          'discount': 'discount',
          'event': 'event',
          'promotion': 'promo',
          'new': 'new_opening'
        };

        // Get all active campaigns of this type
        const { data: campaignsData } = await supabase
          .from('marketing_campaigns')
          .select('location_id, campaign_type')
          .eq('campaign_type', campaignTypeMap[filterType])
          .eq('is_active', true)
          .gte('end_date', new Date().toISOString());

        const campaignLocationIds = campaignsData?.map(c => c.location_id) || [];

        if (campaignLocationIds.length === 0) {
          setCitySpots([]);
          setPopularSpots([]);
          setLoading(false);
          return;
        }

        // Get locations with these campaigns in the current city first
        const { data: currentCityLocations } = await supabase
          .from('locations')
          .select('id, name, category, city, address, google_place_id, latitude, longitude')
          .in('id', campaignLocationIds)
          .or(`city.ilike.%${normalizedCity}%,address.ilike.%${normalizedCity}%`);

        // If there are locations in the current city, show them as location cards
        if (currentCityLocations && currentCityLocations.length > 0) {
          const locationSpots: PopularSpot[] = currentCityLocations.map(location => ({
            id: location.id,
            name: location.name,
            category: location.category,
            city: location.city || 'Unknown',
            address: location.address,
            google_place_id: location.google_place_id,
            savesCount: 0,
            coordinates: {
              lat: parseFloat(location.latitude?.toString() || '0'),
              lng: parseFloat(location.longitude?.toString() || '0')
            }
          }));

          setPopularSpots(locationSpots);
          setCitySpots([]);
          setLoading(false);
          return;
        }

        // If no locations in current city, show city cards from other cities
        const { data: locationsData } = await supabase
          .from('locations')
          .select('city, latitude, longitude')
          .in('id', campaignLocationIds);

        // Group by city and count
        const cityMap = new Map<string, { count: number; lat: number; lng: number }>();
        locationsData?.forEach(location => {
          if (!location.city) return;
          const city = location.city.trim();
          const locationCity = city.toLowerCase();
          
          // Skip the current city
          if (locationCity.includes(normalizedCity) || normalizedCity.includes(locationCity)) {
            return;
          }

          const existing = cityMap.get(city);
          if (existing) {
            cityMap.set(city, { ...existing, count: existing.count + 1 });
          } else {
            cityMap.set(city, {
              count: 1,
              lat: parseFloat(location.latitude?.toString() || '0'),
              lng: parseFloat(location.longitude?.toString() || '0')
            });
          }
        });

        const cities = Array.from(cityMap.entries())
          .map(([city, data]) => ({
            city,
            locationCount: data.count,
            coordinates: { lat: data.lat, lng: data.lng }
          }))
          .sort((a, b) => b.locationCount - a.locationCount)
          .slice(0, 10);

        setCitySpots(cities);
        setPopularSpots([]);
      } else {
        // Original logic for trending filter
        const locationsQuery = supabase
          .from('locations')
          .select('id, name, category, city, address, google_place_id, latitude, longitude')
          .or(`city.ilike.%${normalizedCity}%,address.ilike.%${normalizedCity}%`)
          .limit(200);

        const locationsResult = await locationsQuery;
        if (locationsResult.error) throw locationsResult.error;

        const locationsData = locationsResult.data || [];
        const locationIds = locationsData.map(l => l.id);

        // Get saves count for locations
        const { data: savesData } = await supabase
          .from('user_saved_locations')
          .select('location_id')
          .in('location_id', locationIds);

        const savesMap = new Map<string, number>();
        savesData?.forEach(save => {
          savesMap.set(save.location_id, (savesMap.get(save.location_id) || 0) + 1);
        });

        // Get Google saves
        const { data: googleSavesData } = await supabase
          .from('saved_places')
          .select('place_id')
          .ilike('city', `%${normalizedCity}%`);

        const googleSavesMap = new Map<string, number>();
        googleSavesData?.forEach(save => {
          googleSavesMap.set(save.place_id, (googleSavesMap.get(save.place_id) || 0) + 1);
        });

        // Process and filter locations
        const locationMap = new Map<string, PopularSpot>();

        locationsData?.forEach((location) => {
          const locationCity = location.city?.trim().toLowerCase();
          
          if (!locationCity || (!locationCity.includes(normalizedCity) && !normalizedCity.includes(locationCity))) {
            return;
          }

          const key = location.google_place_id || location.id;
          const savesCount = (savesMap.get(location.id) || 0) + (location.google_place_id ? (googleSavesMap.get(location.google_place_id) || 0) : 0);
          
          if (savesCount > 0) {
            if (!locationMap.has(key) || (locationMap.get(key)?.savesCount || 0) < savesCount) {
              locationMap.set(key, {
                id: location.id,
                name: location.name,
                category: location.category,
                city: location.city || 'Unknown',
                address: location.address,
                google_place_id: location.google_place_id,
                savesCount,
                coordinates: {
                  lat: parseFloat(location.latitude?.toString() || '0'),
                  lng: parseFloat(location.longitude?.toString() || '0')
                }
              });
            }
          }
        });

        const topSpots = Array.from(locationMap.values())
          .sort((a, b) => b.savesCount - a.savesCount)
          .slice(0, 10);

        setPopularSpots(topSpots);
        setCitySpots([]);
      }
    } catch (error) {
      console.error('Error fetching popular spots:', error);
      setPopularSpots([]);
      setCitySpots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSpotClick = (spot: PopularSpot) => {
    onLocationClick?.(spot.coordinates);
    onSpotSelect?.(spot);
  };

  const handleCityClick = (city: CitySpot) => {
    onLocationClick?.(city.coordinates);
  };

  const getFilterIcon = () => {
    switch (filterType) {
      case 'discount': return <img src={discountIcon} alt="Discount" className="w-full h-full object-contain" />;
      case 'event': return <img src={eventIcon} alt="Event" className="w-full h-full object-contain" />;
      case 'promotion': return <img src={promotionIcon} alt="Promotion" className="w-full h-full object-contain" />;
      case 'new': return <img src={newIcon} alt="New" className="w-full h-full object-contain" />;
      default: return <img src={trendingIcon} alt="Trending" className="w-full h-full object-contain" />;
    }
  };

  const getFilterLabel = () => {
    switch (filterType) {
      case 'discount': return t('filters.discount', { ns: 'home' });
      case 'event': return t('filters.event', { ns: 'home' });
      case 'promotion': return t('filters.promotion', { ns: 'home' });
      case 'new': return t('filters.new', { ns: 'home' });
      default: return t('filters.trending', { ns: 'home' });
    }
  };

  const filterOptions = [
    { value: 'most_saved' as FilterType, label: t('filters.trending', { ns: 'home' }), icon: trendingIcon },
    { value: 'discount' as FilterType, label: t('filters.discount', { ns: 'home' }), icon: discountIcon },
    { value: 'event' as FilterType, label: t('filters.event', { ns: 'home' }), icon: eventIcon },
    { value: 'promotion' as FilterType, label: t('filters.promotion', { ns: 'home' }), icon: promotionIcon },
    { value: 'new' as FilterType, label: t('filters.new', { ns: 'home' }), icon: newIcon },
  ];

  useEffect(() => {
    if (dropdownOpen) {
      window.dispatchEvent(new CustomEvent('filter-dropdown-open'));
    } else {
      window.dispatchEvent(new CustomEvent('filter-dropdown-close'));
    }
  }, [dropdownOpen]);

  const showingCities = filterType !== 'most_saved';
  const hasResults = showingCities ? citySpots.length > 0 : popularSpots.length > 0;

  return (
    <div className="h-full px-[10px] pt-0 pb-1 bg-background/50">
      {/* Header + dropdown trigger */}
      <div className="relative mb-1" ref={dropdownRef}>
        {!loading && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDropdownOpen((open) => !open)}
                className="relative flex items-center justify-center rounded-lg overflow-hidden bg-gray-200/40 dark:bg-slate-800/65 backdrop-blur-md hover:bg-muted/20 transition-all"
                aria-label={t('filters.openFilter', { ns: 'home', defaultValue: 'Open trending filters' })}
              >
                <div className="absolute inset-0 rounded-lg border-[1.5px] border-transparent [background:linear-gradient(135deg,hsl(var(--primary)/0.6),hsl(var(--primary)/0.2))_border-box] [background-clip:border-box] [-webkit-mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [-webkit-mask-composite:xor] [mask-composite:exclude] pointer-events-none"></div>
                {/* Main filter icon - specific sizes */}
                <div className={cn(
                   "flex items-center justify-center transition-all relative z-10",
                   dropdownOpen 
                     ? (filterType === 'event' ? "w-16 h-16" : filterType === 'new' ? "w-16 h-16" : "w-14 h-14")
                     : (filterType === 'event' ? "w-14 h-14" : filterType === 'new' ? "w-14 h-14" : "w-12 h-12")
                 )}>
                  {getFilterIcon()}
                </div>
              </button>
              
              {/* Show other filter icons inline when dropdown is open */}
              {dropdownOpen && (
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {filterOptions
                    .filter(opt => opt.value !== filterType)
                    .map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setFilterType(option.value);
                          setDropdownOpen(false);
                        }}
                        className="relative flex-shrink-0 flex items-center justify-center rounded-lg overflow-hidden bg-gray-200/40 dark:bg-slate-800/65 backdrop-blur-md opacity-70 hover:opacity-100 hover:bg-muted/20 transition-all"
                      >
                        <div className="absolute inset-0 rounded-lg border-[1.5px] border-transparent [background:linear-gradient(135deg,hsl(var(--primary)/0.6),hsl(var(--primary)/0.2))_border-box] [background-clip:border-box] [-webkit-mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [-webkit-mask-composite:xor] [mask-composite:exclude] pointer-events-none"></div>
                        <img 
                          src={option.icon} 
                          alt={option.label} 
                          className={cn(
                            "object-contain relative z-10",
                            option.value === 'event' ? "w-14 h-14" : option.value === 'new' ? "w-14 h-14" : "w-12 h-12"
                          )}
                        />
                      </button>
                    ))}
                </div>
              )}

              {/* Show title only when dropdown is closed */}
              {!dropdownOpen && (
                <div>
                  <h3 className="text-[13px] font-semibold text-foreground leading-tight">
                    {getFilterLabel()} {showingCities ? t('globally', { ns: 'common', defaultValue: 'Globally' }) : `${t('in', { ns: 'common' })} ${currentCity}`}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {hasResults 
                      ? showingCities 
                        ? `${citySpots.length} ${t('cities', { ns: 'common', defaultValue: 'cities' })}`
                        : t('filters.placesFound', { ns: 'home', count: popularSpots.length })
                      : t('filters.noLocationsWithFilter', { ns: 'home', filter: getFilterLabel().toLowerCase(), city: currentCity })
                    }
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!dropdownOpen && hasResults && filterType !== 'most_saved' && (
                <img src={fireIcon} alt="" className="w-7 h-7 object-contain" />
              )}
              {onSwipeDiscoveryOpen && (
                <button
                  type="button"
                  onClick={onSwipeDiscoveryOpen}
                  className="relative flex items-center justify-center w-9 h-9 rounded-lg overflow-hidden bg-gray-200/40 dark:bg-slate-800/65 backdrop-blur-md hover:bg-muted/20 transition-all"
                  aria-label={t('discoverMore', { ns: 'home', defaultValue: 'Discover more' })}
                >
                  <div className="absolute inset-0 rounded-lg border-[1.5px] border-transparent [background:linear-gradient(135deg,hsl(var(--primary)/0.6),hsl(var(--primary)/0.2))_border-box] [background-clip:border-box] [-webkit-mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [-webkit-mask-composite:xor] [mask-composite:exclude] pointer-events-none"></div>
                  <img src={tinderIcon} alt="Discover" className="w-7 h-7 object-contain relative z-10" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cards section */}
      {loading ? (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex-shrink-0 w-40 h-10 rounded-lg bg-gray-200 animate-pulse" />
          ))}
        </div>
      ) : hasResults ? (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {showingCities ? (
            /* City cards */
            citySpots.map((city) => (
              <div key={city.city} className="flex-shrink-0">
                <button
                  onClick={() => handleCityClick(city)}
                  className="relative px-3 py-2 rounded-lg bg-gray-200/40 dark:bg-slate-800/65 backdrop-blur-md hover:bg-muted/20 flex items-center gap-2 transition-all hover:shadow-md overflow-hidden"
                  aria-label={`Zoom to ${city.city}`}
                >
                  <div className="absolute inset-0 rounded-lg border-[1.5px] border-transparent [background:linear-gradient(135deg,hsl(var(--primary)/0.6),hsl(var(--primary)/0.2))_border-box] [background-clip:border-box] [-webkit-mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [-webkit-mask-composite:xor] [mask-composite:exclude] pointer-events-none"></div>
                  <img src={cityIcon} alt="City" className="w-7 h-7 object-contain" />
                  <span className="text-xs font-medium text-foreground line-clamp-1 max-w-[160px]">
                    {city.city} ({city.locationCount})
                  </span>
                </button>
              </div>
            ))
          ) : (
            /* Location cards */
            popularSpots.map((spot) => (
              <div key={spot.id} className="flex-shrink-0">
                <button
                  onClick={() => handleSpotClick(spot)}
                  className="relative px-3 py-2 rounded-lg bg-gray-200/40 dark:bg-slate-800/65 backdrop-blur-md hover:bg-muted/20 flex items-center gap-2 transition-all hover:shadow-md overflow-hidden"
                  aria-label={`Zoom to ${spot.name}`}
                >
                  <div className="absolute inset-0 rounded-lg border-[1.5px] border-transparent [background:linear-gradient(135deg,hsl(var(--primary)/0.6),hsl(var(--primary)/0.2))_border-box] [background-clip:border-box] [-webkit-mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [-webkit-mask-composite:xor] [mask-composite:exclude] pointer-events-none"></div>
                  <CategoryIcon category={spot.category} className="w-5 h-5" />
                  <span className="text-xs font-medium text-foreground line-clamp-1 max-w-[160px]">
                    {spot.name}
                  </span>
                </button>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
};

export default PopularSpots;
