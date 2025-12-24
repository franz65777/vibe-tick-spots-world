import { memo, useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, ChevronUp, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useGeolocation } from '@/hooks/useGeolocation';
import globeAnimation from '@/assets/globe-animation.gif';

interface CityRanking {
  city: string;
  count: number;
  rank: number | null;
}

// Simple in-memory cache for city stats
const statsCache = {
  data: null as { totalPlaces: number; topCities: CityRanking[]; userCity: CityRanking | null; timestamp: number } | null,
  userId: null as string | null,
};
const CACHE_DURATION = 60000; // 1 minute cache

const CityStatsCard = memo(() => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { location: geoLocation, getCityFromCoordinates } = useGeolocation();
  const [totalPlaces, setTotalPlaces] = useState(statsCache.data?.totalPlaces || 0);
  const [topCities, setTopCities] = useState<CityRanking[]>(statsCache.data?.topCities || []);
  const [userCity, setUserCity] = useState<CityRanking | null>(statsCache.data?.userCity || null);
  const [loading, setLoading] = useState(!statsCache.data || statsCache.userId !== user?.id);
  const [isMinimized, setIsMinimized] = useState(false);
  const fetchingRef = useRef(false);

  useEffect(() => {
    if (!user?.id) return;
    
    // Check if we have valid cached data
    const now = Date.now();
    if (
      statsCache.data && 
      statsCache.userId === user.id && 
      now - statsCache.data.timestamp < CACHE_DURATION
    ) {
      setTotalPlaces(statsCache.data.totalPlaces);
      setTopCities(statsCache.data.topCities);
      setUserCity(statsCache.data.userCity);
      setLoading(false);
      return;
    }
    
    // Prevent duplicate fetches
    if (fetchingRef.current) return;
    
    const fetchStats = async () => {
      fetchingRef.current = true;
      try {
        // Get city rankings from BOTH sources, counting DISTINCT places
        const [citiesFromSavedPlacesRes, citiesFromInternalRes] = await Promise.all([
          supabase
            .from('saved_places')
            .select('city, place_id')
            .not('city', 'is', null),
          supabase
            .from('user_saved_locations')
            .select('location_id, locations(city, google_place_id)')
            .not('locations.city', 'is', null),
        ]);

        // Normalize city names (handle aliases like Torino/Turin)
        const normalizeCity = (city: string): string => {
          const cityAliases: Record<string, string> = {
            'turin': 'Torino',
            'rome': 'Roma',
            'milan': 'Milano',
            'florence': 'Firenze',
            'venice': 'Venezia',
            'naples': 'Napoli',
            'genoa': 'Genova',
          };
          const lowerCity = city.toLowerCase().trim();
          return cityAliases[lowerCity] || city;
        };

        // Count DISTINCT places per city (not total saves)
        const cityPlaceMap: Record<string, Set<string>> = {};
        
        // From saved_places - use place_id as unique identifier
        (citiesFromSavedPlacesRes.data || []).forEach((r: any) => {
          if (r.city && r.place_id) {
            const city = normalizeCity(r.city);
            if (!cityPlaceMap[city]) cityPlaceMap[city] = new Set();
            cityPlaceMap[city].add(r.place_id);
          }
        });
        
        // From user_saved_locations - use google_place_id or location_id as unique identifier
        (citiesFromInternalRes.data || []).forEach((r: any) => {
          const city = r.locations?.city ? normalizeCity(r.locations.city) : null;
          const uniqueId = r.locations?.google_place_id || r.location_id;
          if (city && uniqueId) {
            if (!cityPlaceMap[city]) cityPlaceMap[city] = new Set();
            cityPlaceMap[city].add(uniqueId);
          }
        });

        // Calculate total distinct places
        const allPlaces = new Set<string>();
        Object.values(cityPlaceMap).forEach(places => {
          places.forEach(p => allPlaces.add(p));
        });
        const total = allPlaces.size;
        setTotalPlaces(total);

        // Convert to count per city (distinct places)
        const cityCountMap: Record<string, number> = {};
        Object.entries(cityPlaceMap).forEach(([city, places]) => {
          cityCountMap[city] = places.size;
        });

        // Sort and rank all cities
        const sortedCities = Object.entries(cityCountMap)
          .sort(([, a], [, b]) => b - a)
          .map(([city, count], idx) => ({
            city,
            count,
            rank: idx + 1
          }));

        const top = sortedCities.slice(0, 3);
        setTopCities(top);

        // Get user's current city from geolocation or profile
        let currentCityName: string | null = null;
        
        // First try geolocation
        if (geoLocation?.city) {
          currentCityName = geoLocation.city;
        } else if (geoLocation?.latitude && geoLocation?.longitude) {
          currentCityName = await getCityFromCoordinates(geoLocation.latitude, geoLocation.longitude);
        }
        
        // Fallback to profile
        if (!currentCityName) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('current_city')
            .eq('id', user.id)
            .single();
          currentCityName = profile?.current_city || null;
        }

        let userCityData: CityRanking | null = null;
        if (currentCityName) {
          const normalizedCityName = normalizeCity(currentCityName);
          const userCityCount = cityCountMap[normalizedCityName] || 0;
          const userCityRank =
            sortedCities.findIndex((c) => c.city.toLowerCase() === normalizedCityName.toLowerCase()) + 1;

          userCityData = {
            city: normalizedCityName,
            count: userCityCount,
            rank: userCityRank > 0 ? userCityRank : null,
          };
          setUserCity(userCityData);
        }
        
        // Update cache
        statsCache.data = {
          totalPlaces: total,
          topCities: top,
          userCity: userCityData,
          timestamp: Date.now()
        };
        statsCache.userId = user.id;
      } catch (err) {
        console.error('Error fetching city stats:', err);
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    };

    fetchStats();

    // Subscribe to realtime changes for live updates
    const channel = supabase
      .channel('city-stats-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'saved_places' },
        () => {
          statsCache.data = null;
          fetchStats();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_saved_locations' },
        () => {
          statsCache.data = null;
          fetchStats();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'locations' },
        () => {
          // Covers cases where a new location is created/updated with a city
          statsCache.data = null;
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, geoLocation?.city, geoLocation?.latitude, geoLocation?.longitude]);

  // Show cached data immediately, never show skeleton if we have cache
  if (loading && !statsCache.data) {
    return (
      <div className="mx-4 mb-4 rounded-2xl bg-white/60 dark:bg-white/10 backdrop-blur-lg border border-white/40 dark:border-white/20 p-4 animate-pulse shadow-lg shadow-black/5 dark:shadow-black/20">
        <div className="h-24 bg-muted/30 rounded-xl" />
      </div>
    );
  }

  // Minimized view - very compact
  if (isMinimized) {
    return (
      <div className="mx-4 mb-4 rounded-2xl bg-white/60 dark:bg-white/10 backdrop-blur-lg border border-white/40 dark:border-white/20 px-4 py-3 shadow-lg shadow-black/5 dark:shadow-black/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={globeAnimation} alt="" className="w-8 h-8 object-contain" />
            <h3 className="text-base font-bold text-foreground">
              {t('discoverPlaces', { defaultValue: 'discover places' })}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{totalPlaces.toLocaleString()} {t('places', { defaultValue: 'places' })}</span>
            <button
              onClick={() => setIsMinimized(false)}
              className="w-7 h-7 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
            >
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 mb-4 rounded-2xl bg-white/60 dark:bg-white/10 backdrop-blur-lg border border-white/40 dark:border-white/20 p-5 shadow-lg shadow-black/5 dark:shadow-black/20">
      {/* Header with title and minimize button + GIF */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-foreground mb-1">
            {userCity ? t('yourCityGrowing', { defaultValue: 'your city is growing!' }) : t('discoverPlaces', { defaultValue: 'discover places' })}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('curatedByFriends', { defaultValue: 'every place is saved by your network of friends with only authentic recommendations.' })}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="w-7 h-7 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          </button>
          <img src={globeAnimation} alt="" className="w-14 h-14 object-contain" />
        </div>
      </div>

      {/* Stats table */}
      <div className="space-y-2 mb-4">
        {/* Total places */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="font-medium text-muted-foreground uppercase tracking-wide text-xs">{t('totalPlaces', { defaultValue: 'TOTAL PLACES' })}</span>
          </div>
          <span className="font-bold text-foreground">{totalPlaces.toLocaleString()}</span>
        </div>

        {/* Top cities */}
        {topCities.map((city) => (
          <div key={city.city} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="w-4 text-center font-bold text-muted-foreground">#{city.rank}</span>
              <span className="font-medium text-foreground uppercase tracking-wide text-xs">{city.city}</span>
            </div>
            <span className="font-bold text-foreground">{city.count.toLocaleString()}</span>
          </div>
        ))}

        {/* User's city - always show if available, highlighted */}
        {userCity && !topCities.some(c => c.city.toLowerCase() === userCity.city.toLowerCase()) && (
          <div className="flex items-center justify-between text-sm pt-1 border-t border-border/50">
            <div className="flex items-center gap-2">
              <span className="w-4 text-center font-bold text-primary">{userCity.rank ? `#${userCity.rank}` : '--'}</span>
              <span className="font-medium text-primary uppercase tracking-wide text-xs">{userCity.city}</span>
            </div>
            <span className="font-bold text-primary">{userCity.count.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* CTA Button */}
      <button 
        className="w-full py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
        onClick={() => navigate('/')}
      >
        {t('saveMore', { defaultValue: 'save more' })}
      </button>
    </div>
  );
});

CityStatsCard.displayName = 'CityStatsCard';

export default CityStatsCard;
