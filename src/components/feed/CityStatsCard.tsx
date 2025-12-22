import { memo, useEffect, useState } from 'react';
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

const CityStatsCard = memo(() => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { location: geoLocation, getCityFromCoordinates } = useGeolocation();
  const [totalPlaces, setTotalPlaces] = useState(0);
  const [topCities, setTopCities] = useState<CityRanking[]>([]);
  const [userCity, setUserCity] = useState<CityRanking | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    
    const fetchStats = async () => {
      try {
        // Get global stats - all saved places count
        const { count: totalCount } = await supabase
          .from('saved_places')
          .select('*', { count: 'exact', head: true });
        
        setTotalPlaces(totalCount || 0);

        // Get city rankings from saved_places
        const { data: citiesData } = await supabase
          .from('saved_places')
          .select('city')
          .not('city', 'is', null);
        
        // Count per city
        const cityCountMap: Record<string, number> = {};
        citiesData?.forEach(item => {
          if (item.city) {
            cityCountMap[item.city] = (cityCountMap[item.city] || 0) + 1;
          }
        });

        // Sort and rank all cities
        const sortedCities = Object.entries(cityCountMap)
          .sort(([, a], [, b]) => b - a)
          .map(([city, count], idx) => ({
            city,
            count,
            rank: idx + 1
          }));

        setTopCities(sortedCities.slice(0, 3));

        // Get user's current city from geolocation or profile
        let currentCityName: string | null = null;
        
        // First try geolocation
        if (geoLocation?.city) {
          currentCityName = geoLocation.city;
        } else if (geoLocation?.latitude && geoLocation?.longitude) {
          // Try to get city from coordinates
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

        if (currentCityName) {
          const userCityCount = cityCountMap[currentCityName] || 0;
          const userCityRank = sortedCities.findIndex(c => c.city.toLowerCase() === currentCityName!.toLowerCase()) + 1;
          setUserCity({
            city: currentCityName,
            count: userCityCount,
            rank: userCityRank > 0 ? userCityRank : null
          });
        }
      } catch (err) {
        console.error('Error fetching city stats:', err);
      } finally {
        setLoading(false);
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
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, geoLocation?.city, geoLocation?.latitude, geoLocation?.longitude]);

  if (loading) {
    return (
      <div className="mx-4 mb-4 rounded-2xl bg-card p-4 animate-pulse">
        <div className="h-24 bg-muted rounded-xl" />
      </div>
    );
  }

  // Minimized view - very compact
  if (isMinimized) {
    return (
      <div className="mx-4 mb-4 rounded-2xl bg-gradient-to-br from-card via-card to-accent/10 px-4 py-3 shadow-sm border border-border/50">
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
    <div className="mx-4 mb-4 rounded-2xl bg-gradient-to-br from-card via-card to-accent/10 p-5 shadow-sm border border-border/50">
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
