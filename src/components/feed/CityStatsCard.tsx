import { memo, useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, ChevronUp, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useGeolocation } from '@/hooks/useGeolocation';
import noUsersCharacter from '@/assets/no-users-character.png';
import { cn } from '@/lib/utils';

interface CityRanking {
  city: string;
  count: number;
  rank: number | null;
}

// Global cache (same for all users)
let globalStatsCache: { totalPlaces: number; topCities: CityRanking[]; timestamp: number } | null = null;
// User-specific cache for current city
let userCityCache: { userId: string; userCity: CityRanking | null; timestamp: number } | null = null;
const CACHE_DURATION = 60000; // 1 minute

const CityStatsCard = memo(() => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { location: geoLocation, getCityFromCoordinates } = useGeolocation();
  const [totalPlaces, setTotalPlaces] = useState(globalStatsCache?.totalPlaces || 0);
  const [topCities, setTopCities] = useState<CityRanking[]>(globalStatsCache?.topCities || []);
  const [userCity, setUserCity] = useState<CityRanking | null>(
    userCityCache?.userId === user?.id ? userCityCache.userCity : null
  );
  const [loading, setLoading] = useState(!globalStatsCache);
  const [isMinimized, setIsMinimized] = useState(false);
  const fetchingRef = useRef(false);

  useEffect(() => {
    if (!user?.id) return;

    const now = Date.now();
    const hasValidGlobalCache = globalStatsCache && now - globalStatsCache.timestamp < CACHE_DURATION;
    const hasValidUserCityCache = userCityCache && userCityCache.userId === user.id && now - userCityCache.timestamp < CACHE_DURATION;

    if (hasValidGlobalCache) {
      setTotalPlaces(globalStatsCache.totalPlaces);
      setTopCities(globalStatsCache.topCities);
      if (hasValidUserCityCache) {
        setUserCity(userCityCache.userCity);
      }
      setLoading(false);
      return;
    }

    if (fetchingRef.current) return;

    const normalizeCity = (city: string): string => {
      const aliases: Record<string, string> = {
        turin: 'Torino',
        rome: 'Roma',
        milan: 'Milano',
        florence: 'Firenze',
        venice: 'Venezia',
        naples: 'Napoli',
        genoa: 'Genova',
      };
      const key = city.toLowerCase().trim();
      return aliases[key] || city;
    };

    const fetchUserCityData = async (sortedCities: CityRanking[]) => {
      let currentCityName: string | null = geoLocation?.city || null;
      if (!currentCityName && geoLocation?.latitude && geoLocation?.longitude) {
        currentCityName = await getCityFromCoordinates(geoLocation.latitude, geoLocation.longitude);
      }
      if (!currentCityName) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('current_city')
          .eq('id', user.id)
          .single();
        currentCityName = profile?.current_city || null;
      }
      if (!currentCityName) return null;

      const normalized = normalizeCity(currentCityName);
      const match = sortedCities.find((c) => c.city.toLowerCase() === normalized.toLowerCase());
      const userCityData: CityRanking = match
        ? { city: match.city, count: match.count, rank: match.rank }
        : { city: normalized, count: 0, rank: null };
      setUserCity(userCityData);
      userCityCache = { userId: user.id, userCity: userCityData, timestamp: Date.now() };
      return userCityData;
    };

    const fetchStats = async () => {
      fetchingRef.current = true;
      try {
        // Global distinct places count
        const { data: totalData } = await supabase.rpc('get_global_distinct_places_count');
        const total = Number(totalData) || 0;
        setTotalPlaces(total);

        // Global city counts - get_global_city_counts now returns pin_count (only google_place_id places)
        const { data: citiesData } = await supabase.rpc('get_global_city_counts');
        const sortedCities: CityRanking[] = ((citiesData as any[]) || []).map((c, idx) => ({
          city: normalizeCity(c.city),
          count: Number(c.pin_count),
          rank: idx + 1,
        }));
        const top = sortedCities.slice(0, 3);
        setTopCities(top);

        globalStatsCache = { totalPlaces: total, topCities: top, timestamp: Date.now() };

        await fetchUserCityData(sortedCities);
      } catch (err) {
        console.error('Error fetching city stats:', err);
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    };

    fetchStats();

    const channel = supabase
      .channel('city-stats-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'saved_places' }, () => {
        globalStatsCache = null;
        fetchStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_saved_locations' }, () => {
        globalStatsCache = null;
        fetchStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, () => {
        globalStatsCache = null;
        fetchStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, geoLocation?.city, geoLocation?.latitude, geoLocation?.longitude]);

  // Show cached data immediately, never show skeleton if we have cache
  if (loading && !globalStatsCache) {
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
            <img src={noUsersCharacter} alt="" className="w-8 h-8 object-contain" />
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
          <img src={noUsersCharacter} alt="" className="w-14 h-14 object-contain" />
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
        {topCities.map((city) => {
          const isCurrentCity = userCity && city.city.toLowerCase() === userCity.city.toLowerCase();
          return (
            <div key={city.city} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className={cn("w-4 text-center font-bold", isCurrentCity ? "text-primary" : "text-muted-foreground")}>#{city.rank}</span>
                <span className={cn("font-medium uppercase tracking-wide text-xs", isCurrentCity ? "text-primary underline decoration-2 underline-offset-2" : "text-foreground")}>{city.city}</span>
              </div>
              <span className={cn("font-bold", isCurrentCity ? "text-primary" : "text-foreground")}>{city.count.toLocaleString()}</span>
            </div>
          );
        })}

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
