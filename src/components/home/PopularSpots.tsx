import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { cn } from '@/lib/utils';
import trendingIcon from '@/assets/trending-icon.png';
import discountIcon from '@/assets/discount-icon.png';
import eventIcon from '@/assets/event-icon.png';
import promotionIcon from '@/assets/filter-promotion.png';
import newIcon from '@/assets/new-icon.png';
import cityIcon from '@/assets/city-icon-new.png';
import { useTranslation } from 'react-i18next';

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
  onCitySelect?: (city: string) => void;
}

// Cache for popular spots to avoid redundant queries
const spotsCache = new Map<string, { spots: PopularSpot[]; cities: CitySpot[]; timestamp: number }>();
const SPOTS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
// Bump this when fetch logic changes to avoid serving stale cached results
const SPOTS_CACHE_VERSION = 2;

const PopularSpots = ({ currentCity, onLocationClick, onSwipeDiscoveryOpen, onSpotSelect, onCitySelect }: PopularSpotsProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [popularSpots, setPopularSpots] = useState<PopularSpot[]>([]);
  const [citySpots, setCitySpots] = useState<CitySpot[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>('most_saved');

  useEffect(() => {
    fetchPopularSpots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCity, filterType]);

  const getFilterLabel = (ft: FilterType) => {
    switch (ft) {
      case 'discount':
        return t('filters.discount', { ns: 'home' });
      case 'event':
        return t('filters.event', { ns: 'home' });
      case 'promotion':
        return t('filters.promotion', { ns: 'home' });
      case 'new':
        return t('filters.new', { ns: 'home' });
      default:
        return t('filters.trending', { ns: 'home' });
    }
  };

  const filterOptions: Array<{ value: FilterType; label: string; icon: string }> = [
    { value: 'most_saved', label: getFilterLabel('most_saved'), icon: trendingIcon },
    { value: 'discount', label: getFilterLabel('discount'), icon: discountIcon },
    { value: 'event', label: getFilterLabel('event'), icon: eventIcon },
    { value: 'promotion', label: getFilterLabel('promotion'), icon: promotionIcon },
    { value: 'new', label: getFilterLabel('new'), icon: newIcon },
  ];

  const fetchPopularSpots = async () => {
    if (!currentCity || currentCity === 'Unknown City') {
      setPopularSpots([]);
      setCitySpots([]);
      setLoading(false);
      return;
    }

    const cacheKey = `${SPOTS_CACHE_VERSION}-${currentCity}-${filterType}`;
    const cached = spotsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < SPOTS_CACHE_DURATION) {
      setPopularSpots(cached.spots);
      setCitySpots(cached.cities);
      return;
    }

    try {
      setLoading(true);
      const normalizedCity = currentCity.trim().toLowerCase();

      // For non-trending filters, first check if there are locations in current city
      if (filterType !== 'most_saved') {
        const campaignTypeMap: Record<Exclude<FilterType, 'most_saved'>, string> = {
          discount: 'discount',
          event: 'event',
          promotion: 'promo',
          new: 'new_opening',
        };

        const { data: campaignsData } = await supabase
          .from('marketing_campaigns')
          .select('location_id, campaign_type')
          .eq('campaign_type', campaignTypeMap[filterType])
          .eq('is_active', true)
          .gte('end_date', new Date().toISOString());

        const campaignLocationIds = campaignsData?.map((c) => c.location_id) || [];
        if (campaignLocationIds.length === 0) {
          setCitySpots([]);
          setPopularSpots([]);
          setLoading(false);
          return;
        }

        const { data: currentCityLocations } = await supabase
          .from('locations')
          .select('id, name, category, city, address, google_place_id, latitude, longitude')
          .in('id', campaignLocationIds)
          .or(`city.ilike.%${normalizedCity}%,address.ilike.%${normalizedCity}%`);

        // If there are locations in the current city, show them as location cards
        if (currentCityLocations && currentCityLocations.length > 0) {
          const locationSpots: PopularSpot[] = currentCityLocations.map((location) => ({
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

          setPopularSpots(locationSpots);
          setCitySpots([]);
          spotsCache.set(cacheKey, { spots: locationSpots, cities: [], timestamp: Date.now() });
          setLoading(false);
          return;
        }

        // If no locations in current city, show city cards from other cities
        const { data: locationsData } = await supabase
          .from('locations')
          .select('city, latitude, longitude')
          .in('id', campaignLocationIds);

        const cityMap = new Map<string, { count: number; lat: number; lng: number }>();
        locationsData?.forEach((location) => {
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
              lng: parseFloat(location.longitude?.toString() || '0'),
            });
          }
        });

        const cities = Array.from(cityMap.entries())
          .map(([city, data]) => ({
            city,
            locationCount: data.count,
            coordinates: { lat: data.lat, lng: data.lng },
          }))
          .sort((a, b) => b.locationCount - a.locationCount)
          .slice(0, 10);

        setCitySpots(cities);
        setPopularSpots([]);
        spotsCache.set(cacheKey, { spots: [], cities, timestamp: Date.now() });
      } else {
        // Trending filter: include both locations table AND saved_places (Google)
        const locationsResult = await supabase
          .from('locations')
          .select('id, name, category, city, address, google_place_id, latitude, longitude')
          .or(`city.ilike.%${normalizedCity}%,address.ilike.%${normalizedCity}%`)
          .limit(200);

        if (locationsResult.error) throw locationsResult.error;

        const locationsData = locationsResult.data || [];
        const locationIds = locationsData.map((l) => l.id);

        const { data: savesData } =
          locationIds.length > 0
            ? await supabase.from('user_saved_locations').select('location_id').in('location_id', locationIds)
            : { data: [] };

        const savesMap = new Map<string, number>();
        savesData?.forEach((save) => {
          savesMap.set(save.location_id, (savesMap.get(save.location_id) || 0) + 1);
        });

        const { data: googleSavesData } = await supabase
          .from('saved_places')
          .select('place_id, place_name, place_category, city, coordinates')
          .ilike('city', `%${normalizedCity}%`);

        const googleSavesMap = new Map<string, number>();
        const googlePlacesMap = new Map<string, any>();
        googleSavesData?.forEach((save) => {
          googleSavesMap.set(save.place_id, (googleSavesMap.get(save.place_id) || 0) + 1);
          if (!googlePlacesMap.has(save.place_id)) googlePlacesMap.set(save.place_id, save);
        });

        const googlePlaceIdsInLocations = new Set(
          locationsData.filter((l) => l.google_place_id).map((l) => l.google_place_id)
        );

        const locationMap = new Map<string, PopularSpot>();
        locationsData.forEach((location) => {
          const locationCity = location.city?.trim().toLowerCase();
          if (!locationCity || (!locationCity.includes(normalizedCity) && !normalizedCity.includes(locationCity))) {
            return;
          }

          const key = location.google_place_id || location.id;
          const savesCount =
            (savesMap.get(location.id) || 0) + (location.google_place_id ? googleSavesMap.get(location.google_place_id) || 0 : 0);

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
                  lng: parseFloat(location.longitude?.toString() || '0'),
                },
              });
            }
          }
        });

        googlePlacesMap.forEach((sp, placeId) => {
          if (googlePlaceIdsInLocations.has(placeId)) return;

          const coords = sp.coordinates as any;
          const lat = Number(coords?.lat);
          const lng = Number(coords?.lng);
          if (!lat || !lng) return;

          const savesCount = googleSavesMap.get(placeId) || 0;
          if (savesCount > 0) {
            locationMap.set(placeId, {
              id: placeId,
              name: sp.place_name || 'Unknown',
              category: sp.place_category || 'place',
              city: sp.city || 'Unknown',
              address: undefined,
              google_place_id: placeId,
              savesCount,
              coordinates: { lat, lng },
            });
          }
        });

        const topSpots = Array.from(locationMap.values())
          .sort((a, b) => b.savesCount - a.savesCount)
          .slice(0, 10);

        setPopularSpots(topSpots);
        setCitySpots([]);
        spotsCache.set(cacheKey, { spots: topSpots, cities: [], timestamp: Date.now() });
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
    onCitySelect?.(city.city);
  };

  // Show cities only when there are city cards AND no location cards
  const showingCities = citySpots.length > 0 && popularSpots.length === 0;
  const hasResults = popularSpots.length > 0 || citySpots.length > 0;

  const sectionTitle = `${getFilterLabel(filterType)} ${t('in', { ns: 'common' })} ${currentCity}`;

  return (
    <section className="h-full px-4 pb-2">
      {/* Filter pills */}
      <div className="-mx-4 px-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 py-2 w-max">
          {filterOptions.map((opt) => {
            const active = opt.value === filterType;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFilterType(opt.value)}
                className={cn(
                  'inline-flex items-center gap-2 h-10 px-4 rounded-full border transition-colors select-none',
                  active
                    ? 'bg-primary text-primary-foreground border-primary/40'
                    : 'bg-secondary text-secondary-foreground border-border hover:bg-accent'
                )}
                aria-pressed={active}
                aria-label={opt.label}
              >
                <span className="w-5 h-5 shrink-0">
                  <img src={opt.icon} alt={opt.label} className="w-5 h-5 object-contain" loading="lazy" />
                </span>
                <span className="text-sm font-medium whitespace-nowrap">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Title */}
      <h2 className="mt-3 text-xl font-semibold text-foreground">{sectionTitle}</h2>

      {/* Content */}
      {loading ? (
        <div className="mt-4 flex gap-3 overflow-x-auto scrollbar-hide">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-shrink-0 w-40 h-28 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : !hasResults ? (
        <div className="mt-6 text-sm text-muted-foreground">{t('filters.noLocationsWithFilter', { ns: 'home', filter: getFilterLabel(filterType).toLowerCase(), city: currentCity })}</div>
      ) : (
        <div className="mt-4 -mx-4 px-4 overflow-x-auto scrollbar-hide">
          <div className="flex gap-3 w-max pb-2">
            {showingCities
              ? citySpots.map((city) => (
                  <button
                    key={city.city}
                    type="button"
                    onClick={() => handleCityClick(city)}
                    className="w-40 rounded-2xl border border-border bg-card hover:bg-accent transition-colors p-4 text-left"
                    aria-label={`Apri ${city.city}`}
                  >
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                      <img src={cityIcon} alt="Città" className="w-7 h-7 object-contain" loading="lazy" />
                    </div>
                    <div className="mt-3 font-semibold text-foreground line-clamp-1">{city.city}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{city.locationCount} luoghi</div>
                  </button>
                ))
              : popularSpots.map((spot) => (
                  <button
                    key={spot.id}
                    type="button"
                    onClick={() => handleSpotClick(spot)}
                    className="w-40 rounded-2xl border border-border bg-card hover:bg-accent transition-colors p-4 text-left"
                    aria-label={`Apri ${spot.name}`}
                  >
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                      <CategoryIcon category={spot.category} className="w-8 h-8" />
                    </div>
                    <div className="mt-3 font-semibold text-foreground line-clamp-1">{spot.name}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {typeof spot.savesCount === 'number' && spot.savesCount > 0 ? `${spot.savesCount} saves` : ''}
                    </div>
                  </button>
                ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default PopularSpots;
